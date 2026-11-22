// The furniture to buy or find (task 7.4, docs/game/the-home.md §7), painted in the house's
// style: ink outlines, warm wood, the lantern's light from the upper left. Each floor piece is
// built from boxes in the room's own perspective (projection.ts), standing on the cells of its
// `anchor`, left of the middle so its right side shows; moved elsewhere, paintHome carries it
// there and mirrors it across the middle. Wall pieces are painted centered on x 960.
import { f, INK, OUT, poly, type Pt } from '../city/paintKit.ts';
import { depthAt, floorPoint } from './projection.ts';

/** A point `h` px above the floor at a (fractional) column and row, on the stage. */
export function above(col: number, row: number, h: number): Pt {
  const [x, y] = floorPoint(col, row);
  return [x, y - h * depthAt(row)];
}

/**
 * A box on the floor, seen from the room's eye (left of the middle, so its right side shows):
 * from column c to c + w, row r to r + d, height h0 to h1. Faces back to front.
 */
export function box(
  c: number,
  r: number,
  w: number,
  d: number,
  h0: number,
  h1: number,
  fill: { top: string; front: string; side: string },
  ink = 2.5,
): string {
  const p = (dc: number, dr: number, h: number) => above(c + dc, r + dr, h);
  const out: string[] = [];
  // The right side, while the box is left of the middle of the room.
  if (floorPoint(c + w, r)[0] < 960)
    out.push(
      `<path d="${poly([p(w, 0, h1), p(w, d, h1), p(w, d, h0), p(w, 0, h0)])}" fill="${fill.side}" ${OUT(ink)}/>`,
    );
  // The top, while it is below the eye.
  if (p(0, 0, h1)[1] < p(0, d, h1)[1])
    out.push(
      `<path d="${poly([p(0, 0, h1), p(w, 0, h1), p(w, d, h1), p(0, d, h1)])}" fill="${fill.top}" ${OUT(ink)}/>`,
    );
  out.push(
    `<path d="${poly([p(0, d, h1), p(w, d, h1), p(w, d, h0), p(0, d, h0)])}" fill="${fill.front}" ${OUT(ink)}/>`,
  );
  return out.join('');
}

const WOOD = { top: '#9A6238', front: '#7A4A2A', side: '#5E3820' };
const DARK = { top: '#7A4A2A', front: '#5E3820', side: '#4B2D1A' };

/** Four legs under a top from (c, r) to (c + w, r + d), `h` high, `t` thick. */
function legs(c: number, r: number, w: number, d: number, h: number, t = 0.1): string {
  const out: string[] = [];
  // Back legs first, so the front ones cover them.
  for (const [dc, dr] of [
    [0.04, 0.04],
    [w - 0.04 - t, 0.04],
    [0.04, d - 0.04 - t],
    [w - 0.04 - t, d - 0.04 - t],
  ] as const)
    out.push(box(c + dc, r + dr, t, t, 0, h, DARK, 2));
  return out.join('');
}

// --- The pieces -----------------------------------------------------------------------------

export function chair(): string {
  const [c, r] = [3, 3];
  return (
    legs(c + 0.15, r + 0.15, 0.7, 0.7, 100) +
    box(c + 0.15, r + 0.1, 0.7, 0.1, 100, 250, WOOD) +
    box(c + 0.12, r + 0.12, 0.76, 0.76, 100, 118, WOOD) +
    `<path d="${poly([above(c + 0.25, r + 0.11, 220), above(c + 0.75, r + 0.11, 220), above(c + 0.75, r + 0.11, 150), above(c + 0.25, r + 0.11, 150)])}" fill="#A83A3E" opacity=".85"/>`
  );
}

export function bench(): string {
  const [c, r] = [2, 3];
  return (
    box(c + 0.15, r + 0.3, 0.12, 0.45, 0, 62, DARK, 2) +
    box(c + 2.73, r + 0.3, 0.12, 0.45, 0, 62, DARK, 2) +
    box(c + 0.15, r + 0.45, 2.7, 0.1, 22, 34, DARK, 2) +
    box(c, r + 0.25, 3, 0.55, 62, 76, WOOD)
  );
}

export function table(): string {
  const [c, r] = [3, 2];
  const top = above(c + 1, r + 1, 185);
  return (
    legs(c + 0.1, r + 0.1, 1.8, 1.8, 165, 0.14) +
    box(c + 0.05, r + 0.05, 1.9, 1.9, 165, 185, WOOD) +
    // A bowl of fruit.
    `<ellipse cx="${f(top[0])}" cy="${f(top[1] - 10)}" rx="48" ry="16" fill="#3F7F8C" ${OUT(2.5)}/>` +
    `<circle cx="${f(top[0] - 18)}" cy="${f(top[1] - 24)}" r="14" fill="#E0855A" ${OUT(2)}/>` +
    `<circle cx="${f(top[0] + 8)}" cy="${f(top[1] - 28)}" r="15" fill="#C9A23A" ${OUT(2)}/>` +
    `<circle cx="${f(top[0] + 26)}" cy="${f(top[1] - 20)}" r="12" fill="#A83A3E" ${OUT(2)}/>`
  );
}

export function plant(): string {
  const [c, r] = [3, 3];
  const base = above(c + 0.5, r + 0.8, 90);
  const [x, y] = base;
  const leaf = (dx: number, dy: number, rot: number, s = 1) =>
    `<ellipse cx="${f(x + dx)}" cy="${f(y + dy)}" rx="${f(18 * s)}" ry="${f(46 * s)}" transform="rotate(${rot} ${f(x + dx)} ${f(y + dy)})" fill="#4E8A4A" ${OUT(2)}/>`;
  return (
    leaf(-38, -40, -40) +
    leaf(38, -42, 40) +
    leaf(-18, -66, -15, 1.1) +
    leaf(20, -64, 18, 1.1) +
    leaf(0, -80, 0, 1.15) +
    pot(c + 0.5, r + 0.5)
  );
}

/** A clay pot, wider at the rim, standing on the middle of a cell. */
function pot(col: number, row: number): string {
  const [bx, by] = above(col, row + 0.3, 0);
  const [tx, ty] = above(col, row + 0.3, 80);
  return (
    `<path d="M${f(bx - 26)} ${f(by)} L${f(bx + 26)} ${f(by)} L${f(tx + 36)} ${f(ty)} L${f(tx - 36)} ${f(ty)} Z" fill="#B5603A" ${OUT()}/>` +
    `<rect x="${f(tx - 42)}" y="${f(ty - 14)}" width="84" height="18" rx="4" fill="#C97A4A" ${OUT(2.5)}/>`
  );
}

export function bookcase(): string {
  const [c, r] = [3, 0];
  const out = [box(c, r, 2, 0.8, 0, 330, WOOD)];
  // Shelves and books on the front.
  const fl = (u: number, h: number) => above(c + u, r + 0.8, h);
  const colors = ['#3F7F8C', '#A83A3E', '#C9A23A', '#5B3F7A', '#E0B05A', '#265965'];
  for (const [i, h] of [20, 125, 230].entries()) {
    out.push(
      `<path d="${poly([fl(0.08, h + 92), fl(1.92, h + 92), fl(1.92, h), fl(0.08, h)])}" fill="#3E2516"/>`,
    );
    let u = 0.12;
    let k = i;
    while (u < 1.8) {
      const wdt = 0.09 + ((k * 7) % 4) * 0.025;
      const ht = 62 + ((k * 5) % 3) * 10;
      out.push(
        `<path d="${poly([fl(u, h + ht), fl(u + wdt, h + ht), fl(u + wdt, h), fl(u, h)])}" fill="${colors[k % colors.length]}" ${OUT(1.5)}/>`,
      );
      u += wdt + 0.012;
      k++;
      if (k % 9 === 4) u += 0.18;
    }
  }
  return out.join('');
}

export function cushion(): string {
  const [c, r] = [3, 3];
  const [x, y] = above(c + 0.5, r + 0.55, 0);
  return (
    `<path d="M${f(x - 62)} ${f(y - 4)} Q${f(x - 70)} ${f(y - 40)} ${f(x - 40)} ${f(y - 44)} L${f(x + 40)} ${f(y - 44)} Q${f(x + 70)} ${f(y - 40)} ${f(x + 62)} ${f(y - 4)} Q${f(x)} ${f(y + 10)} ${f(x - 62)} ${f(y - 4)} Z" fill="#A83A3E" ${OUT()}/>` +
    `<path d="M${f(x - 46)} ${f(y - 26)} Q${f(x)} ${f(y - 16)} ${f(x + 46)} ${f(y - 26)}" stroke="#E0B05A" stroke-width="3" fill="none" stroke-dasharray="7 6"/>` +
    `<circle cx="${f(x)}" cy="${f(y - 24)}" r="5" fill="#E0B05A" ${OUT(1.5)}/>`
  );
}

export function clock(): string {
  const [x, y] = [960, 360];
  return (
    `<circle cx="${x}" cy="${y}" r="40" fill="#7A4A2A" ${OUT()}/>` +
    `<circle cx="${x}" cy="${y}" r="31" fill="#F3E3C0" ${OUT(2)}/>` +
    [0, 90, 180, 270]
      .map((a) => {
        const s = Math.sin((a * Math.PI) / 180);
        const k = Math.cos((a * Math.PI) / 180);
        return `<path d="M${f(x + 24 * s)} ${f(y - 24 * k)} L${f(x + 29 * s)} ${f(y - 29 * k)}" stroke="${INK}" stroke-width="3"/>`;
      })
      .join('') +
    `<path d="M${x} ${y} L${x} ${y - 20} M${x} ${y} L${x + 13} ${y + 7}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>` +
    `<circle cx="${x}" cy="${y}" r="3.5" fill="${INK}"/>`
  );
}

export function desertPicture(): string {
  // A second picture: the desert at night, a crescent over the dunes.
  const [x, y] = [960, 350];
  return (
    `<rect x="${x - 56}" y="${y - 44}" width="112" height="88" rx="4" fill="#5E3820" ${OUT()}/>` +
    `<rect x="${x - 45}" y="${y - 33}" width="90" height="66" fill="#1F2456"/>` +
    `<path d="M${x - 45} ${y + 33} L${x - 45} ${y + 12} Q${x - 20} ${y - 4} ${x + 2} ${y + 12} Q${x + 24} ${y - 2} ${x + 45} ${y + 8} L${x + 45} ${y + 33} Z" fill="#E0B05A"/>` +
    `<path d="M${x + 20} ${y - 22} a12 12 0 1 0 8 20 a10 10 0 1 1 -8 -20 Z" fill="#FFF3C8"/>`
  );
}

/** The furniture's paintings, where each floor piece was painted standing, and its footprint. */
export const FURNITURE = {
  'home-chair': { paint: chair, origin: floorPoint(3.5, 4), size: [1, 1] },
  'home-bench': { paint: bench, origin: floorPoint(3.5, 4), size: [3, 1] },
  'home-table': { paint: table, origin: floorPoint(4, 4), size: [2, 2] },
  'home-plant': { paint: plant, origin: floorPoint(3.5, 4), size: [1, 1] },
  'home-bookcase': { paint: bookcase, origin: floorPoint(4, 1), size: [2, 1] },
  'home-cushion': { paint: cushion, origin: floorPoint(3.5, 4), size: [1, 1] },
  'home-clock': { paint: clock, wallX: 960, size: [1, 1] },
  'home-desert': { paint: desertPicture, wallX: 960, size: [1, 1] },
} as const;
