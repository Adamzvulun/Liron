// Inside the Caravanserai (#42): the inn's courtyard at sunset, in the city's painted style
// (ADR 0006, ADR 0025): ink outlines, gradients, warm light from lamps. Painted in the browser,
// deterministic, at 1920×1080, with one camera for the whole courtyard: the far wall with the
// gate to the road, two arcaded side walls, a flagstone floor, and "The Long Road In" as a
// sandy path with a milestone per script lesson. The milestones change with progress, so
// they're painted separately (paintMilestones); each station is separate so it can be a button.
// Ported from the approved concept (2026-11-04, khan2).

export const KHAN_STAGE = { width: 1920, height: 1080 } as const;

export type StationId = 'scribe' | 'slate' | 'innkeeper' | 'fountain' | 'storyteller' | 'coffee';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PaintedStation {
  svg: string;
  box: Box;
  /** Where its plaque hangs (top centre), in stage pixels. */
  plaque: { x: number; y: number };
}

export interface PaintedKhan {
  defs: string;
  /** Sky, walls, floor and the road: everything behind the stations. */
  back: string;
  stations: Record<StationId, PaintedStation>;
  /** The gate in the far wall, where the trial waits. */
  gate: Box;
  /** Lantern strings, the house banner and the evening light, on top. */
  front: string;
  /** The banner's cloth, where the hall writes your rank. */
  banner: Box;
}

type Pt = readonly [number, number];
type Stop = readonly [number, string, number?];

const INK = '#2A170C';
const PLASTER = '#D8B183';
const f = (n: number) => Math.round(n * 10) / 10;
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (a: number[]) =>
  '#' +
  a
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
const mix = (a: string, b: string, t: number) => {
  const hb = hex(b);
  return toHex(hex(a).map((v, i) => v + ((hb[i] ?? 0) - v) * t));
};
const lit = (c: string, t: number) => mix(c, '#FFEFC8', t);
const dk = (c: string, t: number) => mix(c, '#2A1630', t);
const OUT = (w = 3) =>
  `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const poly = (pts: readonly Pt[]) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + ' Z';
const line = (pts: readonly Pt[]) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L');

// ---------- one camera for the whole courtyard ----------
const FOCAL = 1350;
const HORIZON = 520;
/** World heights and depths: the ground, the far wall, the side walls, the near edge. */
const G = -0.45;
const BACK = 3.2;
const SIDE = 1.1;
const NEAR = 0.85;
/** A world point (X right, Y up from eye level, Z away) on the stage. */
export const P = (X: number, Y: number, Z: number): Pt => [
  960 + (FOCAL * X) / Z,
  HORIZON - (FOCAL * Y) / Z,
];
/** How big things are drawn at depth Z: 1 at about the scribe's table. */
const sz = (z: number) => 1.25 / z;

/** A pointed arch in a wall's own coordinates (u across, v up), as sampled points. */
function archUV(u0: number, u1: number, v0: number, spring: number, apex: number, n = 10): Pt[] {
  const pts: Pt[] = [
    [u0, v0],
    [u0, spring],
  ];
  const half = (u1 - u0) / 2;
  const rise = apex - spring;
  const up = (t: number) => spring + rise * Math.sin((t * Math.PI) / 2) ** 0.8;
  for (let i = 1; i <= n; i++) pts.push([u0 + half * (i / n), up(i / n)]);
  for (let i = n - 1; i >= 0; i--) pts.push([u1 - half * (i / n), up(i / n)]);
  pts.push([u1, spring], [u1, v0]);
  return pts;
}

type Map2 = (p: Pt) => Pt;
const onBack =
  (d = 0): Map2 =>
  ([u, v]) =>
    P(u, v, BACK + d);
const onSide =
  (sx: number, d = 0): Map2 =>
  ([u, v]) =>
    P(sx * (SIDE + d), v, u);

/** "The Long Road In": the path from your feet to the gate, t from 0 (near) to 1 (the gate). */
const pathAt = (t: number): Pt => [
  0.32 * Math.sin(t * Math.PI * 2.2 + 0.4) * (1 - t) ** 1.2,
  0.95 + (BACK - 0.95) * t,
];

export interface MilestoneSpot {
  /** The stone's foot on the stage. */
  x: number;
  y: number;
  /** Its width and height on the stage. */
  w: number;
  h: number;
}

/** The milestones along the road, one per lesson, nearest (lesson 1) first. */
export function milestoneSpots(count = 8): MilestoneSpot[] {
  return Array.from({ length: count }, (_, m) => {
    const t = (m + 0.6) / (count + 0.6);
    const [x0, z] = pathAt(t);
    const [x, y] = P(x0 + (m % 2 ? 0.13 : -0.13), G, z);
    const s = (FOCAL / z / 1350) * 1.6;
    return { x, y, w: 34 * s, h: 64 * s };
  });
}

const GLOW_STOPS = `<stop offset="0" stop-color="#FFE7A0" stop-opacity=".9"/><stop offset=".4" stop-color="#FFC861" stop-opacity=".35"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/>`;

/**
 * The milestones, far to near: `lit` lessons passed glow, the next one is ringed in gold. Drawn
 * by the hall over the floor; the classes let CSS make the next one flicker.
 */
export function paintMilestones(lit: number, count = 8): string {
  const spots = milestoneSpots(count);
  let o = `<defs><radialGradient id="khan-ms-glow">${GLOW_STOPS}</radialGradient><linearGradient id="khan-ms-stone" x1="0" x2="1"><stop offset="0" stop-color="#B8A894"/><stop offset="1" stop-color="#7A6A5A"/></linearGradient></defs>`;
  for (let m = count - 1; m >= 0; m--) {
    const p = spots[m];
    if (!p) continue;
    const { x, y, w, h } = p;
    const on = m < lit;
    const next = m === lit;
    o += `<g class="khan__milestone${on ? ' is-lit' : ''}${next ? ' is-next' : ''}">`;
    o += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(w * 0.9)}" ry="${f(w * 0.25)}" fill="#2A1610" opacity=".35"/>`;
    if (on)
      o += `<circle cx="${f(x)}" cy="${f(y - h * 0.6)}" r="${f(h * 1.3)}" fill="url(#khan-ms-glow)"/>`;
    o += `<path d="M${f(x - w / 2)} ${f(y)} V${f(y - h * 0.7)} Q${f(x - w / 2)} ${f(y - h)} ${f(x)} ${f(y - h)} Q${f(x + w / 2)} ${f(y - h)} ${f(x + w / 2)} ${f(y - h * 0.7)} V${f(y)} Z" fill="url(#khan-ms-stone)" ${OUT(f(2.5 * Math.max(0.6, w / 54)))}/>`;
    o += `<circle class="khan__milestone-lamp" cx="${f(x)}" cy="${f(y - h * 0.6)}" r="${f(w * 0.28)}" fill="${on ? '#FFD36B' : '#3A2E26'}" stroke="${next ? '#FFD36B' : INK}" stroke-width="${next ? 4 : 2}"/>`;
    o += `</g>`;
  }
  return o;
}

export function paintKhan(): PaintedKhan {
  let seed = 7;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const R = (a: number, b: number) => a + (b - a) * rnd();
  const defs: string[] = [];
  let uid = 0;
  const st = (s: readonly Stop[]) =>
    s
      .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
      .join('');
  const lin = (s: readonly Stop[], x1 = 0, y1 = 0, x2 = 0, y2 = 1) => {
    const id = `khan-g${++uid}`;
    defs.push(
      `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${st(s)}</linearGradient>`,
    );
    return `url(#${id})`;
  };
  const rad = (s: readonly Stop[], cx = 0.5, cy = 0.5, r = 0.5) => {
    const id = `khan-r${++uid}`;
    defs.push(
      `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${st(s)}</radialGradient>`,
    );
    return `url(#${id})`;
  };
  defs.push(
    `<filter id="khan-b6"><feGaussianBlur stdDeviation="6"/></filter><filter id="khan-b20" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20"/></filter>`,
    `<filter id="khan-plaster" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".02 .04" numOctaves="3" seed="3"/><feColorMatrix type="matrix" values="0 0 0 0 .45  0 0 0 0 .3  0 0 0 0 .18  0 0 0 1 -.45"/><feComposite operator="in" in2="SourceGraphic"/></filter>`,
    `<radialGradient id="khan-glow">${GLOW_STOPS}</radialGradient>`,
  );
  const GLOW = 'url(#khan-glow)';
  const items: [number, string][] = [];

  // ---------- the sky over the courtyard ----------
  let back = `<rect width="1920" height="1080" fill="${lin([
    [0, '#1A1D48'],
    [0.3, '#4A3668'],
    [0.5, '#C9705A'],
    [0.62, '#F2B46E'],
  ])}"/>`;
  for (let i = 0; i < 50; i++)
    back += `<circle cx="${f(R(0, 1920))}" cy="${f(R(0, 230))}" r="${f(R(0.8, 2.2))}" fill="#FFF6D8" opacity="${f(R(0.35, 1))}"/>`;
  back += `<circle cx="1180" cy="120" r="70" fill="#FFF6D8" opacity=".12"/><path d="M1196 78 A44 44 0 1 0 1214 152 A36 36 0 1 1 1196 78 Z" fill="#F6EAC8"/>`;

  // ---------- the walls: two storeys of arches ----------
  const GROUND_TOP = 0.05;
  const GALLERY = 0.1;
  const UPPER_TOP = 0.42;
  const PARAPET = 0.5;
  function wall(
    map: Map2,
    mapDeep: Map2,
    u0: number,
    u1: number,
    bays: number,
    { gate = null as { u: number; half: number } | null, light = 0.5, near = 1 } = {},
  ) {
    let s = '';
    const face = (
      [
        [u0, G],
        [u1, G],
        [u1, PARAPET],
        [u0, PARAPET],
      ] as Pt[]
    ).map(map);
    s += `<path d="${poly(face)}" fill="${lin([
      [0, lit(PLASTER, 0.15 * light)],
      [1, dk(PLASTER, 0.35 - 0.2 * light)],
    ])}" ${OUT(3)}/>`;
    s += `<path d="${poly(face)}" filter="url(#khan-plaster)" opacity=".5"/>`;
    const band = (a: number, b: number) =>
      poly(
        (
          [
            [u0, a],
            [u1, a],
            [u1, b],
            [u0, b],
          ] as Pt[]
        ).map(map),
      );
    s += `<path d="${band(GROUND_TOP, GALLERY)}" fill="${dk(PLASTER, 0.18)}" ${OUT(2.5)}/>`;
    s += `<path d="${band(UPPER_TOP + 0.02, UPPER_TOP + 0.045)}" fill="${lit(PLASTER, 0.2)}" ${OUT(2)}/>`;
    const w = (u1 - u0) / bays;
    for (let b = 0; b < bays; b++) {
      const a0 = u0 + w * b + w * 0.14;
      const a1 = u0 + w * (b + 1) - w * 0.14;
      const mid = (a0 + a1) / 2;
      if (gate && Math.abs(mid - gate.u) < gate.half + w * 0.5) continue;
      const ga = archUV(a0, a1, G, G + 0.27, G + 0.4);
      s += `<path d="${poly(ga.map(map))}" fill="${lin([
        [0, '#3A2014'],
        [0.6, '#5A2E1A'],
        [1, '#2A1610'],
      ])}" ${OUT(3)}/>`;
      const deep = archUV(a0 + w * 0.05, a1 - w * 0.05, G, G + 0.25, G + 0.36).map(mapDeep);
      if (rnd() > 0.35)
        s += `<path d="${poly(deep)}" fill="${rad(
          [
            [0, '#FFD98A', 0.85],
            [0.5, '#E8963A', 0.45],
            [1, '#5A2E1A', 0],
          ],
          0.5,
          0.75,
          0.7,
        )}"/>`;
      const door = archUV(mid - w * 0.12, mid + w * 0.12, G, G + 0.14, G + 0.2).map(mapDeep);
      s += `<path d="${poly(door)}" fill="#24140E" opacity=".75"/>`;
      s += `<path d="${line(ga.slice(1, -1).map(map))}" fill="none" stroke="${lit(PLASTER, 0.3)}" stroke-width="${f(5 * near)}" opacity=".7"/>`;
      s += `<path d="${poly(ga.map(map))}" fill="none" ${OUT(3)}/>`;
      const ua = archUV(
        a0 + w * 0.08,
        a1 - w * 0.08,
        GALLERY + 0.02,
        GALLERY + 0.2,
        UPPER_TOP - 0.03,
      );
      s += `<path d="${poly(ua.map(map))}" fill="${lin([
        [0, '#2A1830'],
        [1, '#4A2A22'],
      ])}" ${OUT(2.5)}/>`;
      if (rnd() > 0.5) {
        const [lx, ly] = map([mid, GALLERY + 0.17]);
        s += `<circle cx="${f(lx)}" cy="${f(ly)}" r="${f((FOCAL / 3) * 0.12 * near)}" fill="${GLOW}"/>`;
      }
      for (let k = 0; k <= 6; k++) {
        const u = a0 + ((a1 - a0) * k) / 6;
        s += `<path d="${line(
          (
            [
              [u, GALLERY],
              [u, GALLERY + 0.055],
            ] as Pt[]
          ).map(map),
        )}" stroke="${dk(PLASTER, 0.35)}" stroke-width="${f(4 * near)}"/>`;
      }
      s += `<path d="${line(
        (
          [
            [a0, GALLERY + 0.055],
            [a1, GALLERY + 0.055],
          ] as Pt[]
        ).map(map),
      )}" stroke="${dk(PLASTER, 0.2)}" stroke-width="${f(6 * near)}" stroke-linecap="round"/>`;
    }
    const n = Math.round((u1 - u0) / 0.09);
    for (let k = 0; k < n; k++) {
      const c0 = u0 + ((u1 - u0) * k) / n + 0.012;
      const c1 = u0 + ((u1 - u0) * (k + 1)) / n - 0.012;
      const m = archUV(c0, c1, PARAPET, PARAPET + 0.03, PARAPET + 0.055, 4).map(map);
      s += `<path d="${poly(m)}" fill="${lit(PLASTER, 0.1 * light)}" ${OUT(2.5)}/>`;
    }
    return s;
  }

  // the far wall, with the gate to the road at sunset
  const gateArch = archUV(-0.22, 0.22, G, G + 0.4, G + 0.62, 14);
  {
    let s = wall(onBack(), onBack(0.12), -SIDE, SIDE, 6, {
      gate: { u: 0, half: 0.24 },
      light: 0.9,
      near: 0.4,
    });
    const frame = archUV(-0.28, 0.28, G, G + 0.42, G + 0.68, 14);
    s += `<path d="${poly(frame.map(onBack()))}" fill="${lin([
      [0, lit(PLASTER, 0.05)],
      [1, dk(PLASTER, 0.3)],
    ])}" ${OUT(3)}/>`;
    const inner6 = archUV(-0.22, 0.22, G, G + 0.4, G + 0.62, 6);
    const outer6 = archUV(-0.28, 0.28, G, G + 0.42, G + 0.68, 6);
    for (let i = 1; i < 12; i++) {
      const a = inner6[i + 1];
      const b = outer6[i + 1];
      if (a && b)
        s += `<path d="${line([a, b].map(onBack()))}" stroke="${INK}" stroke-width="2" opacity=".5"/>`;
    }
    const ga = gateArch.map(onBack());
    s += `<path d="${poly(ga)}" fill="${lin([
      [0, '#F7C27A'],
      [0.55, '#E98A5A'],
      [1, '#B4604A'],
    ])}" ${OUT(3.5)}/>`;
    s += `<path d="${poly(ga)}" fill="#4A2A1E" opacity=".55"/>`;
    s += `<path d="${poly(gateArch.map(onBack(0.5)))}" fill="${lin([
      [0, '#FFE0A0'],
      [0.6, '#F2A066'],
      [1, '#D07A55'],
    ])}"/>`;
    const [hx, hy] = P(0, G + 0.08, BACK + 0.5);
    s += `<path d="M${f(hx - 160)} ${f(hy + 6)} Q${f(hx - 60)} ${f(hy - 30)} ${f(hx + 20)} ${f(hy)} Q${f(hx + 110)} ${f(hy - 34)} ${f(hx + 170)} ${f(hy + 6)}" fill="#C47A5A" opacity=".8"/>`;
    s += `<path d="${poly([P(-0.06, G, BACK + 0.5), P(0.06, G, BACK + 0.5), P(0.2, G, BACK), P(-0.2, G, BACK)])}" fill="#E9B98A"/>`;
    s += `<path d="${poly(ga)}" fill="none" ${OUT(3.5)}/>`;
    items.push([BACK, s]);
  }
  for (const sx of [-1, 1])
    items.push([
      BACK - 0.01,
      wall(onSide(sx), onSide(sx, 0.22), BACK, NEAR - 0.6, 7, {
        light: sx < 0 ? 0.55 : 0.35,
        near: 1.6,
      }),
    ]);

  // the floor: big sandstone flags, converging on the gate
  {
    let s = '';
    const xs = 12;
    const zs = 14;
    for (let i = 0; i < xs; i++)
      for (let j = 0; j < zs; j++) {
        const x0 = -SIDE + (2 * SIDE * i) / xs;
        const x1 = x0 + (2 * SIDE) / xs;
        const z1 = BACK - ((BACK - 0.4) * j) / zs;
        const z0 = z1 - (BACK - 0.4) / zs;
        if (z0 <= 0.3) continue;
        const q = [P(x0, G, z1), P(x1, G, z1), P(x1, G, z0), P(x0, G, z0)];
        const depth = (z0 - 0.4) / (BACK - 0.4);
        const c = mix(
          mix('#C9A070', '#B88E62', ((i + j) % 2) * 0.6 + rnd() * 0.3),
          '#6A4A3A',
          0.25 * depth,
        );
        s += `<path d="${poly(q)}" fill="${c}" stroke="#7A5638" stroke-opacity=".6" stroke-width="2"/>`;
      }
    for (const sx of [-1, 1])
      s += `<path d="${poly([P(sx * SIDE, G, BACK), P(sx * (SIDE - 0.18), G, BACK), P(sx * (SIDE - 0.18), G, 0.5), P(sx * SIDE, G, 0.5)])}" fill="#2A1610" opacity=".35" filter="url(#khan-b20)"/>`;
    s += `<path d="${poly([P(-SIDE, G, BACK), P(SIDE, G, BACK), P(SIDE, G, BACK - 0.15), P(-SIDE, G, BACK - 0.15)])}" fill="#2A1610" opacity=".3" filter="url(#khan-b6)"/>`;
    items.push([BACK - 0.02, s]);
  }

  // the road itself
  {
    const L: Pt[] = [];
    const Rr: Pt[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const [x, z] = pathAt(t);
      const w = 0.1 - 0.03 * t;
      L.push(P(x - w, G, z));
      Rr.unshift(P(x + w, G, z));
    }
    items.push([
      BACK - 0.03,
      `<path d="${poly([...L, ...Rr])}" fill="${lin([
        [0, '#E6C695'],
        [1, '#D2AA78'],
      ])}" stroke="${INK}" stroke-width="2.5" stroke-opacity=".7"/>`,
    ]);
  }
  items.sort((a, b) => b[0] - a[0]);
  back += items.map((i) => i[1]).join('');

  // ---------- stations ----------
  const stations = {} as Record<StationId, PaintedStation>;
  const shadow = (x: number, y: number, rx: number, ry: number, blur = true) =>
    `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="#2A1610" opacity=".38"${blur ? ' filter="url(#khan-b6)"' : ''}/>`;

  // the scribe's table (lessons): a low table, a cushion, paper with letters, ink and a candle
  {
    const k = sz(1.35);
    const [x, y] = P(-0.62, G, 1.35);
    let s = shadow(x, y + 6 * k, 220 * k, 26 * k);
    s += `<path d="M${f(x - 300 * k)} ${f(y + 10 * k)} q${f(70 * k)} ${f(-90 * k)} ${f(150 * k)} ${f(-50 * k)} q${f(30 * k)} ${f(40 * k)} ${f(-20 * k)} ${f(70 * k)} z" fill="${lin(
      [
        [0, '#D06A4A'],
        [1, '#8A3A2E'],
      ],
    )}" ${OUT(3)}/>`;
    for (const lx of [-160, 150])
      s += `<path d="M${f(x + lx * k)} ${f(y - 70 * k)} v${f(70 * k)} h${f(16 * k)} v${f(-70 * k)} z" fill="#4A2C18" ${OUT(2.5)}/>`;
    s += `<path d="M${f(x - 200 * k)} ${f(y - 70 * k)} h${f(400 * k)} l${f(-20 * k)} ${f(-26 * k)} h${f(-360 * k)} z" fill="${lin(
      [
        [0, '#B07A48'],
        [1, '#6A3E22'],
      ],
    )}" ${OUT(3)}/>`;
    s += `<path d="M${f(x - 200 * k)} ${f(y - 70 * k)} h${f(400 * k)} v${f(16 * k)} h${f(-400 * k)} z" fill="#5A3420" ${OUT(2.5)}/>`;
    s += `<path d="M${f(x - 120 * k)} ${f(y - 80 * k)} l${f(180 * k)} ${f(-4 * k)} l${f(-10 * k)} ${f(-14 * k)} l${f(-160 * k)} ${f(2 * k)} z" fill="#F3E2BC" ${OUT(2)}/>`;
    s += `<text x="${f(x - 30 * k)}" y="${f(y - 82 * k)}" font-family="Noto Naskh Arabic" font-weight="700" font-size="${f(22 * k)}" text-anchor="middle" fill="${INK}">ب ت ن</text>`;
    s += `<circle cx="${f(x + 120 * k)}" cy="${f(y - 150 * k)}" r="${f(80 * k)}" fill="${GLOW}"/>`;
    s += `<path d="M${f(x + 112 * k)} ${f(y - 96 * k)} v${f(-40 * k)} h${f(16 * k)} v${f(40 * k)} z" fill="#FBF1D8" ${OUT(2)}/><path d="M${f(x + 120 * k)} ${f(y - 138 * k)} q${f(-8 * k)} ${f(-12 * k)} 0 ${f(-26 * k)} q${f(8 * k)} ${f(14 * k)} 0 ${f(26 * k)} z" fill="#FFD36B" stroke="#E8763A" stroke-width="2"/>`;
    s += `<ellipse cx="${f(x + 170 * k)}" cy="${f(y - 100 * k)}" rx="${f(16 * k)}" ry="${f(8 * k)}" fill="#1A1020" ${OUT(2)}/><path d="M${f(x + 168 * k)} ${f(y - 104 * k)} l${f(30 * k)} ${f(-60 * k)}" stroke="#F3E2BC" stroke-width="${f(3 * k)}"/>`;
    stations.scribe = {
      svg: s,
      box: box(x - 310 * k, y - 240 * k, x + 230 * k, y + 40 * k),
      plaque: { x, y: y + 18 * k },
    };
  }
  // the slate (writing): an easel with a blackboard
  {
    const k = sz(2.25);
    const [x, y] = P(-0.5, G, 2.25);
    let s = shadow(x, y, 110 * k, 14 * k);
    s += `<path d="M${f(x - 70 * k)} ${f(y)} L${f(x - 10 * k)} ${f(y - 300 * k)} M${f(x + 70 * k)} ${f(y)} L${f(x + 10 * k)} ${f(y - 300 * k)} M${f(x)} ${f(y - 10 * k)} V${f(y - 300 * k)}" stroke="#5A3420" stroke-width="${f(10 * k)}" stroke-linecap="round"/>`;
    s += `<rect x="${f(x - 90 * k)}" y="${f(y - 300 * k)}" width="${f(180 * k)}" height="${f(130 * k)}" rx="${f(6 * k)}" fill="#8A5A33" ${OUT(3)}/>`;
    s += `<rect x="${f(x - 76 * k)}" y="${f(y - 286 * k)}" width="${f(152 * k)}" height="${f(102 * k)}" fill="#2E3C38" ${OUT(2)}/>`;
    s += `<text x="${f(x)}" y="${f(y - 210 * k)}" font-family="Noto Naskh Arabic" font-weight="700" font-size="${f(60 * k)}" text-anchor="middle" fill="#F3E2BC" opacity=".9">ب</text>`;
    stations.slate = {
      svg: s,
      box: box(x - 120 * k, y - 310 * k, x + 120 * k, y + 20 * k),
      plaque: { x, y: y - 300 * k - 100 },
    };
  }
  // the innkeeper's table (words, #160): a low table by the left arcade, with her open guest
  // book, a basket of round bread, a water jug, an oil lamp, and cushions for the regulars
  {
    const Z = 2.1;
    const k = sz(Z) * 1.15;
    const [x, y] = P(-0.98, G, Z);
    let s = shadow(x, y + 4 * k, 200 * k, 24 * k);
    // cushions on either side
    for (const [dx, c] of [
      [-190, '#2E8FA3'],
      [190, '#C98A2A'],
    ] as const)
      s += `<ellipse cx="${f(x + dx * k)}" cy="${f(y - 14 * k)}" rx="${f(56 * k)}" ry="${f(22 * k)}" fill="${lin(
        [
          [0, lit(c, 0.2)],
          [1, dk(c, 0.35)],
        ],
      )}" ${OUT(2.5)}/>`;
    // legs, then the top
    for (const lx of [-140, 124])
      s += `<path d="M${f(x + lx * k)} ${f(y - 62 * k)} v${f(62 * k)} h${f(16 * k)} v${f(-62 * k)} z" fill="#4A2C18" ${OUT(2.5)}/>`;
    s += `<path d="M${f(x - 170 * k)} ${f(y - 62 * k)} h${f(340 * k)} l${f(-18 * k)} ${f(-26 * k)} h${f(-304 * k)} z" fill="${lin(
      [
        [0, '#B98552'],
        [1, '#6A3E22'],
      ],
    )}" ${OUT(3)}/>`;
    s += `<path d="M${f(x - 170 * k)} ${f(y - 62 * k)} h${f(340 * k)} v${f(14 * k)} h${f(-340 * k)} z" fill="#5A3420" ${OUT(2.5)}/>`;
    // the guest book, open: two pages with lines of writing and a red ribbon
    s += `<path d="M${f(x - 100 * k)} ${f(y - 74 * k)} l${f(84 * k)} ${f(-6 * k)} l${f(-8 * k)} ${f(-22 * k)} l${f(-70 * k)} ${f(4 * k)} z M${f(x - 16 * k)} ${f(y - 80 * k)} l${f(84 * k)} ${f(4 * k)} l${f(-14 * k)} ${f(-20 * k)} l${f(-78 * k)} ${f(-6 * k)} z" fill="#F3E2BC" ${OUT(2)}/>`;
    for (const i of [0, 1, 2])
      s += `<path d="M${f(x - 86 * k + i * 2 * k)} ${f(y - 80 * k - i * 6 * k)} h${f(56 * k)} M${f(x - 6 * k)} ${f(y - 84 * k - i * 6 * k)} h${f(56 * k)}" stroke="${INK}" stroke-width="${f(1.6 * k)}" opacity=".55"/>`;
    s += `<path d="M${f(x - 16 * k)} ${f(y - 80 * k)} l${f(6 * k)} ${f(20 * k)} l${f(5 * k)} ${f(-6 * k)} l${f(3 * k)} ${f(8 * k)}" stroke="#C8553D" stroke-width="${f(3 * k)}" fill="none"/>`;
    // a basket of round bread
    s += `<path d="M${f(x + 70 * k)} ${f(y - 96 * k)} q${f(36 * k)} ${f(22 * k)} ${f(72 * k)} 0 l${f(-8 * k)} ${f(-20 * k)} h${f(-56 * k)} z" fill="#A8743E" ${OUT(2)}/>`;
    for (const [bx, by] of [
      [88, -120],
      [118, -122],
      [104, -134],
    ] as const)
      s += `<ellipse cx="${f(x + bx * k)}" cy="${f(y + by * k)}" rx="${f(18 * k)}" ry="${f(9 * k)}" fill="#E8B46A" ${OUT(1.8)}/>`;
    // a clay jug
    s += `<path d="M${f(x - 140 * k)} ${f(y - 86 * k)} q${f(-14 * k)} ${f(-30 * k)} ${f(4 * k)} ${f(-52 * k)} v${f(-14 * k)} h${f(20 * k)} v${f(14 * k)} q${f(18 * k)} ${f(22 * k)} ${f(4 * k)} ${f(52 * k)} z" fill="${lin(
      [
        [0, '#D9875A'],
        [1, '#9A4A2E'],
      ],
    )}" ${OUT(2)}/>`;
    // an oil lamp with its glow
    s += `<circle cx="${f(x + 10 * k)}" cy="${f(y - 150 * k)}" r="${f(70 * k)}" fill="${GLOW}"/>`;
    s += `<path d="M${f(x - 4 * k)} ${f(y - 104 * k)} q${f(14 * k)} ${f(-14 * k)} ${f(34 * k)} ${f(-4 * k)} l${f(-12 * k)} ${f(6 * k)} q${f(-10 * k)} ${f(6 * k)} ${f(-22 * k)} ${f(-2 * k)} z" fill="#C98A2A" ${OUT(2)}/><path d="M${f(x + 30 * k)} ${f(y - 110 * k)} q${f(-6 * k)} ${f(-10 * k)} 0 ${f(-20 * k)} q${f(6 * k)} ${f(10 * k)} 0 ${f(20 * k)} z" fill="#FFD36B" stroke="#E8763A" stroke-width="1.5"/>`;
    stations.innkeeper = {
      svg: s,
      box: box(x - 260 * k, y - 230 * k, x + 260 * k, y + 40 * k),
      // Level with the slate's plaque, to its left, so neither covers the other.
      plaque: { x: x - 30, y: 525 },
    };
  }
  // the fountain (listening): an eight-sided basin in the middle of the courtyard
  {
    const X = 0.3;
    const Z = 2.35;
    const k = sz(Z);
    const r = 0.22;
    const hgt = 0.07;
    const ring = (rr: number, yy: number) =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        return P(X + rr * Math.cos(a), yy, Z + rr * Math.sin(a));
      });
    const top = ring(r, G + hgt);
    const bot = ring(r, G);
    let s = `<path d="${poly(ring(r + 0.06, G))}" fill="#2A1610" opacity=".3" filter="url(#khan-b6)"/>`;
    s += `<path d="${poly(top)}" fill="${lit(PLASTER, 0.2)}" ${OUT(3)}/>`;
    s += `<path d="${poly(ring(r - 0.03, G + hgt))}" fill="${lin([
      [0, '#5AA9B5'],
      [1, '#2E7A8A'],
    ])}" ${OUT(2.5)}/>`;
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      const zMid = Z + r * Math.sin(((i + 0.5) / 8) * Math.PI * 2 + Math.PI / 8);
      const a = top[i];
      const b = top[j];
      const c = bot[j];
      const d = bot[i];
      if (zMid < Z && a && b && c && d)
        s += `<path d="${poly([a, b, c, d])}" fill="${dk(PLASTER, 0.12)}" ${OUT(2.5)}/>`;
    }
    const [cx, cy] = P(X, G + hgt, Z);
    s += `<path d="M${f(cx - 14 * k)} ${f(cy)} v${f(-150 * k)} h${f(28 * k)} v${f(150 * k)} z" fill="${lit(PLASTER, 0.1)}" ${OUT(2.5)}/>`;
    s += `<ellipse cx="${f(cx)}" cy="${f(cy - 150 * k)}" rx="${f(70 * k)}" ry="${f(16 * k)}" fill="${lit(PLASTER, 0.25)}" ${OUT(2.5)}/>`;
    s += `<path d="M${f(cx)} ${f(cy - 160 * k)} v${f(-40 * k)} M${f(cx)} ${f(cy - 196 * k)} q${f(-60 * k)} ${f(-10 * k)} ${f(-74 * k)} ${f(56 * k)} M${f(cx)} ${f(cy - 196 * k)} q${f(60 * k)} ${f(-10 * k)} ${f(74 * k)} ${f(56 * k)}" stroke="#BFE6EE" stroke-width="${f(4 * k)}" fill="none" stroke-linecap="round" opacity=".9"/>`;
    const xs = [...top, ...bot].map((p) => p[0]);
    const [, fy] = P(X, G, Z - r);
    stations.fountain = {
      svg: s,
      box: box(Math.min(...xs) - 10, cy - 210 * k, Math.max(...xs) + 10, fy + 20),
      plaque: { x: cx, y: fy + 14 },
    };
  }
  // the storyteller (reading): a round rug with cushions and a book stand
  {
    const X = 0.66;
    const Z = 1.42;
    const k = sz(Z);
    const r = 0.16;
    const ell = (rr: number) =>
      Array.from({ length: 40 }, (_, i) => {
        const a = (i / 40) * Math.PI * 2;
        return P(X + rr * Math.cos(a), G, Z + rr * Math.sin(a));
      });
    let s = `<path d="${poly(ell(r))}" fill="${rad([
      [0, '#B5523C'],
      [0.7, '#8A3A2E'],
      [1, '#5A2420'],
    ])}" ${OUT(3)}/>`;
    s += `<path d="${poly(ell(r * 0.8))}" fill="none" stroke="#E8A93A" stroke-width="4" stroke-dasharray="12 9"/>`;
    for (const [dx, dz, c] of [
      [-0.09, 0.06, '#2E8FA3'],
      [0.1, 0.07, '#E8A93A'],
    ] as const) {
      const [px, py] = P(X + dx, G, Z + dz);
      s += `<ellipse cx="${f(px)}" cy="${f(py - 22 * k)}" rx="${f(70 * k)}" ry="${f(30 * k)}" fill="${c}" ${OUT(3)}/>`;
    }
    const [bx, by] = P(X, G, Z + 0.02);
    s += `<path d="M${f(bx - 50 * k)} ${f(by - 40 * k)} l${f(50 * k)} ${f(-24 * k)} l${f(50 * k)} ${f(24 * k)} l${f(-50 * k)} ${f(10 * k)} z" fill="#F3E2BC" ${OUT(2.5)}/><path d="M${f(bx)} ${f(by - 64 * k)} v${f(34 * k)}" stroke="${INK}" stroke-width="2"/>`;
    s += `<path d="M${f(bx - 30 * k)} ${f(by - 30 * k)} l${f(-14 * k)} ${f(30 * k)} M${f(bx + 30 * k)} ${f(by - 30 * k)} l${f(14 * k)} ${f(30 * k)}" stroke="#5A3420" stroke-width="${f(7 * k)}" stroke-linecap="round"/>`;
    const pts = ell(r);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    stations.storyteller = {
      svg: s,
      box: box(
        Math.min(...xs) - 10,
        Math.min(...ys) - 70 * k,
        Math.max(...xs) + 10,
        Math.max(...ys) + 10,
      ),
      plaque: { x: P(X, G, Z - r)[0], y: Math.min(...ys) - 70 * k - 70 },
    };
  }
  // the coffee corner (phrases, locked for now): a brass tray with a dallah, by the right wall
  {
    const k = sz(2.85);
    const [x, y] = P(0.84, G, 2.85);
    let s = shadow(x, y, 120 * k, 16 * k, false);
    s += `<path d="M${f(x - 70 * k)} ${f(y)} v${f(-60 * k)} M${f(x + 70 * k)} ${f(y)} v${f(-60 * k)}" stroke="#5A3420" stroke-width="${f(10 * k)}"/>`;
    s += `<ellipse cx="${f(x)}" cy="${f(y - 64 * k)}" rx="${f(110 * k)}" ry="${f(22 * k)}" fill="#E8A93A" ${OUT(3)}/>`;
    s += `<path d="M${f(x - 20 * k)} ${f(y - 70 * k)} q${f(-12 * k)} ${f(-60 * k)} ${f(10 * k)} ${f(-90 * k)} h${f(20 * k)} q${f(22 * k)} ${f(30 * k)} ${f(10 * k)} ${f(90 * k)} z" fill="${lin(
      [
        [0, '#FFD98A'],
        [1, '#9A6A20'],
      ],
      0,
      0,
      1,
      0,
    )}" ${OUT(2.5)}/>`;
    s += `<path d="M${f(x - 24 * k)} ${f(y - 130 * k)} q${f(-40 * k)} ${f(-10 * k)} ${f(-50 * k)} ${f(-40 * k)}" stroke="#C98A2A" stroke-width="${f(6 * k)}" fill="none"/>`;
    for (const dx of [40, 70])
      s += `<path d="M${f(x + dx * k)} ${f(y - 72 * k)} l${f(-8 * k)} ${f(-22 * k)} h${f(22 * k)} l${f(-6 * k)} ${f(22 * k)} z" fill="#FBF1D8" ${OUT(2)}/>`;
    stations.coffee = {
      svg: s,
      box: box(x - 130 * k, y - 180 * k, x + 130 * k, y + 20 * k),
      plaque: { x, y: y - 60 * k - 150 },
    };
  }

  // ---------- on top: lantern strings, the house banner, evening light ----------
  let front = '';
  let banner: Box = { x: 0, y: 0, w: 0, h: 0 };
  for (const [Z, hasBanner] of [
    [2.6, false],
    [1.65, true],
  ] as const) {
    const Y = 0.32;
    const k = sz(Z);
    const pts: Pt[] = Array.from({ length: 31 }, (_, i) => {
      const t = i / 30;
      return [-SIDE + 2 * SIDE * t, Y - 0.08 * Math.sin(t * Math.PI)];
    });
    front += `<path d="${line(pts.map(([X, y]) => P(X, y, Z)))}" fill="none" stroke="#3A2416" stroke-width="${f(3 * k)}"/>`;
    const colors = ['#E8763A', '#2E8FA3', '#C8553D', '#FFD36B'];
    for (let i = 2; i < 30; i += 3) {
      const p = pts[i];
      if (!p) continue;
      const [X, y] = p;
      if (hasBanner && Math.abs(X - 0.5) < 0.15) continue;
      const [lx, ly] = P(X, y, Z);
      const c = colors[((i / 3) | 0) % 4];
      front += `<circle cx="${f(lx)}" cy="${f(ly + 30 * k)}" r="${f(40 * k)}" fill="${GLOW}" opacity=".7"/>`;
      front += `<path d="M${f(lx)} ${f(ly)} v${f(10 * k)} M${f(lx - 12 * k)} ${f(ly + 14 * k)} h${f(24 * k)} l${f(6 * k)} ${f(18 * k)} l${f(-6 * k)} ${f(18 * k)} h${f(-24 * k)} l${f(-6 * k)} ${f(-18 * k)} z" fill="${c}" ${OUT(2)}/>`;
    }
    if (hasBanner) {
      const X = 0.5;
      const [tx, ty] = P(X, Y - 0.08 * Math.sin(((X + SIDE) / (2 * SIDE)) * Math.PI), Z);
      const w = 150 * k;
      const h = 360 * k;
      front += `<path d="M${f(tx - w / 2 - 10)} ${f(ty)} H${f(tx + w / 2 + 10)}" stroke="#4A2E1A" stroke-width="10" stroke-linecap="round"/>`;
      front += `<path d="M${f(tx - w / 2)} ${f(ty + 4)} H${f(tx + w / 2)} V${f(ty + h)} L${f(tx)} ${f(ty + h - 34 * k)} L${f(tx - w / 2)} ${f(ty + h)} Z" fill="${lin(
        [
          [0, lit('#C8553D', 0.1)],
          [1, dk('#C8553D', 0.4)],
        ],
        0,
        0,
        1,
        0,
      )}" ${OUT(3.5)}/>`;
      banner = { x: f(tx - w / 2), y: f(ty + 4), w: f(w), h: f(h - 34 * k) };
    }
  }
  front += `<rect width="1920" height="1080" fill="${rad(
    [
      [0, '#FFC861', 0.08],
      [0.55, '#000', 0],
      [1, '#140A10', 0.55],
    ],
    0.5,
    0.55,
    0.75,
  )}"/>`;

  const gatePts = gateArch.map(onBack());
  const gx = gatePts.map((p) => p[0]);
  const gy = gatePts.map((p) => p[1]);
  return {
    defs: defs.join(''),
    back,
    stations,
    gate: box(Math.min(...gx), Math.min(...gy), Math.max(...gx), Math.max(...gy)),
    front,
    banner,
  };
}

/** A box from its corners, rounded out to whole pixels and kept on the stage. */
function box(x0: number, y0: number, x1: number, y1: number): Box {
  const x = Math.max(0, Math.floor(x0));
  const y = Math.max(0, Math.floor(y0));
  return {
    x,
    y,
    w: Math.min(KHAN_STAGE.width, Math.ceil(x1)) - x,
    h: Math.min(KHAN_STAGE.height, Math.ceil(y1)) - y,
  };
}
