// Inside the Signal Tower (#33): the painted room behind the hall, in the city's painted style
// (ADR 0006, ADR 0025): one warm light source per lamp, ink outlines, gradients everywhere.
// Painted in the browser like the city, deterministic, at 1920×1080. The lamps on the stair
// change with progress, so they're painted by the hall itself (TowerScene); this paints the
// room, the stair and each station you can walk up to.
//
// The small helpers below mirror the city painter's (src/core/city/painter.js); that file is a
// verbatim port of the approved concept tool, so it isn't split up here.

export const TOWER_STAGE = { width: 1920, height: 1080 } as const;

export type StationId = 'lessons' | 'recognition' | 'sending' | 'radio';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PaintedStation {
  svg: string;
  box: Box;
}

export interface PaintedTower {
  defs: string;
  /** Walls, floor, stair, window, banner: everything behind the stations. */
  back: string;
  /** Each station, separately so it can be a button. */
  stations: Record<StationId, PaintedStation>;
  /** The gate at the top of the stair, shut and open. */
  gate: { shut: string; open: string; box: Box };
  /** Light falling across everything, on top. */
  front: string;
}

/** Where the stair climbs: bottom to top, through the lamps to the gate. */
export const STAIR: readonly (readonly [number, number])[] = [
  [610, 900],
  [1330, 742],
  [610, 560],
  [1300, 392],
  [960, 236],
];

/** The eight lamps, evenly spaced along the stair, bottom first. */
export function lampSpots(count = 8): { x: number; y: number }[] {
  const segs = STAIR.slice(1).map((p, i) => {
    const a = STAIR[i] ?? p;
    return { a, b: p, len: Math.hypot(p[0] - a[0], p[1] - a[1]) };
  });
  const total = segs.reduce((s, g) => s + g.len, 0);
  const spots: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    let d = total * ((i + 0.6) / (count + 0.4));
    for (const g of segs) {
      if (d <= g.len) {
        const t = d / g.len;
        spots.push({ x: g.a[0] + (g.b[0] - g.a[0]) * t, y: g.a[1] + (g.b[1] - g.a[1]) * t - 92 });
        break;
      }
      d -= g.len;
    }
  }
  return spots;
}

export const GATE = { x: 960, y: 236 } as const;
/** Where the hall writes the chapter: the scroll on the left wall. */
export const SCROLL = { x: 60, y: 170, w: 500, h: 520 } as const;
/** Where the hall writes your rank: the guild's banner on the right wall. */
export const BANNER = { x: 1480, y: 120, w: 210, h: 400 } as const;

export function paintTower(): PaintedTower {
  // ---------- helpers ----------
  let seed = 11;
  const rnd = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const R = (a: number, b: number) => a + (b - a) * rnd();
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
    const A = hex(a);
    const B = hex(b);
    return toHex(A.map((v, i) => v + ((B[i] ?? 0) - v) * t));
  };
  const INK = '#24160E';
  const WARM = '#FFE9B8';
  const SHADE = '#1C1426';
  const lit = (c: string, t: number) => mix(c, WARM, t);
  const dk = (c: string, t: number) => mix(c, SHADE, t);
  const OUT = (w = 3) =>
    `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

  type Pt = readonly [number, number];
  /** Hand-drawn polygon: rounded corners, slightly bowed edges. */
  function soft(pts: readonly Pt[], r = 6, bow = 1.2) {
    const n = pts.length;
    const corners = pts.map((b, i) => {
      const a = pts[(i - 1 + n) % n] ?? b;
      const c = pts[(i + 1) % n] ?? b;
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]) || 1;
      const r1 = Math.min(r, l1 / 2.2);
      const r2 = Math.min(r, l2 / 2.2);
      return {
        b,
        p: [b[0] + ((a[0] - b[0]) / l1) * r1, b[1] + ((a[1] - b[1]) / l1) * r1] as Pt,
        q: [b[0] + ((c[0] - b[0]) / l2) * r2, b[1] + ((c[1] - b[1]) / l2) * r2] as Pt,
      };
    });
    let d = '';
    corners.forEach((c, i) => {
      if (i === 0) d += `M${f(c.p[0])} ${f(c.p[1])}`;
      else {
        const prev = corners[i - 1]?.q ?? c.p;
        d += ` Q${f((prev[0] + c.p[0]) / 2 + R(-bow, bow))} ${f((prev[1] + c.p[1]) / 2 + R(-bow, bow))} ${f(c.p[0])} ${f(c.p[1])}`;
      }
      d += ` Q${f(c.b[0])} ${f(c.b[1])} ${f(c.q[0])} ${f(c.q[1])}`;
    });
    const last = corners[n - 1]?.q;
    const first = corners[0]?.p;
    if (last && first)
      d += ` Q${f((last[0] + first[0]) / 2)} ${f((last[1] + first[1]) / 2)} ${f(first[0])} ${f(first[1])}`;
    return d + ' Z';
  }

  const defs: string[] = [];
  let uid = 0;
  type Stop = readonly [number, string, number?];
  const stops = (s: readonly Stop[]) =>
    s
      .map(
        ([o, c, a = 1]) =>
          `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ''}></stop>`,
      )
      .join('');
  function lin(s: readonly Stop[], x1 = 0, y1 = 0, x2 = 0, y2 = 1, extra = '') {
    const i = `tw-g${++uid}`;
    defs.push(
      `<linearGradient id="${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${extra}>${stops(s)}</linearGradient>`,
    );
    return `url(#${i})`;
  }
  function rad(s: readonly Stop[], cx = 0.5, cy = 0.5, r = 0.5, extra = '') {
    const i = `tw-r${++uid}`;
    defs.push(
      `<radialGradient id="${i}" cx="${cx}" cy="${cy}" r="${r}"${extra}>${stops(s)}</radialGradient>`,
    );
    return `url(#${i})`;
  }
  defs.push(
    `<filter id="tw-b3" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"></feGaussianBlur></filter>`,
    `<filter id="tw-b8" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"></feGaussianBlur></filter>`,
    `<filter id="tw-b24" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="24"></feGaussianBlur></filter>`,
    `<filter id="tw-stone" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".03 .05" numOctaves="3" seed="9"></feTurbulence><feColorMatrix type="matrix" values="0 0 0 0 .2  0 0 0 0 .14  0 0 0 0 .12  0 0 0 1.2 -.5"></feColorMatrix></filter>`,
  );
  const GLOW = rad([
    [0, '#FFE7A0', 0.9],
    [0.4, '#FFC861', 0.4],
    [1, '#FFB347', 0],
  ]);
  const contact = (cx: number, y: number, rx: number, op = 0.5) =>
    `<ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * 0.1 + 4)}" fill="#120A08" opacity="${op}" filter="url(#tw-b3)"></ellipse>`;

  // ---------- the wall: the inside of a round stone tower ----------
  // Columns of blocks follow the curve: narrow at the sides, wide in the middle.
  const CX = 960;
  const RADIUS = 1180;
  const FLOOR_MID = 900; // where the wall meets the floor, straight ahead
  const floorAt = (x: number) => {
    const s = (x - CX) / RADIUS;
    return FLOOR_MID + 210 * (1 - Math.sqrt(Math.max(0, 1 - s * s)));
  };
  let back = '';
  back += `<rect width="1920" height="1080" fill="${lin([
    [0, '#2B2340'],
    [0.5, '#4A3B4A'],
    [1, '#5C4636'],
  ])}"></rect>`;
  // stone blocks
  const STONE = ['#6E5E5A', '#75645C', '#665858', '#7B6A5E', '#6A5C5E'];
  const ROW = 50;
  for (let row = 0, y = 70; y < 1000; row++, y += ROW) {
    const off = row % 2 ? 0.5 : 0;
    const n = 24;
    for (let k = -1; k < n; k++) {
      const a0 = -1.32 + ((k + off) / n) * 2.64;
      const a1 = a0 + 2.64 / n;
      const x0 = CX + Math.sin(Math.max(-1.32, a0)) * RADIUS * 0.9;
      const x1 = CX + Math.sin(Math.min(1.32, a1)) * RADIUS * 0.9;
      if (x1 - x0 < 4) continue;
      const mid = (a0 + a1) / 2;
      const shade = 0.12 + 0.62 * Math.abs(Math.sin(mid)) ** 1.6;
      const height = y < 260 ? 0.25 * (1 - (y - 70) / 190) : 0;
      const base = STONE[Math.floor(rnd() * STONE.length)] ?? '#6E5E5A';
      const c = dk(lit(base, 0.12 * (y / 1000)), Math.min(0.85, shade + height));
      back += `<path d="${soft(
        [
          [x0 + 2, y + 2],
          [x1 - 2, y + 2],
          [x1 - 2, y + ROW - 2],
          [x0 + 2, y + ROW - 2],
        ],
        5,
        1.4,
      )}" fill="${c}" stroke="#1A1018" stroke-opacity=".55" stroke-width="2.5"></path>`;
      if (rnd() > 0.7)
        back += `<path d="M${f(x0 + 8)} ${f(y + 8)} H${f(x0 + (x1 - x0) * 0.5)}" stroke="#FFFFFF" stroke-opacity=".08" stroke-width="3" stroke-linecap="round"></path>`;
    }
  }
  back += `<rect width="1920" height="1080" filter="url(#tw-stone)" opacity=".5"></rect>`;
  // the ceiling: a ring of beams, dark
  // (it reaches far above the stage: tall windows show more of it)
  back += `<path d="M0 -900 H1920 V96 Q960 150 0 96 Z" fill="${lin([
    [0, '#120C18'],
    [0.8, '#1A1220'],
    [1, '#33241E'],
  ])}"></path>`;
  for (let i = 0; i < 9; i++) {
    const x = 100 + i * 215;
    const curve = 96 + 54 * Math.sin((x / 1920) * Math.PI);
    back += `<path d="${soft(
      [
        [x - 24, -900],
        [x + 24, -900],
        [x + 20, curve + 8],
        [x - 20, curve + 8],
      ],
      4,
      1,
    )}" fill="${lin(
      [
        [0, '#5A3A24'],
        [1, '#2E1C14'],
      ],
      0,
      0,
      1,
      0,
    )}" ${OUT(3)}></path>`;
    back += `<rect x="${x - 24}" y="-900" width="48" height="${f(curve + 908)}" fill="${lin([
      [0, '#000000', 0.6],
      [0.9, '#000000', 0],
    ])}"></rect>`;
  }
  back += `<path d="M0 96 Q960 150 1920 96 L1920 118 Q960 172 0 118 Z" fill="${lin([
    [0, '#6B4528'],
    [1, '#3A2416'],
  ])}" ${OUT(3)}></path>`;

  // the questline's scroll, hung on the left wall: the hall writes the chapter onto it
  {
    const x = SCROLL.x;
    const y = SCROLL.y;
    const w = SCROLL.w;
    const h = SCROLL.h;
    back += `<path d="M${x + 30} ${y + 30} L${x + w - 10} ${y + 40} L${x + w + 10} ${y + h + 40} L${x + 50} ${y + h + 30} Z" fill="#120A10" opacity=".45" filter="url(#tw-b8)"></path>`;
    back += `<path d="M${x + w / 2} ${y - 46} L${x + 30} ${y - 4} M${x + w / 2} ${y - 46} L${x + w - 30} ${y - 4}" stroke="#3A2A20" stroke-width="4"></path>`;
    back += `<circle cx="${x + w / 2}" cy="${y - 48}" r="8" fill="#7A6A60" ${OUT(2.5)}></circle>`;
    back += `<path d="${soft(
      [
        [x + 6, y],
        [x + w - 6, y],
        [x + w - 14, y + h * 0.5],
        [x + w - 4, y + h],
        [x + 4, y + h],
        [x + 14, y + h * 0.5],
      ],
      10,
      2,
    )}" fill="${lin([
      [0, '#F6E6C2'],
      [0.6, '#EBD3A2'],
      [1, '#D8B87E'],
    ])}" ${OUT(3.5)}></path>`;
    back += `<path d="M${x + 24} ${y + 14} H${x + w - 24} M${x + 24} ${y + h - 14} H${x + w - 24}" stroke="#B5523C" stroke-width="3" opacity=".6"></path>`;
    for (const yy of [y - 4, y + h + 4]) {
      back += `<rect x="${x - 18}" y="${yy - 14}" width="${w + 36}" height="28" rx="14" fill="${lin(
        [
          [0, '#9A6438'],
          [1, '#4A2C18'],
        ],
      )}" ${OUT(3)}></rect>`;
      back += `<circle cx="${x - 18}" cy="${yy}" r="13" fill="#E8A93A" ${OUT(2.5)}></circle><circle cx="${x + w + 18}" cy="${yy}" r="13" fill="#E8A93A" ${OUT(2.5)}></circle>`;
    }
  }

  // the guild's banner, right wall: the hall writes your rank on it
  {
    const x = BANNER.x + BANNER.w / 2;
    const y = BANNER.y;
    const half = BANNER.w / 2;
    const teal = '#2E8FA3';
    back += `<path d="M${x - half - 10} ${y} H${x + half + 10}" stroke="#4A2E1A" stroke-width="12" stroke-linecap="round"></path>`;
    back += `<circle cx="${x - half - 16}" cy="${y}" r="11" fill="#E8A93A" ${OUT(2.5)}></circle><circle cx="${x + half + 16}" cy="${y}" r="11" fill="#E8A93A" ${OUT(2.5)}></circle>`;
    back += `<path d="M${x - half + 20} ${y + 30} L${x + half + 30} ${y + 40} L${x + half + 40} ${y + BANNER.h + 20} L${x + 30} ${y + BANNER.h - 20} Z" fill="#120A10" opacity=".4" filter="url(#tw-b8)"></path>`;
    back += `<path d="M${x - half} ${y + 4} H${x + half} V${y + BANNER.h} L${x} ${y + BANNER.h - 46} L${x - half} ${y + BANNER.h} Z" fill="${lin(
      [
        [0, lit(teal, 0.12)],
        [0.5, teal],
        [1, dk(teal, 0.45)],
      ],
      0,
      0,
      1,
      0,
    )}" ${OUT(3.5)}></path>`;
    back += `<path d="M${x - half + 12} ${y + 18} H${x + half - 12} M${x - half + 12} ${y + BANNER.h - 70} L${x} ${y + BANNER.h - 112} L${x + half - 12} ${y + BANNER.h - 70}" stroke="#E8A93A" stroke-width="4" fill="none"></path>`;
    // the guild's mark: a lamp, a dot and a dash
    back += `<circle cx="${x}" cy="${y + 66}" r="28" fill="#FFD36B" ${OUT(3)}></circle>`;
    back += `<path d="M${x - 11} ${y + 50} h22 v32 h-22 z" fill="#3A2416"></path><circle cx="${x}" cy="${y + 65}" r="7" fill="#FFE9B8"></circle>`;
  }

  // the floor: worn boards, curving with the tower
  {
    let floor = `M0 ${f(floorAt(0))}`;
    for (let x = 0; x <= 1920; x += 40) floor += ` L${x} ${f(floorAt(x))}`;
    floor += ' L1920 1080 L0 1080 Z';
    back += `<path d="${floor}" fill="${lin([
      [0, '#5A3A26'],
      [0.4, '#6E4A2E'],
      [1, '#3A2416'],
    ])}"></path>`;
    for (let i = -14; i <= 14; i++) {
      const x0 = CX + i * 70;
      const y0 = floorAt(x0);
      const x1 = CX + i * 210;
      back += `<path d="M${f(x0)} ${f(y0)} L${f(x1)} 1080" stroke="#2A170C" stroke-opacity=".5" stroke-width="3"></path>`;
    }
    for (let y = 940; y < 1080; y += 46)
      back += `<path d="M0 ${y + 30} Q960 ${y - 10} 1920 ${y + 30}" stroke="#2A170C" stroke-opacity=".2" stroke-width="2" fill="none"></path>`;
    let skirt = `M0 ${f(floorAt(0))}`;
    for (let x = 0; x <= 1920; x += 40) skirt += ` L${x} ${f(floorAt(x))}`;
    back += `<path d="${skirt}" fill="none" stroke="#1A1018" stroke-width="8" stroke-opacity=".7"></path>`;
    // a round rug in the middle, where the light falls
    back += `<ellipse cx="960" cy="985" rx="300" ry="58" fill="${rad([
      [0, '#B5523C'],
      [0.7, '#8A3A2E'],
      [1, '#5A2420'],
    ])}" ${OUT(3)}></ellipse>`;
    back += `<ellipse cx="960" cy="985" rx="250" ry="44" fill="none" stroke="#E8A93A" stroke-width="5" stroke-dasharray="14 10"></ellipse>`;
    back += `<ellipse cx="960" cy="985" rx="120" ry="20" fill="none" stroke="#E8A93A" stroke-width="4"></ellipse>`;
  }

  // ---------- the stair: stone steps built out from the wall ----------
  {
    const DEPTH = 34; // how far the treads stand out
    let stair = '';
    for (let s = 0; s < STAIR.length - 1; s++) {
      const a = STAIR[s];
      const b = STAIR[s + 1];
      if (!a || !b) continue;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const steps = Math.round(len / 34);
      const dx = (b[0] - a[0]) / steps;
      const dy = (b[1] - a[1]) / steps;
      // the underside, in shadow, then each tread
      stair += `<path d="M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${b[0]} ${b[1] + 52} L${a[0]} ${a[1] + 52} Z" fill="${dk('#5A4A44', 0.35)}" ${OUT(3)}></path>`;
      for (let i = 0; i < steps; i++) {
        const x = a[0] + dx * i;
        const y = a[1] + dy * i;
        const top = lit('#A89880', 0.15 + 0.2 * (1 - Math.abs((x - CX) / 900)));
        stair += `<path d="${soft(
          [
            [x, y - DEPTH * 0.3],
            [x + dx, y + dy - DEPTH * 0.3],
            [x + dx, y + dy + 2],
            [x, y + 2],
          ],
          3,
          0.6,
        )}" fill="${top}" stroke="${INK}" stroke-width="2.2"></path>`;
        stair += `<path d="M${f(x)} ${f(y + 2)} L${f(x + dx)} ${f(y + dy + 2)} L${f(x + dx)} ${f(y + dy + 16)} L${f(x)} ${f(y + 16)} Z" fill="${dk('#8A7A68', 0.25)}" stroke="${INK}" stroke-width="2"></path>`;
      }
      // the stair's shadow on the wall below it
      stair += `<path d="M${a[0]} ${a[1] + 52} L${b[0]} ${b[1] + 52} L${b[0] + 30} ${b[1] + 110} L${a[0] + 30} ${a[1] + 110} Z" fill="#120A10" opacity=".35" filter="url(#tw-b8)"></path>`;
    }
    // landings at each turn
    for (const [x, y] of STAIR.slice(1, -1)) {
      stair += `<path d="${soft(
        [
          [x - 60, y - 14],
          [x + 60, y - 14],
          [x + 60, y + 40],
          [x - 60, y + 40],
        ],
        6,
        1,
      )}" fill="${dk('#8A7A68', 0.2)}" ${OUT(3)}></path>`;
      stair += `<path d="M${x - 60} ${y - 14} H${x + 60} V${y - 2} H${x - 60} Z" fill="${lit('#A89880', 0.2)}" ${OUT(2.5)}></path>`;
    }
    back += stair;
  }

  // ---------- stations ----------
  const stations = {} as Record<StationId, PaintedStation>;

  // The listening desk (lessons): a writing desk with a brass sounder, headphones and a copy pad.
  {
    const x = 130;
    const y = 780; // desk top
    let o = contact(x + 210, 1000, 230);
    const wood = lin(
      [
        [0, '#9A6438'],
        [0.5, '#7A4A28'],
        [1, '#4A2C18'],
      ],
      0,
      0,
      1,
      0,
    );
    // legs
    for (const lx of [x + 30, x + 390]) {
      o += `<path d="M${lx} ${y + 30} h26 l-4 ${200 - 30} h-18 z" fill="${wood}" ${OUT(3)}></path>`;
    }
    o += `<path d="M${x + 40} ${y + 40} H${x + 400} V${y + 120} H${x + 40} Z" fill="${dk('#7A4A28', 0.25)}" ${OUT(3)}></path>`;
    o += `<path d="M${x + 180} ${y + 66} h80" stroke="#E8A93A" stroke-width="6" stroke-linecap="round"></path>`;
    // top
    o += `<path d="${soft(
      [
        [x, y],
        [x + 440, y],
        [x + 450, y + 34],
        [x - 10, y + 34],
      ],
      6,
      1,
    )}" fill="${lin([
      [0, '#B07A48'],
      [1, '#6A3E22'],
    ])}" ${OUT(3.5)}></path>`;
    // copy pad with dots and dashes
    o += `<path d="${soft(
      [
        [x + 40, y - 6],
        [x + 170, y - 10],
        [x + 176, y + 12],
        [x + 34, y + 16],
      ],
      3,
      0.5,
    )}" fill="#F3E2BC" ${OUT(2.5)}></path>`;
    o += `<path d="M${x + 56} ${y + 1} h10 m8 0 h24 m8 0 h10 m14 0 h24" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"></path>`;
    // the sounder: brass on a wooden base
    const bx = x + 230;
    o += `<path d="M${bx} ${y + 2} h120 v-22 h-120 z" fill="${wood}" ${OUT(3)}></path>`;
    o += `<path d="M${bx + 20} ${y - 20} v-44 h22 v44 M${bx + 78} ${y - 20} v-44 h22 v44" fill="${lin(
      [
        [0, '#FFD98A'],
        [0.5, '#E8A93A'],
        [1, '#9A6A20'],
      ],
      0,
      0,
      1,
      0,
    )}" ${OUT(2.5)}></path>`;
    o += `<path d="M${bx + 10} ${y - 72} h106 v12 h-106 z" fill="#E8A93A" ${OUT(2.5)}></path>`;
    o += `<circle cx="${bx + 60}" cy="${y - 66}" r="6" fill="#FFF3C8" ${OUT(2)}></circle>`;
    // headphones on the desk
    o += `<path d="M${x + 380} ${y - 8} q30 -70 60 0" stroke="#3A2A2A" stroke-width="7" fill="none" stroke-linecap="round"></path>`;
    o += `<ellipse cx="${x + 380}" cy="${y - 6}" rx="12" ry="16" fill="#5A3A2A" ${OUT(2.5)}></ellipse><ellipse cx="${x + 440}" cy="${y - 6}" rx="12" ry="16" fill="#5A3A2A" ${OUT(2.5)}></ellipse>`;
    // a candle in a holder, lit
    o += `<circle cx="${x + 200}" cy="${y - 60}" r="70" fill="${GLOW}" opacity=".8"></circle>`;
    o += `<path d="M${x + 186} ${y} h28 v-6 h-28 z" fill="#E8A93A" ${OUT(2)}></path>`;
    o += `<path d="M${x + 192} ${y - 6} v-38 h16 v38 z" fill="#FBF1D8" ${OUT(2)}></path>`;
    o += `<path d="M${x + 200} ${y - 46} q-8 -12 0 -26 q8 14 0 26 z" fill="#FFD36B" stroke="#E8763A" stroke-width="2"></path>`;
    // a stool
    o += `<path d="M${x + 160} ${y + 120} h110 v16 h-110 z" fill="${wood}" ${OUT(3)}></path>`;
    o += `<path d="M${x + 172} ${y + 136} l-6 64 M${x + 258} ${y + 136} l6 64 M${x + 215} ${y + 136} v64" stroke="#4A2C18" stroke-width="9" stroke-linecap="round"></path>`;
    stations.lessons = { svg: o, box: { x: x - 30, y: y - 140, w: 520, h: 370 } };
  }

  // The signal lamp (Instant Recognition): a big shuttered lamp on a tripod, shining.
  {
    const x = 1500;
    const y = 690; // lamp centre
    let o = contact(x, 1010, 140);
    o += `<path d="M${x} ${y + 70} L${x - 110} 1004 M${x} ${y + 70} L${x + 110} 1004 M${x} ${y + 70} V1010" stroke="#3A2A20" stroke-width="12" stroke-linecap="round"></path>`;
    o += `<path d="M${x} ${y + 70} L${x - 110} 1004 M${x} ${y + 70} L${x + 110} 1004 M${x} ${y + 70} V1010" stroke="#7A5A40" stroke-width="6" stroke-linecap="round"></path>`;
    // beam
    o += `<path d="M${x - 50} ${y - 50} L${x - 520} ${y - 300} L${x - 560} ${y + 40} L${x - 50} ${y + 50} Z" fill="${lin(
      [
        [0, '#FFE9B8', 0],
        [1, '#FFE9B8', 0.4],
      ],
      0,
      0,
      1,
      0,
    )}" filter="url(#tw-b8)"></path>`;
    // body
    o += `<path d="${soft(
      [
        [x - 70, y - 70],
        [x + 80, y - 76],
        [x + 86, y + 76],
        [x - 70, y + 70],
      ],
      12,
      1.5,
    )}" fill="${lin(
      [
        [0, '#5A6A6A'],
        [0.5, '#3A4848'],
        [1, '#1E2828'],
      ],
      0,
      0,
      1,
      0,
    )}" ${OUT(3.5)}></path>`;
    o += `<path d="M${x - 30} ${y - 76} v-26 h60 v26" fill="#3A4848" ${OUT(3)}></path>`;
    o += `<path d="M${x - 40} ${y - 104} h80" stroke="${INK}" stroke-width="8" stroke-linecap="round"></path>`;
    // lens with shutters
    o += `<circle cx="${x - 60}" cy="${y}" r="62" fill="${rad(
      [
        [0, '#FFFBE6'],
        [0.45, '#FFE39A'],
        [1, '#E8A93A'],
      ],
      0.4,
      0.4,
      0.6,
    )}" ${OUT(4)}></circle>`;
    o += `<circle cx="${x - 60}" cy="${y}" r="120" fill="${GLOW}"></circle>`;
    for (let i = -2; i <= 2; i++)
      o += `<path d="M${x - 118} ${y + i * 22} H${x - 2}" stroke="#2A3434" stroke-width="7" stroke-linecap="round" opacity=".85"></path>`;
    o += `<circle cx="${x - 60}" cy="${y}" r="62" fill="none" stroke="#C9A050" stroke-width="7"></circle>`;
    o += `<circle cx="${x - 60}" cy="${y}" r="62" fill="none" ${OUT(3)}></circle>`;
    // handle
    o += `<path d="M${x + 86} ${y - 20} q40 0 40 30 q0 30 -40 30" stroke="#E8A93A" stroke-width="8" fill="none" stroke-linecap="round"></path>`;
    stations.recognition = { svg: o, box: { x: x - 200, y: y - 140, w: 360, h: 400 } };
  }

  // The telegraph table (sending): a straight key under a dust sheet, roped off for now.
  {
    const x = 1090;
    const y = 870;
    let o = contact(x + 120, 1036, 170);
    o += `<path d="M${x} ${y} h240 l12 30 h-264 z" fill="${lin([
      [0, '#9A6438'],
      [1, '#5A3420'],
    ])}" ${OUT(3)}></path>`;
    for (const lx of [x + 6, x + 220])
      o += `<path d="M${lx} ${y + 30} h16 v130 h-16 z" fill="#5A3420" ${OUT(2.5)}></path>`;
    // the sheet over the key
    o += `<path d="M${x + 20} ${y + 4} Q${x + 34} ${y - 46} ${x + 90} ${y - 52} Q${x + 170} ${y - 58} ${x + 214} ${y - 18} Q${x + 232} ${y + 4} ${x + 230} ${y + 44} L${x + 204} ${y + 34} L${x + 176} ${y + 52} L${x + 146} ${y + 36} L${x + 116} ${y + 54} L${x + 86} ${y + 36} L${x + 56} ${y + 52} L${x + 28} ${y + 38} Q${x + 14} ${y + 24} ${x + 20} ${y + 4} Z" fill="${lin(
      [
        [0, '#EADCC0'],
        [1, '#B8A88C'],
      ],
      0,
      0,
      1,
      0,
    )}" ${OUT(3)}></path>`;
    o += `<path d="M${x + 80} ${y - 44} q14 24 6 56 M${x + 150} ${y - 46} q-10 30 0 60" stroke="#8A7A60" stroke-width="2.5" fill="none"></path>`;
    // the key's knob peeking out
    o += `<ellipse cx="${x + 222}" cy="${y - 14}" rx="15" ry="9" fill="#2A1A14" ${OUT(2.5)}></ellipse>`;
    // rope barrier
    for (const px of [x - 40, x + 280]) {
      o += `<path d="M${px} 1040 V${y - 20}" stroke="#E8A93A" stroke-width="8" stroke-linecap="round"></path><circle cx="${px}" cy="${y - 24}" r="9" fill="#FFD36B" ${OUT(2.5)}></circle>`;
    }
    o += `<path d="M${x - 40} ${y - 14} Q${x + 120} ${y + 60} ${x + 280} ${y - 14}" stroke="#B5523C" stroke-width="8" fill="none" stroke-linecap="round"></path>`;
    stations.sending = { svg: o, box: { x: x - 60, y: y - 70, w: 360, h: 180 } };
  }

  // The Radio Room's door (locked): heavy planks, iron bands and a padlock.
  {
    const x = 1730;
    const y = 540;
    const w = 150;
    const h = 380;
    let o = '';
    o += `<path d="M${x - 24} ${y + h} V${y + 70} Q${x - 24} ${y - 26} ${x + w / 2} ${y - 26} Q${x + w + 24} ${y - 26} ${x + w + 24} ${y + 70} V${y + h} Z" fill="${lin(
      [
        [0, '#6A5A54'],
        [1, '#3A2E30'],
      ],
    )}" ${OUT(3.5)}></path>`;
    o += `<path d="M${x} ${y + h} V${y + 70} Q${x} ${y} ${x + w / 2} ${y} Q${x + w} ${y} ${x + w} ${y + 70} V${y + h} Z" fill="${lin(
      [
        [0, '#5A3A24'],
        [0.6, '#3E2616'],
        [1, '#2A1A10'],
      ],
      0,
      0,
      1,
      0,
    )}" ${OUT(4)}></path>`;
    for (let i = 1; i < 4; i++)
      o += `<path d="M${x + (w * i) / 4} ${y + 6} V${y + h}" stroke="${INK}" stroke-width="2.5" opacity=".6"></path>`;
    for (const by of [y + 100, y + 280])
      o += `<path d="M${x} ${by} H${x + w}" stroke="#2A2626" stroke-width="16"></path><path d="M${x} ${by - 5} H${x + w}" stroke="#5A5656" stroke-width="3"></path>`;
    // padlock
    o += `<path d="M${x + w - 50} ${y + 180} q0 -30 20 -30 q20 0 20 30" stroke="#8A8A8A" stroke-width="7" fill="none"></path>`;
    o += `<rect x="${x + w - 58}" y="${y + 178}" width="56" height="46" rx="8" fill="${lin([
      [0, '#FFD98A'],
      [1, '#9A6A20'],
    ])}" ${OUT(3)}></rect><circle cx="${x + w - 30}" cy="${y + 198}" r="6" fill="${INK}"></circle>`;
    // a sign over it: lightning between two masts
    o += `<path d="M${x + w / 2 - 34} ${y - 60} l12 -30 M${x + w / 2 + 34} ${y - 60} l-12 -30" stroke="#8A8A8A" stroke-width="5"></path>`;
    o += `<path d="M${x + w / 2 - 8} ${y - 98} l14 18 h-10 l12 20" stroke="#FFD36B" stroke-width="4" fill="none" stroke-linejoin="round"></path>`;
    o += contact(x + w / 2, y + h + 4, w * 0.7, 0.4);
    stations.radio = { svg: o, box: { x: x - 30, y: y - 110, w: w + 60, h: h + 120 } };
  }

  // ---------- the gate at the top of the stair ----------
  const gateBox = { x: GATE.x - 90, y: GATE.y - 190, w: 180, h: 200 };
  const gate = (open: boolean) => {
    const x = GATE.x;
    const y = GATE.y;
    let o = '';
    if (open)
      o += `<circle cx="${x}" cy="${y - 90}" r="190" fill="${GLOW}" class="tower__gate-glow"></circle>`;
    o += `<path d="M${x - 84} ${y} V${y - 110} Q${x - 84} ${y - 186} ${x} ${y - 186} Q${x + 84} ${y - 186} ${x + 84} ${y - 110} V${y} Z" fill="${lin(
      [
        [0, '#6A5A54'],
        [1, '#3A2E30'],
      ],
    )}" ${OUT(3.5)}></path>`;
    o += `<path d="M${x - 62} ${y} V${y - 104} Q${x - 62} ${y - 164} ${x} ${y - 164} Q${x + 62} ${y - 164} ${x + 62} ${y - 104} V${y} Z" fill="${
      open
        ? rad(
            [
              [0, '#FFF6D6'],
              [0.5, '#FFD36B'],
              [1, '#C98A2A'],
            ],
            0.5,
            0.7,
            0.8,
          )
        : '#120C10'
    }" ${OUT(3)}></path>`;
    const bar = open ? '#5A3A20' : '#7A6A60';
    for (let i = -2; i <= 2; i++)
      o += `<path d="M${x + i * 24} ${y} V${y - (i === 0 ? 164 : i % 2 ? 158 : 140)}" stroke="${bar}" stroke-width="7" stroke-linecap="round"></path>`;
    o += `<path d="M${x - 62} ${y - 70} H${x + 62}" stroke="${bar}" stroke-width="7"></path>`;
    o += `<path d="M${x - 62} ${y} V${y - 104} Q${x - 62} ${y - 164} ${x} ${y - 164} Q${x + 62} ${y - 164} ${x + 62} ${y - 104} V${y} Z" fill="none" ${OUT(3)}></path>`;
    return o;
  };

  // ---------- light ----------
  let front = '';
  // warm pool in the middle of the room, cooler at the edges (and up into the ceiling)
  front += `<rect y="-900" width="1920" height="1980" fill="${rad(
    [
      [0, '#FFC861', 0.12],
      [0.6, '#FFC861', 0],
      [1, '#0C0814', 0.6],
    ],
    960,
    670,
    1250,
    ' gradientUnits="userSpaceOnUse"',
  )}" pointer-events="none"></rect>`;

  return {
    defs: defs.join(''),
    back,
    stations,
    gate: { shut: gate(false), open: gate(true), box: gateBox },
    front,
  };
}
