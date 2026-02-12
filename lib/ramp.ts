import { clampGamut, converter, formatHex, parse } from "culori";

export type RampStep = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type Ramp = Record<RampStep, string>;

const toOklch = converter("oklch");
const toRgb = converter("rgb");

/**
Your exact method translated into code:

1) Conceptual gradient: 0% white, 50% base, 100% black
2) Sample 25% and 75% on that conceptual gradient
3) Delete the pure endpoints (white and black)
4) Redefine a refined gradient:
   0% = sample(25%), 50% = base, 100% = sample(75%)
5) Add stops: 13,25,38,63,75,88 on refined gradient
6) Sample at: 0,13,25,38,50,63,75,88,100 to produce 100..900
*/

function sampleWhiteBaseBlack(baseHex: string, t01: number) {
  const base = toOklch(parse(baseHex));
  if (!base) throw new Error("Invalid base hex");

  const white = toOklch(parse("#ffffff"))!;
  const black = toOklch(parse("#000000"))!;

  if (t01 <= 0.5) {
    const u = t01 / 0.5;
    return lerpOklch(white, base, u);
  }
  const u = (t01 - 0.5) / 0.5;
  return lerpOklch(base, black, u);
}

export function generateRamp9(
  baseHex: string,
  stopSet: "figma" | "even" = "figma"
): Ramp {
  const baseParsed = parse(baseHex);
  const base = baseParsed ? toOklch(baseParsed) : null;
  if (!base) throw new Error("Invalid hex color");

  // Step: get the lighter and darker usable endpoints from the initial gradient
  const lightEndpoint = sampleWhiteBaseBlack(baseHex, 0.25);
  const darkEndpoint = sampleWhiteBaseBlack(baseHex, 0.75);

  // Step: sample positions on refined gradient light -> base -> dark
  const positions =
    stopSet === "even"
      ? [0.0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0]
      : [0.0, 0.13, 0.25, 0.38, 0.5, 0.63, 0.75, 0.88, 1.0];

  const steps: RampStep[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];

  const out: Partial<Ramp> = {};
  for (let i = 0; i < steps.length; i++) {
    const t = positions[i];
    const c = sampleRefined(lightEndpoint, base, darkEndpoint, t);
    out[steps[i]] = toHexSafe(c);
  }

  // Guarantee base equals original input for 500
  out[500] = normalizeHex(baseHex);

  return out as Ramp;
}

function sampleRefined(light: any, base: any, dark: any, t01: number) {
  if (t01 <= 0.5) {
    const u = t01 / 0.5;
    return lerpOklch(light, base, u);
  }
  const u = (t01 - 0.5) / 0.5;
  return lerpOklch(base, dark, u);
}

function lerpOklch(a: any, b: any, t: number) {
  const ah = wrapHue(a.h ?? 0);
  const bh = wrapHue(b.h ?? 0);
  const dh = shortestHueDelta(ah, bh);

  const h = wrapHue(ah + dh * t);
  const l = (a.l ?? 0) + ((b.l ?? 0) - (a.l ?? 0)) * t;
  const c = (a.c ?? 0) + ((b.c ?? 0) - (a.c ?? 0)) * t;

  return { mode: "oklch", l, c, h };
}

function wrapHue(h: number) {
  let x = h % 360;
  if (x < 0) x += 360;
  return x;
}

function shortestHueDelta(a: number, b: number) {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function toHexSafe(oklchColor: any): string {
  const clamped = clampGamut(oklchColor);
  if (!clamped) throw new Error("Failed to clamp color to gamut");
  const rgb = toRgb(clamped as any);
  if (!rgb) throw new Error("Failed to convert to RGB");
  const hex = formatHex(rgb);
  if (typeof hex !== "string") throw new Error("Failed to format hex");
  return normalizeHex(hex);
}

export function normalizeHex(hex: string): string {
  const h = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(h)) {
    return (
      "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
    );
  }
  if (/^#[0-9a-f]{6}$/.test(h)) return h;
  const p = parse(h);
  if (!p) throw new Error("Invalid hex");
  const formatted = formatHex(p);
  if (typeof formatted !== "string") throw new Error("Invalid hex");
  return normalizeHex(formatted);
}

export function isValidHex(hex: string) {
  const h = hex.trim();
  return /^#[0-9a-fA-F]{6}$/.test(h) || /^#[0-9a-fA-F]{3}$/.test(h);
}
