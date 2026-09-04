/**
 * Status → color (brief §4.3).
 *
 * Color is a continuous interpolation on r = effectiveSets / target:
 * red at 0, yellow at 0.5, green at ≥ 1.0, clamped at 1.0, interpolated in
 * OKLCH so midpoints read as yellow rather than mud. Pure functions, no React.
 *
 * Color is never the only signal: every status also has an icon and text
 * (see src/strings.ts and the StatusBadge component).
 */

export type Oklch = { l: number; c: number; h: number };
export type Rgb = { r: number; g: number; b: number }; // 0..1, sRGB (gamma encoded)

/** Stops chosen to be clearly distinct for common color-vision deficiencies when paired with icons. */
export const STATUS_STOPS: readonly { at: number; color: Oklch }[] = [
  { at: 0.0, color: { l: 0.62, c: 0.22, h: 29 } }, // red
  { at: 0.5, color: { l: 0.86, c: 0.17, h: 96 } }, // yellow
  { at: 1.0, color: { l: 0.72, c: 0.19, h: 145 } }, // green
];

export const NEUTRAL_BODY_COLOR: Oklch = { l: 0.7, c: 0.0, h: 0 };

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Shortest-arc hue interpolation in degrees. */
function lerpHue(a: number, b: number, t: number): number {
  let d = ((b - a + 540) % 360) - 180;
  if (d < -180) d += 360;
  return (a + d * t + 360) % 360;
}

/** Ratio (effectiveSets / target) → OKLCH. Clamped to [0, 1]. */
export function ratioToOklch(ratio: number): Oklch {
  const r = clamp01(Number.isFinite(ratio) ? ratio : 0);
  for (let i = 0; i < STATUS_STOPS.length - 1; i++) {
    const a = STATUS_STOPS[i]!;
    const b = STATUS_STOPS[i + 1]!;
    if (r <= b.at) {
      const t = (r - a.at) / (b.at - a.at);
      return {
        l: lerp(a.color.l, b.color.l, t),
        c: lerp(a.color.c, b.color.c, t),
        h: lerpHue(a.color.h, b.color.h, t),
      };
    }
  }
  return { ...STATUS_STOPS[STATUS_STOPS.length - 1]!.color };
}

/** Provisional (estimated) data renders desaturated (§6.2); opacity is applied by the caller (~60%). */
export function desaturate(c: Oklch, amount = 0.6): Oklch {
  return { l: c.l, c: c.c * (1 - amount), h: c.h };
}

/** Under-emphasized regions render one step dimmer than their group (§4.3). */
export function dimOneStep(c: Oklch): Oklch {
  return { l: c.l * 0.82, c: c.c * 0.85, h: c.h };
}

// ---- OKLCH → sRGB (Björn Ottosson's OKLab reference conversion) ----

function oklchToOklab(c: Oklch): { L: number; a: number; b: number } {
  const hr = (c.h * Math.PI) / 180;
  return { L: c.l, a: c.c * Math.cos(hr), b: c.c * Math.sin(hr) };
}

function oklabToLinearSrgb(L: number, a: number, b: number): Rgb {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

function gammaEncode(x: number): number {
  const v = clamp01(x);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/**
 * OKLCH → gamma-encoded sRGB in [0, 1]. Out-of-gamut colors are brought in by
 * reducing chroma (keeps hue and lightness, which is what matters for status).
 */
export function oklchToSrgb(c: Oklch): Rgb {
  let chroma = c.c;
  for (let i = 0; i < 12; i++) {
    const { L, a, b } = oklchToOklab({ l: c.l, c: chroma, h: c.h });
    const lin = oklabToLinearSrgb(L, a, b);
    const inGamut = [lin.r, lin.g, lin.b].every((v) => v >= -0.0005 && v <= 1.0005);
    if (inGamut || chroma <= 0.0001) {
      return { r: gammaEncode(lin.r), g: gammaEncode(lin.g), b: gammaEncode(lin.b) };
    }
    chroma *= 0.8;
  }
  const { L, a, b } = oklchToOklab({ l: c.l, c: 0, h: c.h });
  const lin = oklabToLinearSrgb(L, a, b);
  return { r: gammaEncode(lin.r), g: gammaEncode(lin.g), b: gammaEncode(lin.b) };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Convenience: ratio → hex string, e.g. for the legend and the accessibility list. */
export function ratioToHex(ratio: number): string {
  return rgbToHex(oklchToSrgb(ratioToOklch(ratio)));
}
