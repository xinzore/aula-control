import { describe, expect, it } from "vitest";
import {
  decode,
  demoBlock,
  diff,
  encode,
  equalBytes,
  merge,
  validateChange,
} from "./protocol";

describe("configuration codec", () => {
  it("preserves every byte, including nonstandard booleans and unknown firmware fields", () => {
    let seed = 57;
    for (let n = 0; n < 200; n++) {
      const block = Uint8Array.from({ length: 128 }, () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed & 255;
      });
      expect(equalBytes(encode(decode(block), block), block)).toBe(true);
    }
  });
  it("changes only the selected stage DPI bytes", () => {
    const block = demoBlock();
    block[15] = 7;
    block[100] = 238;
    const next = decode(block);
    next.stages[0]!.x = next.stages[0]!.y = 450;
    const encoded = encode(next, block);
    expect(
      Array.from(encoded.keys()).filter((i) => encoded[i] !== block[i]),
    ).toEqual([16, 18]);
    expect(encoded[15]).toBe(7);
    expect(encoded[100]).toBe(238);
  });
  it("rejects malformed blocks", () => {
    expect(() => decode(new Uint8Array(127))).toThrow("INVALID_CONFIG");
  });
  it("merges edited fields onto current hardware state without reverting a DPI button press", () => {
    const original = decode(demoBlock());
    const edited = structuredClone(original);
    edited.stages[0]!.x = 450;
    const current = structuredClone(original);
    current.activeStage = 4;
    current.debounce = 8;
    const next = merge(current, diff(original, edited));
    expect(next.activeStage).toBe(4);
    expect(next.debounce).toBe(8);
    expect(next.stages[0]!.x).toBe(450);
    expect(current.stages[0]!.x).toBe(400);
  });
  it("preserves existing firmware values outside SDK ranges but rejects new invalid values", () => {
    const block = demoBlock();
    block[77] = 25;
    block[4] = 0;
    const old = decode(block);
    const next = structuredClone(old);
    next.stages[0]!.x = 450;
    expect(() => validateChange(old, next)).not.toThrow();
    next.stages[0]!.x = 451;
    expect(() => validateChange(old, next)).toThrow("0.x:451");
    next.stages[0]!.x = NaN;
    expect(() => validateChange(old, next)).toThrow();
  });
  it("rejects disabling the active stage or a prototype path", () => {
    const old = decode(demoBlock());
    const next = structuredClone(old);
    next.stages[next.activeStage]!.enabled = false;
    expect(() => validateChange(old, next)).toThrow();
    expect(() => merge(old, { "__proto__.polluted": true })).toThrow(
      "INVALID_CONFIG",
    );
  });
});
