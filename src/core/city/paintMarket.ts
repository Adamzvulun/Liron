// The Market (roadmap A3): a covered bazaar lane at dusk, in the city's painted style (ADR 0006,
// ADR 0025). Stalls with striped awnings line both walls, with spice sacks, fruit and pots on
// their counters; strings of lamps cross the lane, and a gate with a dome closes its far end.
// Painted in the browser, deterministic, at 1920×1080, with one camera. It sits behind the
// day's stall as a still image (HallBackdrop), so nothing in it is a button.

import { f, line, OUT, poly, type Pt } from './paintKit.ts';

export const MARKET_STAGE = { width: 1920, height: 1080 } as const;

// ---------- one camera down the lane ----------
const FOCAL = 820;
const HORIZON = 470;
/** The lane's half width, the ground, the roofline and the far gate, in world units. */
const W = 2.4;
const GROUND = -1.6;
const ROOF = 3.0;
const FAR = 14;
/** A world point (X right, Y up from eye level, Z away) on the stage. */
const P = (X: number, Y: number, Z: number): Pt => [
  960 + (FOCAL * X) / Z,
  HORIZON - (FOCAL * Y) / Z,
];
/** A quad on a wall (X fixed) between two depths and two heights. */
const wallQuad = (X: number, z0: number, z1: number, y0: number, y1: number): Pt[] => [
  P(X, y0, z0),
  P(X, y0, z1),
  P(X, y1, z1),
  P(X, y1, z0),
];

const PLASTER = '#D4A878';
const STRIPES: [string, string][] = [
  ['#B5432F', '#F3E3C0'],
  ['#265965', '#F3E3C0'],
  ['#C98A2A', '#7E2630'],
  ['#5B3F7A', '#E8C27A'],
  ['#3F7F8C', '#F3E3C0'],
  ['#A83A3E', '#E0B05A'],
];
const GOODS = ['#E2762C', '#C0392B', '#E0B05A', '#7A9A3A', '#8E2E35', '#D9A43A'];

function defs(): string {
  return `<defs>
<linearGradient id="mk-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F2456"/><stop offset=".6" stop-color="#6A3F7A"/><stop offset="1" stop-color="#F09A5E"/></linearGradient>
<linearGradient id="mk-wall-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A6446"/><stop offset="1" stop-color="${PLASTER}"/></linearGradient>
<linearGradient id="mk-wall-r" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#7E5A3E"/><stop offset="1" stop-color="#C99C6C"/></linearGradient>
<linearGradient id="mk-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A6A4E"/><stop offset="1" stop-color="#5E4232"/></linearGradient>
<linearGradient id="mk-door" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3E2516"/><stop offset="1" stop-color="#7A4A2A"/></linearGradient>
<radialGradient id="mk-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(960 420) scale(900 520)"><stop offset="0" stop-color="#FFE7A0" stop-opacity=".28"/><stop offset=".5" stop-color="#FFC861" stop-opacity=".1"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient>
<linearGradient id="mk-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A0E1E" stop-opacity=".1"/><stop offset="1" stop-color="#1A0E1E" stop-opacity=".4"/></linearGradient>
</defs>`;
}

function lane(): string {
  const out: string[] = [];
  out.push(`<rect width="1920" height="1080" fill="url(#mk-sky)"/>`);
  // Stars over the lane.
  const stars: Pt[] = [
    [780, 70],
    [900, 140],
    [1040, 60],
    [1150, 160],
    [990, 230],
    [860, 260],
    [1080, 300],
  ];
  out.push(stars.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#FFF3C8"/>`).join(''));
  // The walls, from near to the gate, and the cobbled ground between them.
  const near = 0.9;
  out.push(`<path d="${poly(wallQuad(-W, near, FAR, GROUND, ROOF))}" fill="url(#mk-wall-l)"/>`);
  out.push(`<path d="${poly(wallQuad(W, near, FAR, GROUND, ROOF))}" fill="url(#mk-wall-r)"/>`);
  const ground = [P(-W, GROUND, near), P(-W, GROUND, FAR), P(W, GROUND, FAR), P(W, GROUND, near)];
  out.push(`<path d="${poly(ground)}" fill="url(#mk-ground)"/>`);
  const cobbles: string[] = [];
  for (let x = -W + 0.4; x < W; x += 0.4)
    cobbles.push(line([P(x, GROUND, near), P(x, GROUND, FAR)]));
  for (let z = 1.2; z < FAR; z *= 1.18) cobbles.push(line([P(-W, GROUND, z), P(W, GROUND, z)]));
  out.push(
    `<path d="${cobbles.join(' ')}" stroke="#4A3324" stroke-width="2" opacity=".45" fill="none"/>`,
  );
  // The roofline's eaves along each wall.
  for (const X of [-W, W]) {
    const s = Math.sign(X);
    out.push(
      `<path d="${poly([P(X, ROOF, near), P(X, ROOF, FAR), P(X - s * 0.35, ROOF + 0.15, FAR), P(X - s * 0.35, ROOF + 0.15, near)])}" fill="#6A3F22" ${OUT(2.5)}/>`,
    );
  }
  // Windows up the walls, some lit.
  let n = 0;
  for (const X of [-W, W]) {
    for (let z = 2; z < FAR - 1; z += 1.9) {
      const lit = n++ % 3 !== 1;
      out.push(
        `<path d="${poly(wallQuad(X, z, z + 0.6, 1.5, 2.4))}" fill="${lit ? '#FFC861' : '#3E2516'}" ${OUT(2)}/>`,
      );
    }
  }
  return out.join('');
}

function gate(): string {
  // The far gate: a wall across the lane with an arch, and a dome and minaret beyond.
  const out: string[] = [];
  const z = FAR;
  out.push(
    `<path d="M${P(-1.2, ROOF + 3.2, z + 6)[0]} ${P(0, ROOF + 3.2, z + 6)[1]} Q960 ${f(P(0, ROOF + 7, z + 6)[1])} ${P(1.2, ROOF + 3.2, z + 6)[0]} ${P(0, ROOF + 3.2, z + 6)[1]} Z" fill="#33224F"/>`,
  );
  const [mx] = P(1.5, 0, z + 4);
  const [, mt] = P(0, ROOF + 4.2, z + 4);
  const [, mb] = P(0, ROOF, z + 4);
  out.push(
    `<rect x="${f(mx - 12)}" y="${f(mt)}" width="24" height="${f(mb - mt)}" fill="#33224F"/><path d="M${f(mx - 16)} ${f(mt)} L${f(mx)} ${f(mt - 34)} L${f(mx + 16)} ${f(mt)} Z" fill="#33224F"/><circle cx="${f(mx)}" cy="${f(mt + 18)}" r="5" fill="#FFD36B"/>`,
  );
  const tl = P(-W, ROOF + 0.8, z);
  const br = P(W, GROUND, z);
  out.push(
    `<rect x="${f(tl[0])}" y="${f(tl[1])}" width="${f(br[0] - tl[0])}" height="${f(br[1] - tl[1])}" fill="#B98F68" ${OUT(2.5)}/>`,
  );
  const [al] = P(-0.9, 0, z);
  const [ar] = P(0.9, 0, z);
  const [, at] = P(0, 1.2, z);
  const [, ab] = P(0, GROUND, z);
  const r = (ar - al) / 2;
  out.push(
    `<path d="M${f(al)} ${f(ab)} L${f(al)} ${f(at + r)} A${f(r)} ${f(r)} 0 0 1 ${f(ar)} ${f(at + r)} L${f(ar)} ${f(ab)} Z" fill="#F09A5E" ${OUT(2.5)}/>`,
  );
  return out.join('');
}

interface Stall {
  side: -1 | 1;
  z0: number;
  z1: number;
  stripes: number;
}

const STALLS: Stall[] = [
  { side: -1, z0: 1.5, z1: 3.1, stripes: 0 },
  { side: 1, z0: 2.1, z1: 3.7, stripes: 1 },
  { side: -1, z0: 4.0, z1: 5.9, stripes: 2 },
  { side: 1, z0: 4.7, z1: 6.6, stripes: 3 },
  { side: -1, z0: 7.0, z1: 9.2, stripes: 4 },
  { side: 1, z0: 7.8, z1: 10.0, stripes: 5 },
];

function stall({ side, z0, z1, stripes }: Stall, i: number): string {
  const X = side * W;
  const front = X - side * 0.85;
  const top = -0.65;
  const out: string[] = [];
  // A doorway in the wall behind the stall, lit from inside.
  out.push(
    `<path d="${poly(wallQuad(X, z0 + 0.2, z1 - 0.2, GROUND, 0.7))}" fill="url(#mk-door)" ${OUT(2)}/>`,
  );
  // The counter: its top, and the face toward the lane.
  const counterTop = [P(X, top, z0), P(X, top, z1), P(front, top, z1), P(front, top, z0)];
  const counterFace = [
    P(front, top, z0),
    P(front, top, z1),
    P(front, GROUND, z1),
    P(front, GROUND, z0),
  ];
  const counterEnd = [P(X, top, z0), P(front, top, z0), P(front, GROUND, z0), P(X, GROUND, z0)];
  out.push(`<path d="${poly(counterFace)}" fill="#7A4A2A" ${OUT(2.5)}/>`);
  out.push(`<path d="${poly(counterEnd)}" fill="#5E3820" ${OUT(2.5)}/>`);
  out.push(`<path d="${poly(counterTop)}" fill="#9A6238" ${OUT(2.5)}/>`);
  // Goods on the counter: spice cones on one stall, fruit on the next, pots on the third kind.
  const kind = i % 3;
  const count = 5;
  for (let k = count - 1; k >= 0; k--) {
    const z = z0 + ((k + 0.5) / count) * (z1 - z0);
    const x = X - side * 0.42;
    const color = GOODS[(i + k) % GOODS.length] ?? '#E2762C';
    const [cx, cy] = P(x, top, z);
    const s = (0.8 * FOCAL) / z;
    if (kind === 0) {
      out.push(
        `<path d="M${f(cx - 0.3 * s)} ${f(cy)} Q${f(cx)} ${f(cy - 0.62 * s)} ${f(cx + 0.3 * s)} ${f(cy)} Z" fill="${color}" ${OUT(2)}/>`,
      );
    } else if (kind === 1) {
      for (const [dx, dy] of [
        [-0.12, 0.1],
        [0.12, 0.1],
        [0, 0.26],
      ] as const) {
        out.push(
          `<circle cx="${f(cx + dx * s)}" cy="${f(cy - dy * s)}" r="${f(0.12 * s)}" fill="${color}" ${OUT(1.5)}/>`,
        );
      }
    } else {
      out.push(
        `<path d="M${f(cx - 0.14 * s)} ${f(cy - 0.5 * s)} L${f(cx + 0.14 * s)} ${f(cy - 0.5 * s)} Q${f(cx + 0.32 * s)} ${f(cy - 0.2 * s)} ${f(cx + 0.16 * s)} ${f(cy)} L${f(cx - 0.16 * s)} ${f(cy)} Q${f(cx - 0.32 * s)} ${f(cy - 0.2 * s)} ${f(cx - 0.14 * s)} ${f(cy - 0.5 * s)} Z" fill="${k % 2 ? '#B5643A' : '#3F7F8C'}" ${OUT(2)}/>`,
      );
    }
  }
  // Poles at the front corners, and the striped awning sloping down from the wall.
  for (const z of [z0, z1]) {
    out.push(
      `<path d="${line([P(front - side * 0.05, GROUND, z), P(front - side * 0.05, 0.45, z)])}" stroke="#4B2D1A" stroke-width="${f(Math.max(3, 60 / z))}" stroke-linecap="round"/>`,
    );
  }
  const [a, b] = STRIPES[stripes] ?? ['#B5432F', '#F3E3C0'];
  const bands = 6;
  for (let k = bands - 1; k >= 0; k--) {
    const za = z0 + (k / bands) * (z1 - z0);
    const zb = z0 + ((k + 1) / bands) * (z1 - z0);
    const quad = [
      P(X, 1.15, za),
      P(X, 1.15, zb),
      P(front - side * 0.2, 0.45, zb),
      P(front - side * 0.2, 0.45, za),
    ];
    out.push(`<path d="${poly(quad)}" fill="${k % 2 ? a : b}"/>`);
  }
  out.push(
    `<path d="${poly([P(X, 1.15, z0), P(X, 1.15, z1), P(front - side * 0.2, 0.45, z1), P(front - side * 0.2, 0.45, z0)])}" fill="none" ${OUT(2.5)}/>`,
  );
  // A scalloped valance along the awning's edge.
  const scallops: string[] = [];
  const edge = front - side * 0.2;
  for (let k = 0; k < bands; k++) {
    const za = z0 + (k / bands) * (z1 - z0);
    const zb = z0 + ((k + 1) / bands) * (z1 - z0);
    const p0 = P(edge, 0.45, za);
    const p1 = P(edge, 0.45, zb);
    const mid = P(edge, 0.3, (za + zb) / 2);
    scallops.push(
      `M${f(p0[0])} ${f(p0[1])} Q${f(mid[0])} ${f(mid[1] + (mid[1] - p0[1]))} ${f(p1[0])} ${f(p1[1])} Z`,
    );
  }
  out.push(`<path d="${scallops.join(' ')}" fill="${a}" ${OUT(2)}/>`);
  return out.join('');
}

function lamps(): string {
  // Strings of lamps across the lane, sagging between the eaves.
  const out: string[] = [];
  for (const z of [2.6, 5.2, 8.6, 12]) {
    const l = P(-W, ROOF - 0.3, z);
    const r = P(W, ROOF - 0.3, z);
    const c = P(0, ROOF - 1.3, z);
    out.push(
      `<path d="M${f(l[0])} ${f(l[1])} Q${f(c[0])} ${f(c[1])} ${f(r[0])} ${f(r[1])}" stroke="#2A170C" stroke-width="${f(Math.max(1.5, 8 / z))}" fill="none"/>`,
    );
    const bulbs = 9;
    for (let k = 1; k < bulbs; k++) {
      const t = k / bulbs;
      const x = (1 - t) ** 2 * l[0] + 2 * (1 - t) * t * c[0] + t ** 2 * r[0];
      const y = (1 - t) ** 2 * l[1] + 2 * (1 - t) * t * c[1] + t ** 2 * r[1];
      const rad = Math.max(3, 34 / z);
      out.push(
        `<circle cx="${f(x)}" cy="${f(y + rad)}" r="${f(rad * 2.6)}" fill="#FFD36B" opacity=".18"/><circle cx="${f(x)}" cy="${f(y + rad)}" r="${f(rad)}" fill="${k % 3 ? '#FFD36B' : '#FF9A5E'}" ${OUT(1.5)}/>`,
      );
    }
  }
  return out.join('');
}

/** The whole lane, as SVG markup for a 1920×1080 stage. */
export function paintMarket(): string {
  const stalls = STALLS.map((s, i) => [s, i] as const)
    .sort(([a], [b]) => b.z0 - a.z0)
    .map(([s, i]) => stall(s, i))
    .join('');
  return (
    defs() +
    lane() +
    gate() +
    stalls +
    lamps() +
    `<rect width="1920" height="1080" fill="url(#mk-glow)"/>` +
    `<rect width="1920" height="1080" fill="url(#mk-shade)"/>`
  );
}
