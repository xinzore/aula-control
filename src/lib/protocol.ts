/* Evision protocol, ported from Aulaar (GPL-2.0-or-later), Copyright 2026 Davlatbek.
 * Original: https://github.com/shDavlatbek/aulaar — docs/PROTOCOL.md
 * Web adaptation: AULA Control contributors. See LICENSE and NOTICE. */
export const RATES = [125, 250, 500, 1000, 2000, 4000, 8000] as const;
export const SLEEP = [180, 240, 300, 600, 900, 1200] as const;
export const DEBOUNCE = [1, 2, 4, 6, 8, 10] as const;
export const PRODUCTS = [0x22a0, 0x22ba, 0x22b6, 0x22b7, 0x22b8];
export const MODELS = [
  "X9 Pro",
  "X9",
  "X9 Ultra",
  "V9+",
  "V9 Pro+",
  "V9 Ultra+",
  "V9",
  "V9 Pro",
  "V9 Ultra",
  "V9 Max+",
  "V9 Max",
  "X9 Max",
];
export type RGB = [number, number, number];
export type Stage = {
  enabled: boolean;
  separate: boolean;
  x: number;
  y: number;
  color: RGB;
};
export type Settings = {
  profile: number;
  lighting: {
    mode: number;
    brightness: number;
    speed: number;
    direction: number;
    colorful: boolean;
    color: RGB;
  };
  pollingWireless: number;
  pollingWired: number;
  activeStage: number;
  lod: number;
  stages: Stage[];
  sleep: number;
  debounce: number;
  motionSync: boolean;
  angleSnap: boolean;
  rotation: number;
  dpiLighting: { mode: number; brightness: number; speed: number };
};
export type Changes = Record<string, number | boolean>;

export class DeviceError extends Error {
  constructor(
    public code: string,
    detail = "",
  ) {
    super(detail || code);
    this.name = "DeviceError";
  }
}
const u16 = (b: Uint8Array, o: number) => b[o]! | (b[o + 1]! << 8);
export function decode(b: Uint8Array): Settings {
  if (b.length !== 128) throw new DeviceError("INVALID_CONFIG");
  return {
    profile: b[0]!,
    lighting: {
      mode: b[1]!,
      brightness: b[2]!,
      speed: b[3]!,
      direction: b[4]!,
      colorful: !!b[5],
      color: [b[6]!, b[7]!, b[8]!],
    },
    pollingWireless: b[10]!,
    pollingWired: b[11]!,
    activeStage: b[12]!,
    lod: b[13]!,
    stages: Array.from({ length: 6 }, (_, i) => {
      const o = 14 + 9 * i;
      return {
        enabled: !!b[o],
        separate: !!b[o + 1],
        x: u16(b, o + 2),
        y: u16(b, o + 4),
        color: [b[o + 6]!, b[o + 7]!, b[o + 8]!],
      };
    }),
    sleep: u16(b, 68),
    debounce: b[70]!,
    motionSync: !!b[71],
    angleSnap: !!b[72],
    rotation: b[74]! > 127 ? b[74]! - 256 : b[74]!,
    dpiLighting: { mode: b[76]!, brightness: b[77]!, speed: b[78]! },
  };
}
export function encode(s: Settings, base: Uint8Array): Uint8Array {
  if (base.length !== 128) throw new DeviceError("INVALID_CONFIG");
  const b = base.slice();
  const put16 = (o: number, v: number) => {
    b[o] = v & 255;
    b[o + 1] = (v >> 8) & 255;
  };
  const flag = (o: number, v: boolean) => {
    if (!!b[o] !== v) b[o] = Number(v);
  };
  b[0] = s.profile;
  b[1] = s.lighting.mode;
  b[2] = s.lighting.brightness;
  b[3] = s.lighting.speed;
  b[4] = s.lighting.direction;
  flag(5, s.lighting.colorful);
  b.set(s.lighting.color, 6);
  b[10] = s.pollingWireless;
  b[11] = s.pollingWired;
  b[12] = s.activeStage;
  b[13] = s.lod;
  s.stages.forEach((st, i) => {
    const o = 14 + 9 * i;
    flag(o, st.enabled);
    flag(o + 1, st.separate);
    put16(o + 2, st.x);
    put16(o + 4, st.y);
    b.set(st.color, o + 6);
  });
  put16(68, s.sleep);
  b[70] = s.debounce;
  flag(71, s.motionSync);
  flag(72, s.angleSnap);
  b[74] = s.rotation & 255;
  b[76] = s.dpiLighting.mode;
  b[77] = s.dpiLighting.brightness;
  b[78] = s.dpiLighting.speed;
  return b;
}
export function diff(before: Settings, after: Settings): Changes {
  const result: Changes = {};
  function walk(a: unknown, b: unknown, path: string) {
    if (
      typeof a === "object" &&
      a !== null &&
      typeof b === "object" &&
      b !== null
    ) {
      for (const key of Object.keys(a))
        walk(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
          path ? `${path}.${key}` : key,
        );
    } else if (a !== b && (typeof b === "number" || typeof b === "boolean"))
      result[path] = b;
  }
  walk(before, after, "");
  return result;
}
export function merge(settings: Settings, changes: Changes): Settings {
  const result = structuredClone(settings);
  for (const [path, value] of Object.entries(changes)) {
    const keys = path.split(".");
    let target: Record<string, unknown> = result as unknown as Record<
      string,
      unknown
    >;
    for (const key of keys.slice(0, -1)) {
      if (
        !Object.hasOwn(target, key) ||
        typeof target[key] !== "object" ||
        target[key] === null
      )
        throw new DeviceError("INVALID_CONFIG");
      target = target[key] as Record<string, unknown>;
    }
    const key = keys.at(-1)!;
    if (!Object.hasOwn(target, key) || typeof target[key] !== typeof value)
      throw new DeviceError("INVALID_CONFIG");
    target[key] = value;
  }
  return result;
}
export function problems(s: Settings): string[] {
  const errors: string[] = [];
  const check = (valid: boolean, field: string, value: number) => {
    if (!valid) errors.push(`${field}:${value}`);
  };
  const int = (v: number, min: number, max: number) =>
    Number.isInteger(v) && v >= min && v <= max;
  check(int(s.activeStage, 0, 5), "stage", s.activeStage);
  check(int(s.pollingWireless, 0, 6), "wireless", s.pollingWireless);
  check(int(s.pollingWired, 0, 6), "wired", s.pollingWired);
  check(int(s.lod, 0, 1), "lod", s.lod);
  check(int(s.rotation, -30, 30), "rotation", s.rotation);
  check((SLEEP as readonly number[]).includes(s.sleep), "sleep", s.sleep);
  check(
    (DEBOUNCE as readonly number[]).includes(s.debounce),
    "debounce",
    s.debounce,
  );
  check(s.stages.length === 6, "stages", s.stages.length);
  s.stages.forEach((st, i) => {
    for (const axis of ["x", "y"] as const)
      check(
        int(st[axis], 100, 42000) && st[axis] % 50 === 0,
        `${i}.${axis}`,
        st[axis],
      );
    st.color.forEach((v, c) => check(int(v, 0, 255), `${i}.color.${c}`, v));
  });
  check(
    s.stages.some((st) => st.enabled),
    "enabled",
    0,
  );
  check(!!s.stages[s.activeStage]?.enabled, "activeEnabled", s.activeStage);
  check(int(s.lighting.mode, 0, 5), "lightMode", s.lighting.mode);
  check(
    int(s.lighting.brightness, 0, 4),
    "lightBrightness",
    s.lighting.brightness,
  );
  check(int(s.lighting.speed, 0, 4), "lightSpeed", s.lighting.speed);
  check(
    int(s.lighting.direction, 1, 2),
    "lightDirection",
    s.lighting.direction,
  );
  s.lighting.color.forEach((v, c) =>
    check(int(v, 0, 255), `lightColor.${c}`, v),
  );
  check(int(s.dpiLighting.mode, 0, 2), "dpiLight", s.dpiLighting.mode);
  check(
    int(s.dpiLighting.brightness, 0, 2),
    "dpiBrightness",
    s.dpiLighting.brightness,
  );
  check(int(s.dpiLighting.speed, 0, 2), "dpiSpeed", s.dpiLighting.speed);
  return errors;
}
export function validateChange(before: Settings, after: Settings) {
  const known = new Set(problems(before));
  const introduced = problems(after).filter((p) => !known.has(p));
  if (introduced.length)
    throw new DeviceError("INVALID_VALUE", introduced.join(", "));
}
export function demoBlock(): Uint8Array {
  const s = decode(new Uint8Array(128));
  s.lighting = {
    mode: 0,
    brightness: 3,
    speed: 2,
    direction: 1,
    colorful: false,
    color: [196, 236, 114],
  };
  s.pollingWireless = s.pollingWired = 4;
  s.activeStage = 2;
  s.sleep = 300;
  s.debounce = 4;
  const colors: RGB[] = [
    [232, 102, 102],
    [231, 177, 73],
    [151, 190, 84],
    [96, 161, 209],
    [156, 125, 209],
    [205, 119, 165],
  ];
  s.stages = [400, 800, 1600, 3200, 6400, 26000].map((v, i) => ({
    enabled: true,
    separate: false,
    x: v,
    y: v,
    color: colors[i]!,
  }));
  return encode(s, new Uint8Array(128));
}
export const equalBytes = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((v, i) => v === b[i]);
export const colorHex = (rgb: RGB) =>
  "#" + rgb.map((c) => c.toString(16).padStart(2, "0")).join("");
export const hexColor = (hex: string): RGB =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
