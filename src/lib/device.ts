import {
  DeviceError,
  MODELS,
  PRODUCTS,
  decode,
  encode,
  equalBytes,
  merge,
  validateChange,
} from "./protocol";
import type { Changes, Settings } from "./protocol";

export type Snapshot = {
  model: string;
  configId: number;
  battery: number | null;
  wireless: boolean;
  block: Uint8Array;
  settings: Settings;
};
type Waiting = {
  cmd: number;
  size: number;
  offset: number;
  block: boolean;
  resolve: (data: Uint8Array) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};
export class Transport {
  private waiting?: Waiting;
  private queue: Promise<unknown> = Promise.resolve();
  private closed = false;
  readonly chunk: number;
  constructor(
    readonly device: HIDDevice,
    readonly wireless: boolean,
    private timeout = 2000,
  ) {
    this.chunk = wireless ? 24 : 56;
    device.addEventListener("inputreport", this.onReport);
  }
  private onReport = (event: HIDInputReportEvent) => {
    const w = this.waiting;
    if (!w || event.reportId !== 4) return;
    const b = new Uint8Array(
      event.data.buffer,
      event.data.byteOffset,
      event.data.byteLength,
    ).slice();
    if (b.length < 7 || b[2] !== w.cmd) return;
    if (
      w.block &&
      (b[3] !== w.size ||
        b[4] !== (w.offset & 255) ||
        b[5] !== w.offset >> 8 ||
        b.length < 7 + w.size)
    )
      return;
    if (
      !w.block &&
      b.length < (w.cmd === 0xb3 ? 9 : [0x1a, 0xaa].includes(w.cmd) ? 8 : 7)
    )
      return;
    clearTimeout(w.timer);
    this.waiting = undefined;
    w.resolve(b);
  };
  abort() {
    this.closed = true;
    this.device.removeEventListener("inputreport", this.onReport);
    if (this.waiting) {
      clearTimeout(this.waiting.timer);
      this.waiting.reject(new DeviceError("DISCONNECTED"));
      this.waiting = undefined;
    }
  }
  private serial<T>(job: () => Promise<T>): Promise<T> {
    const result = this.queue.then(() => {
      if (this.closed) throw new DeviceError("DISCONNECTED");
      return job();
    });
    this.queue = result.catch(() => undefined);
    return result;
  }
  private exchange(
    cmd: number,
    size = this.chunk,
    offset = 0,
    payload?: Uint8Array,
    block = false,
  ): Promise<Uint8Array> {
    if (this.closed) return Promise.reject(new DeviceError("DISCONNECTED"));
    const data = new Uint8Array(63);
    data.set([0, 0, cmd, size, offset & 255, offset >> 8, 0]);
    if (payload) data.set(payload, 7);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiting = undefined;
        reject(new DeviceError("TIMEOUT"));
      }, this.timeout);
      const waiting: Waiting = {
        cmd,
        size,
        offset,
        block,
        resolve,
        reject,
        timer,
      };
      this.waiting = waiting;
      void this.device.sendReport(4, data.buffer).catch((error) => {
        if (this.waiting !== waiting) return;
        clearTimeout(timer);
        this.waiting = undefined;
        reject(error);
      });
    });
  }
  command(cmd: number) {
    return this.serial(() => this.exchange(cmd));
  }
  private async transfer(cmd: number, length: number, payload?: Uint8Array) {
    await this.exchange(1);
    try {
      const result = new Uint8Array(length);
      for (let offset = 0; offset < length; offset += this.chunk) {
        const size = Math.min(this.chunk, length - offset);
        const reply = await this.exchange(
          cmd,
          size,
          offset,
          payload?.slice(offset, offset + size),
          true,
        );
        result.set(reply.slice(7, 7 + size), offset);
      }
      return result;
    } finally {
      if (!this.closed) await this.exchange(2);
    }
  }
  readBlock(cmd: number, length: number) {
    return this.serial(() => this.transfer(cmd, length));
  }
  writeConfig(block: Uint8Array) {
    if (block.length !== 128)
      return Promise.reject(new DeviceError("INVALID_CONFIG"));
    return this.serial(() => this.transfer(6, 128, block));
  }
}
export function supported(device: HIDDevice) {
  return (
    device.vendorId === 0x320f &&
    PRODUCTS.includes(device.productId) &&
    device.collections.some((c) => c.usagePage === 0xff1c && c.usage === 0x92)
  );
}
export const webHidAvailable = () =>
  typeof navigator !== "undefined" &&
  typeof navigator.hid?.requestDevice === "function" &&
  window.isSecureContext;
export async function chooseDevice(): Promise<HIDDevice | undefined> {
  if (!webHidAvailable()) throw new DeviceError("UNSUPPORTED_BROWSER");
  const devices = await navigator.hid.requestDevice({
    filters: PRODUCTS.map((productId) => ({
      vendorId: 0x320f,
      productId,
      usagePage: 0xff1c,
      usage: 0x92,
    })),
  });
  return devices.find(supported);
}
export class DeviceSession {
  readonly transport: Transport;
  readonly wireless: boolean;
  constructor(readonly device: HIDDevice) {
    if (!supported(device)) throw new DeviceError("UNSUPPORTED_DEVICE");
    this.wireless = [0x22a0, 0x22ba].includes(device.productId);
    this.transport = new Transport(device, this.wireless);
  }
  async read(): Promise<Snapshot> {
    if (this.wireless && !(await this.transport.command(0xaa))[7])
      throw new DeviceError("ASLEEP");
    const battery = (await this.transport.command(0x1a))[7]!;
    const info = await this.transport.readBlock(3, 10);
    const configId = info[7]!;
    if (!MODELS[configId]) throw new DeviceError("UNSUPPORTED_DEVICE");
    const block = await this.transport.readBlock(5, 128);
    return {
      model: `AULA ${MODELS[configId]}`,
      configId,
      battery: battery <= 100 ? battery : null,
      wireless: this.wireless,
      block,
      settings: decode(block),
    };
  }
  async apply(
    changes: Changes,
    beforeWrite: (block: Uint8Array) => void,
  ): Promise<Uint8Array> {
    const current = await this.transport.readBlock(5, 128);
    const settings = decode(current);
    const changed = merge(settings, changes);
    validateChange(settings, changed);
    const next = encode(changed, current);
    if (equalBytes(current, next)) return current;
    beforeWrite(current);
    const echo = await this.transport.writeConfig(next);
    if (!equalBytes(echo, next)) throw new DeviceError("WRITE_MISMATCH");
    const verified = await this.transport.readBlock(5, 128);
    if (!equalBytes(verified, next)) throw new DeviceError("WRITE_MISMATCH");
    return verified;
  }
  async close() {
    this.transport.abort();
    if (this.device.opened) await this.device.close().catch(() => undefined);
  }
}
