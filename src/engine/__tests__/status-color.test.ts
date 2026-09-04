import { desaturate, dimOneStep, oklchToSrgb, ratioToHex, ratioToOklch, rgbToHex } from '../status-color';

function channels(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

describe('ratioToOklch', () => {
  it('is red at 0, yellow at 0.5, green at 1', () => {
    expect(Math.round(ratioToOklch(0).h)).toBe(29);
    expect(Math.round(ratioToOklch(0.5).h)).toBe(96);
    expect(Math.round(ratioToOklch(1).h)).toBe(145);
  });

  it('clamps above 1 and below 0 and tolerates NaN', () => {
    expect(ratioToOklch(1.7)).toEqual(ratioToOklch(1));
    expect(ratioToOklch(-3)).toEqual(ratioToOklch(0));
    expect(ratioToOklch(Number.NaN)).toEqual(ratioToOklch(0));
  });

  it('hue increases monotonically from red through yellow to green', () => {
    let prev = -1;
    for (let r = 0; r <= 1.0001; r += 0.05) {
      const h = ratioToOklch(r).h;
      expect(h).toBeGreaterThanOrEqual(prev);
      prev = h;
    }
  });
});

describe('oklchToSrgb / hex', () => {
  it('produces a red-dominant, green-dominant and yellow-ish hex at the stops', () => {
    const [r0, g0] = channels(ratioToHex(0));
    const [r1, g1] = channels(ratioToHex(1));
    const [ry, gy, by] = channels(ratioToHex(0.5));
    expect(r0).toBeGreaterThan(g0! + 60);
    expect(g1).toBeGreaterThan(r1! + 40);
    expect(ry).toBeGreaterThan(150);
    expect(gy).toBeGreaterThan(150);
    expect(by).toBeLessThan(gy!);
  });

  it('never leaves the 0..1 range even for out-of-gamut chroma', () => {
    const rgb = oklchToSrgb({ l: 0.9, c: 0.4, h: 145 });
    for (const v of [rgb.r, rgb.g, rgb.b]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(rgbToHex(rgb)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('desaturate lowers chroma only; dimOneStep lowers lightness', () => {
    const c = ratioToOklch(0.8);
    expect(desaturate(c).c).toBeLessThan(c.c);
    expect(desaturate(c).l).toBe(c.l);
    expect(dimOneStep(c).l).toBeLessThan(c.l);
  });
});
