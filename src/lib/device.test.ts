import { describe, expect, it } from "vitest";
import { DeviceSession, Transport, supported } from "./device";
import { decode, demoBlock, diff } from "./protocol";

class FakeHid {
  vendorId = 0x320f;
  productId = 0x22a0;
  productName = "AULA-8K Dongle";
  opened = true;
  collections = [{ usagePage: 0xff1c, usage: 0x92 }];
  block = demoBlock();
  packets: Uint8Array[] = [];
  listeners = new Set<(event: HIDInputReportEvent) => void>();
  silent = false;
  noisy = false;
  badEcho = false;
  addEventListener(
    _type: string,
    listener: (event: HIDInputReportEvent) => void,
  ) {
    this.listeners.add(listener);
  }
  removeEventListener(
    _type: string,
    listener: (event: HIDInputReportEvent) => void,
  ) {
    this.listeners.delete(listener);
  }
  async open() {
    this.opened = true;
  }
  async close() {
    this.opened = false;
  }
  emit(b: Uint8Array) {
    const event = {
      reportId: 4,
      data: new DataView(b.buffer as ArrayBuffer, b.byteOffset, b.length),
    } as HIDInputReportEvent;
    this.listeners.forEach((fn) => fn(event));
  }
  async sendReport(reportId: number, buffer: ArrayBuffer) {
    expect(reportId).toBe(4);
    const p = new Uint8Array(buffer);
    expect(p.length).toBe(63);
    this.packets.push(p.slice());
    if (this.silent) return;
    const cmd = p[2]!;
    const size = p[3]!;
    const offset = p[4]! | (p[5]! << 8);
    const reply = new Uint8Array(63);
    reply.set(p.slice(0, 7));
    if (cmd === 0xaa) reply[7] = 255;
    if (cmd === 0x1a) reply[7] = 0; // an empty battery is a real reading
    if (cmd === 3) {
      const info = new Uint8Array(22);
      info[7] = 5;
      reply.set(info.slice(offset, offset + size), 7);
    }
    if (cmd === 5) reply.set(this.block.slice(offset, offset + size), 7);
    if (cmd === 6) {
      this.block.set(p.slice(7, 7 + size), offset);
      reply.set(p.slice(7, 7 + size), 7);
      if (this.badEcho) reply[7] ^= 1;
    }
    if (this.noisy && cmd !== 0xaa) {
      const event = new Uint8Array(63);
      event.set([0xaa, 0, 0xaa, 0, 0, 0, 0, 255]);
      this.emit(event);
      if (cmd === 5) {
        const wrong = reply.slice();
        wrong[4] ^= 1;
        wrong.fill(255, 7);
        this.emit(wrong);
        this.emit(reply.slice(0, 10));
      }
    }
    this.emit(reply);
  }
  asDevice() {
    return this as unknown as HIDDevice;
  }
}
describe("WebHID transport", () => {
  it.each([
    [true, [24, 24, 24, 24, 24, 8]],
    [false, [56, 56, 16]],
  ] as const)("chunks the %s link correctly", async (wireless, sizes) => {
    const fake = new FakeHid();
    const transport = new Transport(fake.asDevice(), wireless);
    expect(await transport.readBlock(5, 128)).toEqual(fake.block);
    expect(fake.packets.filter((p) => p[2] === 5).map((p) => p[3])).toEqual(
      sizes,
    );
    expect(fake.packets.at(-1)![2]).toBe(2);
    transport.abort();
  });
  it("ignores unsolicited receiver events, mismatched offsets and truncated replies", async () => {
    const fake = new FakeHid();
    fake.noisy = true;
    const transport = new Transport(fake.asDevice(), true);
    expect(await transport.readBlock(5, 128)).toEqual(fake.block);
    expect((await transport.command(0x1a))[7]).toBe(0);
    transport.abort();
  });
  it("serializes concurrent block transactions", async () => {
    const fake = new FakeHid();
    const transport = new Transport(fake.asDevice(), true);
    await Promise.all([
      transport.readBlock(3, 10),
      transport.readBlock(5, 128),
    ]);
    const commands = fake.packets.map((p) => p[2]);
    expect(commands.slice(0, 3)).toEqual([1, 3, 2]);
    expect(commands[3]).toBe(1);
    transport.abort();
  });
  it("times out and aborts pending requests on disconnect", async () => {
    const fake = new FakeHid();
    fake.silent = true;
    const transport = new Transport(fake.asDevice(), true, 5);
    await expect(transport.command(0x1a)).rejects.toMatchObject({
      code: "TIMEOUT",
    });
    const pending = transport.command(0x1a);
    await Promise.resolve();
    transport.abort();
    await expect(pending).rejects.toMatchObject({ code: "DISCONNECTED" });
  });
  it("selects the configuration interface and excludes firmware interfaces", () => {
    const fake = new FakeHid();
    expect(supported(fake.asDevice())).toBe(true);
    fake.collections[0] = { usagePage: 0xff0b, usage: 0x0104 };
    expect(supported(fake.asDevice())).toBe(false);
  });
  it("backs up the current block before writing and verifies the real readback", async () => {
    const fake = new FakeHid();
    fake.block[100] = 239;
    const original = fake.block.slice();
    const session = new DeviceSession(fake.asDevice());
    const snapshot = await session.read();
    expect(snapshot.battery).toBe(0);
    expect(snapshot.model).toBe("AULA V9 Ultra+");
    const next = structuredClone(snapshot.settings);
    next.stages[0]!.x = 450;
    let backup: Uint8Array | undefined;
    const verified = await session.apply(
      diff(snapshot.settings, next),
      (block) => {
        expect(fake.packets.some((p) => p[2] === 6)).toBe(false);
        backup = block.slice();
      },
    );
    expect(backup).toEqual(original);
    expect(decode(verified).stages[0]!.x).toBe(450);
    expect(verified[100]).toBe(239);
    await session.close();
  });
  it("does not write invalid values and rejects a corrupt write echo", async () => {
    const fake = new FakeHid();
    const session = new DeviceSession(fake.asDevice());
    await expect(
      session.apply({ "stages.0.x": 451 }, () => undefined),
    ).rejects.toMatchObject({ code: "INVALID_VALUE" });
    expect(fake.packets.some((p) => p[2] === 6)).toBe(false);
    fake.badEcho = true;
    await expect(
      session.apply({ "stages.0.x": 450 }, () => undefined),
    ).rejects.toMatchObject({ code: "WRITE_MISMATCH" });
    await session.close();
  });
});
