// The few drawing helpers the room painters share (Your House, the Market): ink outlines and
// paths from points, rounded to a tenth of a pixel so the markup stays short and deterministic.

export type Pt = readonly [number, number];

export const INK = '#2A170C';
export const f = (n: number) => Math.round(n * 10) / 10;
export const OUT = (w = 3) =>
  `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
export const poly = (pts: readonly Pt[]) =>
  'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + ' Z';
export const line = (pts: readonly Pt[]) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L');

/**
 * A tabletop seen from a seated player (roadmap A6): its back edge runs from `back[0]` to
 * `back[1]` at height `back[2]`, its front edge (usually below the picture) from `front[0]` to
 * `front[1]` at `front[2]`. `at(u, v)` is the point `u` across (0 left, 1 right) and `v` toward
 * the player (0 back, 1 front); `scale(v)` is how big a thing standing there is drawn.
 */
export function tabletop(
  back: readonly [number, number, number],
  front: readonly [number, number, number],
  scales: readonly [number, number] = [0.7, 1.3],
) {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const at = (u: number, v: number): Pt => {
    const x0 = lerp(back[0], front[0], v);
    const x1 = lerp(back[1], front[1], v);
    return [lerp(x0, x1, u), lerp(back[2], front[2], v)];
  };
  return { at, scale: (v: number) => lerp(scales[0], scales[1], v) };
}
