// The Arena (task 3.4): inside the amphitheater seen far off from the square, at the last of the
// light. Raked sand, stone tiers curving round, banners on the rim and two braziers at the front.
// Painted in the browser, deterministic, at 1920×1080, in the city's style (ADR 0006, ADR 0025).
// It sits behind the challenges as a still image (HallBackdrop), so nothing in it is a button.
// The sky is warm, never blue (Adam, v2.0).

import { f, OUT, poly, type Pt } from './paintKit.ts';

export const ARENA_STAGE = { width: 1920, height: 1080 } as const;

/** The arena's floor: an ellipse seen from the front tier. */
const CX = 960;
const FLOOR_Y = 830;
const FLOOR_RX = 1000;
const FLOOR_RY = 250;

/**
 * Tier `i`'s front edge: the upper half of an ellipse whose top (the far side) is at `mid(i)`.
 * Tier 0 is the wall round the floor; tier `RIM` is the rim wall's foot.
 */
const TIERS = 7;
const RIM = TIERS;
const mid = (i: number) => 560 - i * 46;
const ry = (i: number) => 150 + i * 22;
const rx = (i: number) => 1060 + i * 130;
const edge = (i: number) => arc(mid(i) + ry(i), rx(i), ry(i));

/** Banner colors: the guilds' own, and the city's saffron and plum. */
const BANNERS = ['#B5432F', '#E0A33A', '#3F7A4A', '#6A3F6E', '#C98A2A', '#8E2E35'];

function defs(): string {
  return `<defs>
<linearGradient id="ar-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B1D26"/><stop offset=".45" stop-color="#8E3E36"/><stop offset=".8" stop-color="#E08A4A"/><stop offset="1" stop-color="#F6C27A"/></linearGradient>
<linearGradient id="ar-sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9AE6E"/><stop offset="1" stop-color="#B88648"/></linearGradient>
<linearGradient id="ar-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C79B72"/><stop offset="1" stop-color="#9A7050"/></linearGradient>
<linearGradient id="ar-riser" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A5238"/><stop offset="1" stop-color="#5E3D2A"/></linearGradient>
<radialGradient id="ar-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(960 640) scale(1100 420)"><stop offset="0" stop-color="#FFE2A0" stop-opacity=".3"/><stop offset="1" stop-color="#FFB34D" stop-opacity="0"/></radialGradient>
<radialGradient id="ar-fire" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFE7A0" stop-opacity=".75"/><stop offset=".45" stop-color="#FFA640" stop-opacity=".3"/><stop offset="1" stop-color="#FF8A30" stop-opacity="0"/></radialGradient>
</defs>`;
}

/** The upper half of an ellipse, as points from left to right. */
function arc(cy: number, rx: number, ry: number, steps = 48): Pt[] {
  const pts: Pt[] = [];
  for (let s = 0; s <= steps; s++) {
    const a = Math.PI + (Math.PI * s) / steps;
    pts.push([CX + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}

function sky(): string {
  const out = [`<rect width="1920" height="1080" fill="url(#ar-sky)"/>`];
  // A low sun behind the far rim, and two long clouds lit from below.
  out.push(`<circle cx="1330" cy="250" r="70" fill="#FFD98A" opacity=".85"/>`);
  out.push(`<circle cx="1330" cy="250" r="130" fill="#FFC56A" opacity=".18"/>`);
  for (const [x, y, w] of [
    [380, 150, 420],
    [1120, 110, 360],
  ] as const) {
    out.push(
      `<path d="M${x} ${y} q${f(w * 0.2)} -34 ${f(w * 0.45)} -8 q${f(w * 0.25)} -26 ${f(w * 0.55)} 8 z" fill="#F4A66A" opacity=".45"/>`,
    );
  }
  // Behind the stands, where the floor's ellipse leaves the corners: the arena's own stone.
  out.push(`<rect y="560" width="1920" height="520" fill="#7A5238"/>`);
  return out.join('');
}

function tiers(): string {
  const out: string[] = [];
  // From the rim down, so each nearer tier is drawn over the one behind it.
  for (let i = RIM; i >= 1; i--) {
    const top = edge(i);
    const bottom = edge(i - 1).reverse();
    out.push(`<path d="${poly([...top, ...bottom])}" fill="url(#ar-stone)" ${OUT(2.6)}/>`);
    // The riser: the shaded face below the seat's front edge.
    const riserTop = arc(mid(i - 1) + ry(i - 1) - 16, rx(i - 1), ry(i - 1));
    out.push(`<path d="${poly([...riserTop, ...bottom])}" fill="url(#ar-riser)" opacity=".9"/>`);
    // Seat joints, a few per tier.
    for (let s = 3 + (i % 3); s < 46; s += 5) {
      const [x0, y0] = top[s] as Pt;
      const [, y1] = (bottom[48 - s] ?? top[s]) as Pt;
      out.push(
        `<path d="M${f(x0)} ${f(y0 + 3)} V${f(y1 - 18)}" stroke="#7A5238" stroke-width="2" opacity=".5"/>`,
      );
    }
  }
  // The rim wall, with arched openings onto the evening.
  const rimTop = arc(mid(RIM) - 64 + ry(RIM), rx(RIM), ry(RIM));
  const rimBottom = edge(RIM).reverse();
  out.push(`<path d="${poly([...rimTop, ...rimBottom])}" fill="#A87C58" ${OUT(3)}/>`);
  for (let s = 1; s <= 47; s += 1) {
    const [x, y] = rimTop[s] as Pt;
    const w = 22;
    out.push(
      `<path d="M${f(x - w / 2)} ${f(y + 52)} V${f(y + 26)} Q${f(x - w / 2)} ${f(y + 12)} ${f(x)} ${f(y + 12)} Q${f(x + w / 2)} ${f(y + 12)} ${f(x + w / 2)} ${f(y + 26)} V${f(y + 52)} Z" fill="#E9A15C" stroke="#5E3D2A" stroke-width="2"/>`,
    );
  }
  return out.join('');
}

/** The rim's top edge at `x`. */
function rimAt(x: number): number {
  const r = rx(RIM);
  const u = (x - CX) / r;
  return mid(RIM) - 64 + ry(RIM) - ry(RIM) * Math.sqrt(1 - u * u);
}

function banners(): string {
  const out: string[] = [];
  const poles = [130, 400, 680, 960, 1240, 1520, 1790];
  poles.forEach((x, k) => {
    const y = rimAt(x);
    const h = 96;
    const color = BANNERS[k % BANNERS.length] as string;
    const wave = k % 2 ? 8 : -8;
    out.push(`<path d="M${f(x)} ${f(y)} V${f(y - h)}" ${OUT(4)}/>`);
    out.push(`<circle cx="${f(x)}" cy="${f(y - h - 5)}" r="6" fill="#E8C27A" ${OUT(2)}/>`);
    out.push(
      `<path d="M${f(x)} ${f(y - h + 4)} h34 q${wave} 34 0 68 l-17 -14 l-17 14 Z" fill="${color}" ${OUT(2.4)}/>`,
    );
    out.push(
      `<path d="M${f(x + 6)} ${f(y - h + 20)} h22" stroke="#F3E3C0" stroke-width="3" opacity=".7"/>`,
    );
  });
  return out.join('');
}

function floor(): string {
  const out: string[] = [];
  // The wall around the floor is tier 0's face.
  const wallTop = edge(0);
  const wallBottom = arc(FLOOR_Y - FLOOR_RY + 4 + FLOOR_RY, FLOOR_RX, FLOOR_RY).reverse();
  out.push(`<path d="${poly([...wallTop, ...wallBottom])}" fill="#8A5E3E" ${OUT(3)}/>`);
  // The sand, and the rings a rake leaves.
  out.push(
    `<ellipse cx="${CX}" cy="${FLOOR_Y}" rx="${FLOOR_RX}" ry="${FLOOR_RY}" fill="url(#ar-sand)" ${OUT(3)}/>`,
  );
  for (let r = 1; r <= 5; r++) {
    out.push(
      `<ellipse cx="${CX}" cy="${FLOOR_Y + 20}" rx="${f(FLOOR_RX * (r / 6))}" ry="${f(FLOOR_RY * (r / 6))}" fill="none" stroke="#A9783F" stroke-width="2" opacity=".35"/>`,
    );
  }
  // Two marks where the players stand, facing each other: no podium, no crown.
  for (const x of [700, 1220]) {
    out.push(
      `<ellipse cx="${x}" cy="${FLOOR_Y + 40}" rx="70" ry="20" fill="none" stroke="#7A4E2A" stroke-width="4" opacity=".6"/>`,
    );
  }
  out.push(`<rect width="1920" height="1080" fill="url(#ar-glow)"/>`);
  return out.join('');
}

function braziers(): string {
  const out: string[] = [];
  for (const x of [170, 1750]) {
    const y = 1000;
    out.push(`<circle cx="${x}" cy="${y - 150}" r="190" fill="url(#ar-fire)"/>`);
    out.push(
      `<path d="M${x - 16} ${y} L${x - 8} ${y - 110} H${x + 8} L${x + 16} ${y} Z" fill="#4A2E1E" ${OUT(3)}/>`,
    );
    out.push(
      `<path d="M${x - 46} ${y - 118} Q${x} ${y - 90} ${x + 46} ${y - 118} L${x + 38} ${y - 104} Q${x} ${y - 84} ${x - 38} ${y - 104} Z" fill="#7A4E2E" ${OUT(3)}/>`,
    );
    out.push(
      `<path d="M${x - 30} ${y - 120} Q${x - 26} ${y - 170} ${x - 6} ${y - 196} Q${x - 4} ${y - 160} ${x + 8} ${y - 150} Q${x + 14} ${y - 190} ${x + 26} ${y - 206} Q${x + 40} ${y - 160} ${x + 30} ${y - 120} Z" fill="#F08A2E" ${OUT(2.4)}/>`,
    );
    out.push(
      `<path d="M${x - 14} ${y - 122} Q${x - 8} ${y - 150} ${x + 4} ${y - 162} Q${x + 18} ${y - 146} ${x + 14} ${y - 122} Z" fill="#FFD98A"/>`,
    );
  }
  // The front parapet you look over.
  out.push(
    `<path d="M0 1020 Q960 985 1920 1020 V1080 H0 Z" fill="#7A5238" ${OUT(3)}/><path d="M0 1020 Q960 985 1920 1020" stroke="#C79B72" stroke-width="6" fill="none"/>`,
  );
  return out.join('');
}

/** The whole Arena, as SVG markup for `HallBackdrop`. */
export function paintArena(): string {
  return `${defs()}${sky()}${tiers()}${banners()}${floor()}${braziers()}`;
}
