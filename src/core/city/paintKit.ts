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
