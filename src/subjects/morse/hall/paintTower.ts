// Inside the Signal Tower (#33): the painted room behind the hall, in the city's painted style
// (ADR 0006, ADR 0025): one warm light source per lamp, ink outlines, gradients everywhere.
// Painted in the browser like the city, deterministic, at 1920×1080. The lamps on the stair
// change with progress, so they're painted by the hall itself (TowerScene); this paints the
// room, the stair and each station you can walk up to.
//
// The small helpers below mirror the city painter's (src/core/city/painter.js); that file is a
// verbatim port of the approved concept tool, so it isn't split up here.

export const TOWER_STAGE = { width: 1920, height: 1080 } as const;

export type StationId = 'lessons' | 'codebook' | 'recognition' | 'sending' | 'radio';

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

// ---------- the room in perspective ----------
// The tower is a cylinder of radius 1, seen from a little outside its open front (a stage
// cut-away): the back wall is far and small, the sides near and big, the floor and ceiling
// converge. Every wall, stair and door point goes through `project`, which is what gives the
// room its depth.
const VIEW = 1.2; // how far the eye stands from the tower's centre
const FOCAL = 1576;
const HORIZON = 540;
const MID = 960;
/** World heights (eye level is 0): the floor, the top of the wall. */
export const FLOOR_Y = -0.5;
export const TOP_Y = 0.544;

/** A point on a ring of radius `r` at angle `theta` (0 = straight ahead), at height `y`. */
export function project(theta: number, y: number, r = 1): [number, number] {
  const z = r * Math.cos(theta) + VIEW;
  return [MID + (FOCAL * r * Math.sin(theta)) / z, HORIZON - (FOCAL * y) / z];
}

/** The stair's turns, bottom to top: [angle, height]. It ends at the gate, straight ahead. */
export const FLIGHTS: readonly (readonly [number, number])[] = [
  [-0.48, FLOOR_Y],
  [0.52, -0.27],
  [-0.5, -0.04],
  [0.5, 0.19],
  [0, 0.424],
];
/** How far the steps stand out from the wall. */
const TREAD = 0.11;

/** Where the stair climbs on screen: along the front edge of the treads, bottom to top. */
export const STAIR: readonly (readonly [number, number])[] = FLIGHTS.slice(1).flatMap((b, i) => {
  const a = FLIGHTS[i] ?? b;
  return Array.from({ length: i === FLIGHTS.length - 2 ? 13 : 12 }, (_, k) => {
    const t = k / 12;
    return project(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 1 - TREAD / 2);
  });
});

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
  const P = project;
  /** A patch of wall between two angles and two heights, as a polygon (curved edges sampled). */
  const patch = (t0: number, t1: number, y0: number, y1: number, r = 1, n = 2): Pt[] => {
    const top: Pt[] = [];
    const bottom: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const t = t0 + ((t1 - t0) * i) / n;
      top.push(P(t, y1, r));
      bottom.unshift(P(t, y0, r));
    }
    return [...top, ...bottom];
  };
  const poly = (pts: readonly Pt[]) =>
    'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + ' Z';
  const SPAN = 1.32; // the wall's angles reach past the stage's sides
  let back = '';
  back += `<rect y="-900" width="1920" height="1980" fill="${lin([
    [0, '#120C18'],
    [0.5, '#2B2340'],
    [1, '#5C4636'],
  ])}"></rect>`;
  // stone blocks: courses curve with the wall, near blocks big, far ones small
  const STONE = ['#6E5E5A', '#75645C', '#665858', '#7B6A5E', '#6A5C5E'];
  const COURSE = 0.058;
  const COL = 0.1;
  for (let row = 0, y = FLOOR_Y; y < TOP_Y; row++, y += COURSE) {
    const off = row % 2 ? COL / 2 : 0;
    const yTop = Math.min(TOP_Y, y + COURSE);
    for (let t = -SPAN - off; t < SPAN; t += COL) {
      const t0 = Math.max(-SPAN, t);
      const t1 = Math.min(SPAN, t + COL);
      if (t1 - t0 < 0.01) continue;
      const g = 0.006;
      const pts = patch(t0 + g, t1 - g, y + g, yTop - g);
      const mid = (t0 + t1) / 2;
      // nearer (the sides) is darker, out of the lamps' light; up high is darker too
      const shade =
        0.14 + 0.55 * Math.abs(Math.sin(mid)) ** 1.5 + 0.3 * Math.max(0, y / TOP_Y) ** 2;
      const base = STONE[Math.floor(rnd() * STONE.length)] ?? '#6E5E5A';
      const c = dk(lit(base, 0.14 * (1 - Math.abs(mid))), Math.min(0.88, shade));
      back += `<path d="${soft(pts, 5, 1.2)}" fill="${c}" stroke="#1A1018" stroke-opacity=".55" stroke-width="2.5"></path>`;
      if (rnd() > 0.7) {
        const [a, b] = [P(t0 + 0.02, yTop - 0.015), P(t0 + (t1 - t0) * 0.55, yTop - 0.015)];
        back += `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" stroke="#FFFFFF" stroke-opacity=".08" stroke-width="3" stroke-linecap="round"></path>`;
      }
    }
  }
  back += `<rect width="1920" height="1080" filter="url(#tw-stone)" opacity=".45"></rect>`;
  // the wall turns away into shadow at both sides
  back += `<rect y="-900" width="1920" height="1980" fill="${lin(
    [
      [0, '#0C0814', 0.75],
      [0.2, '#0C0814', 0.15],
      [0.5, '#0C0814', 0],
      [0.8, '#0C0814', 0.15],
      [1, '#0C0814', 0.75],
    ],
    0,
    0,
    1,
    0,
  )}"></rect>`;

  // the ceiling: beams radiating from a hub over the middle of the tower
  {
    const CEIL = TOP_Y + 0.07;
    const hub = P(0, CEIL, 0);
    back += `<path d="${poly([[0, -900], [1920, -900], ...patch(-SPAN, SPAN, TOP_Y, TOP_Y, 1, 24).slice(0, 25).reverse()])}" fill="${lin(
      [
        [0, '#0E0912'],
        [0.75, '#1A1220'],
        [1, '#2E2020'],
      ],
    )}"></path>`;
    // boards between the beams, rings around the hub
    for (const r of [0.25, 0.45, 0.65, 0.85]) {
      let d = '';
      for (let i = 0; i <= 24; i++) {
        const [x, y] = P(-SPAN + (2 * SPAN * i) / 24, CEIL, r);
        d += `${i ? ' L' : 'M'}${f(x)} ${f(y)}`;
      }
      back += `<path d="${d}" stroke="#000000" stroke-opacity=".35" stroke-width="3" fill="none"></path>`;
    }
    for (let i = -4; i <= 4; i++) {
      const t = i * 0.3;
      const w = 0.035;
      const bottom = CEIL - 0.035;
      const face: Pt[] = [
        P(t - w, bottom),
        P(t + w, bottom),
        P(t + w * 0.2, bottom, 0.1),
        P(t - w * 0.2, bottom, 0.1),
      ];
      // the beam's side, facing the middle, then its underside
      const sideFace: Pt[] = [
        P(t + (t > 0 ? -w : w), bottom),
        P(t + (t > 0 ? -w : w), CEIL),
        [hub[0], hub[1]],
        P(t + (t > 0 ? -w : w) * 0.2, bottom, 0.1),
      ];
      back += `<path d="${soft(sideFace, 3, 0.5)}" fill="#2A1A12" ${OUT(2.5)}></path>`;
      back += `<path d="${soft(face, 3, 0.5)}" fill="${lin([
        [0, '#2E1C14'],
        [1, '#6A4628'],
      ])}" ${OUT(3)}></path>`;
    }
    back += `<circle cx="${f(hub[0])}" cy="${f(hub[1])}" r="46" fill="#3A2416" ${OUT(3)}></circle>`;
    back += `<circle cx="${f(hub[0])}" cy="${f(hub[1])}" r="20" fill="#E8A93A" ${OUT(2.5)}></circle>`;
    // the wall plate: a heavy ring beam on top of the stones
    const ring = [...patch(-SPAN, SPAN, TOP_Y - 0.035, TOP_Y + 0.02, 1, 30)];
    back += `<path d="${poly(ring)}" fill="${lin([
      [0, '#7A5030'],
      [1, '#3A2416'],
    ])}" ${OUT(3)}></path>`;
    const under = patch(-SPAN, SPAN, TOP_Y - 0.06, TOP_Y - 0.035, 1, 30);
    back += `<path d="${poly(under)}" fill="#120A10" opacity=".45" filter="url(#tw-b3)"></path>`;
  }

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

  // the floor: boards running back to the far wall, so they converge
  {
    const edge = patch(-SPAN, SPAN, FLOOR_Y, FLOOR_Y, 1, 40).slice(0, 41);
    const floorPath = poly([...edge, [1920 + 200, 1080], [-200, 1080]]);
    defs.push(`<clipPath id="tw-floor"><path d="${floorPath}"></path></clipPath>`);
    back += `<path d="${floorPath}" fill="${lin([
      [0, '#4A3020'],
      [0.35, '#6E4A2E'],
      [1, '#4A2C18'],
    ])}"></path>`;
    let boards = '';
    // a point on the floor, by its place in the tower's plan (x across, depth back from the eye)
    const onFloor = (x: number, z: number): Pt => [
      MID + (FOCAL * x) / z,
      HORIZON - (FOCAL * FLOOR_Y) / z,
    ];
    for (let i = -16; i <= 16; i++) {
      const x = i * 0.085;
      const a = onFloor(x, Math.sqrt(Math.max(0, 1 - x * x)) + VIEW);
      const b = onFloor(x, 0.9);
      boards += `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" stroke="#2A170C" stroke-opacity=".55" stroke-width="2.5"></path>`;
    }
    // board ends, staggered
    for (let z = 2.15, k = 0; z > 1.3; z -= 0.09, k++) {
      for (let i = -16; i < 16; i++) {
        if ((i + k) % 3) continue;
        const a = onFloor(i * 0.085, z);
        const b = onFloor((i + 1) * 0.085, z);
        boards += `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" stroke="#2A170C" stroke-opacity=".45" stroke-width="2"></path>`;
      }
    }
    back += `<g clip-path="url(#tw-floor)">${boards}</g>`;
    // where the wall meets the floor: a dark seam, and the wall's shadow on the boards
    back += `<path d="${'M' + edge.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')}" fill="none" stroke="#120A10" stroke-width="22" stroke-opacity=".45" filter="url(#tw-b8)" clip-path="url(#tw-floor)"></path>`;
    back += `<path d="${'M' + edge.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')}" fill="none" stroke="#1A1018" stroke-width="6" stroke-opacity=".8"></path>`;
    // a round rug in the middle of the floor, in perspective
    const rug = (r: number) => {
      const pts: Pt[] = [];
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        pts.push(onFloor(Math.cos(a) * r, 1.72 + Math.sin(a) * r));
      }
      return poly(pts);
    };
    back += `<path d="${rug(0.32)}" fill="${rad([
      [0, '#B5523C'],
      [0.7, '#8A3A2E'],
      [1, '#5A2420'],
    ])}" ${OUT(3)}></path>`;
    back += `<path d="${rug(0.26)}" fill="none" stroke="#E8A93A" stroke-width="5" stroke-dasharray="14 10"></path>`;
    back += `<path d="${rug(0.12)}" fill="none" stroke="#E8A93A" stroke-width="4"></path>`;
  }

  // ---------- the stair: stone steps built out from the wall, climbing around it ----------
  {
    const RISE = 0.0115;
    const ROUT = 1 - TREAD;
    const SLAB = 0.06; // the stair's thickness under the steps
    let stair = '';
    for (let s = 0; s < FLIGHTS.length - 1; s++) {
      const a = FLIGHTS[s];
      const b = FLIGHTS[s + 1];
      if (!a || !b) continue;
      const steps = Math.max(4, Math.round((b[1] - a[1]) / RISE));
      const dt = (b[0] - a[0]) / steps;
      const dy = (b[1] - a[1]) / steps;
      // its shadow on the wall below it
      stair += `<path d="${poly([
        ...patch(a[0], b[0], a[1] - SLAB, a[1] - SLAB, 1, 8).slice(0, 9),
        P(b[0], b[1] - SLAB - 0.09),
        P(a[0], a[1] - SLAB - 0.09),
      ])}" fill="#120A10" opacity=".45" filter="url(#tw-b8)"></path>`;
      let profile: Pt[] = [];
      let faces = '';
      for (let i = 0; i < steps; i++) {
        const t0 = a[0] + dt * i;
        const t1 = t0 + dt;
        const y0 = a[1] + dy * i;
        const y1 = y0 + dy;
        // the riser: the step's face toward the bottom of the flight
        faces += `<path d="${poly([P(t0, y0, 1), P(t0, y1, 1), P(t0, y1, ROUT), P(t0, y0, ROUT)])}" fill="${dk('#8A7A68', 0.3)}" stroke="${INK}" stroke-width="1.6"></path>`;
        // the tread, seen from above while it's below the eye
        if (y1 < -0.01) {
          const light = 0.12 + 0.25 * (1 - Math.abs(t0));
          faces += `<path d="${poly([P(t0, y1, 1), P(t1, y1, 1), P(t1, y1, ROUT), P(t0, y1, ROUT)])}" fill="${lit('#A89880', light)}" stroke="${INK}" stroke-width="1.6"></path>`;
        }
        profile.push(P(t0, y1, ROUT), P(t1, y1, ROUT));
      }
      // the flight's face toward the room: a saw-tooth of steps on a stone slab
      profile = [
        P(a[0], a[1], ROUT),
        ...profile,
        P(b[0], b[1] - SLAB, ROUT),
        P(a[0], a[1] - SLAB, ROUT),
      ];
      // the slab's underside: seen only where the flight climbs above the eye
      const under: Pt[] = [];
      for (let k = 0; k <= 8; k++) {
        const t = a[0] + ((b[0] - a[0]) * k) / 8;
        const y = a[1] + ((b[1] - a[1]) * k) / 8 - SLAB;
        under.push(P(t, y, 1));
        under.unshift(P(t, y, ROUT));
      }
      stair += `<path d="${poly(under)}" fill="${dk('#5A4A44', 0.5)}" stroke="${INK}" stroke-width="2"></path>`;
      stair += faces;
      stair += `<path d="${poly(profile)}" fill="${lin([
        [0, dk('#8A7A68', 0.15)],
        [1, dk('#5A4A44', 0.4)],
      ])}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"></path>`;
      // a lit edge along the top of each tread
      for (let i = 0; i < steps; i++) {
        const t0 = a[0] + dt * i;
        const y1 = a[1] + dy * (i + 1);
        const p = P(t0, y1, ROUT);
        const q = P(t0 + dt, y1, ROUT);
        stair += `<path d="M${f(p[0])} ${f(p[1] + 2)} L${f(q[0])} ${f(q[1] + 2)}" stroke="#FFE9B8" stroke-opacity=".22" stroke-width="2.5"></path>`;
      }
    }
    // landings at each turn, held up by a stone corbel
    for (const [t, y] of FLIGHTS.slice(1, -1)) {
      const w = 0.075;
      stair += `<path d="${poly([P(t - 0.045, y - SLAB, ROUT), P(t + 0.045, y - SLAB, ROUT), P(t + 0.02, y - SLAB - 0.07, 1), P(t - 0.02, y - SLAB - 0.07, 1)])}" fill="${dk('#6A5A50', 0.35)}" ${OUT(2.5)}></path>`;
      stair += `<path d="${poly([P(t - w, y, 1), P(t + w, y, 1), P(t + w, y, ROUT), P(t - w, y, ROUT)])}" fill="${lit('#A89880', 0.2)}" ${OUT(2.5)}></path>`;
      stair += `<path d="${poly([P(t - w, y, ROUT), P(t + w, y, ROUT), P(t + w, y - SLAB, ROUT), P(t - w, y - SLAB, ROUT)])}" fill="${dk('#8A7A68', 0.2)}" ${OUT(3)}></path>`;
    }
    // the top landing, in front of the gate
    {
      const [t, y] = FLIGHTS[FLIGHTS.length - 1] ?? [0, 0];
      const w = 0.09;
      stair += `<path d="${poly([P(t - w, y, 1), P(t + w, y, 1), P(t + w, y, ROUT), P(t - w, y, ROUT)])}" fill="${dk('#8A7A68', 0.25)}" ${OUT(2.5)}></path>`;
      stair += `<path d="${poly([P(t - w, y, ROUT), P(t + w, y, ROUT), P(t + w, y - SLAB, ROUT), P(t - w, y - SLAB, ROUT)])}" fill="${dk('#8A7A68', 0.2)}" ${OUT(3)}></path>`;
    }
    back += stair;
  }

  // ---------- stations ----------
  const stations = {} as Record<StationId, PaintedStation>;

  // The listening desk (lessons): a writing desk with a brass sounder, headphones and a copy pad.
  {
    const x = 130;
    const y = 830; // desk top
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

  // The codebook (words, #154): a tall reading stand by the desk, the operators' codebook open on
  // it, a red ribbon hanging from its pages.
  {
    const x = 690; // centre
    const y = 884; // the book's lower edge (below the stair's first lamp)
    let o = contact(x, 1034, 96);
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
    // feet and post
    o += `<path d="M${x - 78} 1032 Q${x} 1004 ${x + 78} 1032 L${x + 66} 1040 H${x - 66} Z" fill="${dk('#7A4A28', 0.2)}" ${OUT(3)}></path>`;
    o += `<path d="M${x - 15} 1014 L${x - 11} ${y + 40} H${x + 11} L${x + 15} 1014 Z" fill="${wood}" ${OUT(3)}></path>`;
    o += `<path d="M${x - 20} ${y + 80} h40 v14 h-40 z M${x - 22} 1004 h44 v12 h-44 z" fill="#E8A93A" ${OUT(2.5)}></path>`;
    // the slanted top, seen from the front
    o += `<path d="${soft(
      [
        [x - 104, y + 30],
        [x + 104, y + 30],
        [x + 90, y - 22],
        [x - 90, y - 22],
      ],
      5,
      0.6,
    )}" fill="${lin([
      [0, '#B07A48'],
      [1, '#6A3E22'],
    ])}" ${OUT(3.5)}></path>`;
    o += `<path d="M${x - 100} ${y + 30} h200 v10 h-200 z" fill="${dk('#7A4A28', 0.35)}" ${OUT(2.5)}></path>`;
    // the open book: two pages bowing up from the spine
    const page = (side: number) =>
      `<path d="M${x} ${y + 18} Q${x + side * 40} ${y + 4} ${x + side * 92} ${y + 20} L${x + side * 80} ${y - 52} Q${x + side * 40} ${y - 66} ${x} ${y - 50} Z" fill="${lin(
        [
          [0, '#FBF1D8'],
          [1, '#E6D0A0'],
        ],
      )}" ${OUT(2.5)}></path>`;
    o += page(-1) + page(1);
    // lines of writing: words, not dots and dashes
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const ly = y - 40 + i * 13;
        const len = [52, 38, 58, 30][(i + (side > 0 ? 1 : 0)) % 4] ?? 40;
        const x0 = side < 0 ? x - 18 - len - 6 : x + 18;
        o += `<path d="M${x0} ${ly + (side < 0 ? 0 : -1)} h${len}" stroke="${INK}" stroke-opacity=".7" stroke-width="3.5" stroke-linecap="round"></path>`;
      }
    }
    o += `<path d="M${x} ${y - 50} V${y + 18}" stroke="${INK}" stroke-width="2.5"></path>`;
    // the ribbon
    o += `<path d="M${x + 6} ${y + 16} q6 34 -2 62 l8 -8 l6 10 q6 -30 -4 -64 z" fill="#B8322A" ${OUT(2)}></path>`;
    stations.codebook = { svg: o, box: { x: x - 112, y: y - 90, w: 224, h: 250 } };
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

  // The Radio Room's door (locked): set deep in the curving wall, planks, iron bands, a padlock.
  {
    const TC = 1.1; // the door's angle round the wall
    const HW = 0.075;
    const SPRING = FLOOR_Y + 0.3;
    /** The door's arch outline at radius r, `grow` wider all round (for the stone frame). */
    const arch = (r: number, grow = 0): Pt[] => {
      const pts: Pt[] = [P(TC - HW - grow, FLOOR_Y, r)];
      for (let i = 0; i <= 16; i++) {
        const a = Math.PI - (i / 16) * Math.PI;
        pts.push(P(TC + Math.cos(a) * (HW + grow), SPRING + Math.sin(a) * (0.085 + grow), r));
      }
      pts.push(P(TC + HW + grow, FLOOR_Y, r));
      return pts;
    };
    const DEEP = 1.06;
    let o = '';
    o += `<path d="${soft(arch(1, 0.028), 4, 0.8)}" fill="${lin([
      [0, '#7A6A62'],
      [1, '#3A2E30'],
    ])}" ${OUT(3.5)}></path>`;
    for (let i = 1; i < 9; i++) {
      const a = Math.PI - (i / 9) * Math.PI;
      const p = P(TC + Math.cos(a) * HW, SPRING + Math.sin(a) * 0.085);
      const q = P(TC + Math.cos(a) * (HW + 0.028), SPRING + Math.sin(a) * (0.085 + 0.028));
      o += `<path d="M${f(p[0])} ${f(p[1])} L${f(q[0])} ${f(q[1])}" stroke="${INK}" stroke-width="2" opacity=".6"></path>`;
    }
    // the opening, dark, and the door set back in it
    o += `<path d="${poly(arch(1))}" fill="#120C10" ${OUT(3)}></path>`;
    defs.push(`<clipPath id="tw-door"><path d="${poly(arch(1))}"></path></clipPath>`);
    let door = `<path d="${poly(arch(DEEP))}" fill="${lin(
      [
        [0, '#2A1A10'],
        [0.35, '#5A3A24'],
        [1, '#3E2616'],
      ],
      0,
      0,
      1,
      0,
    )}" ${OUT(3)}></path>`;
    for (let i = 1; i < 4; i++) {
      const t = TC - HW + (2 * HW * i) / 4;
      const p = P(t, FLOOR_Y, DEEP);
      const q = P(t, SPRING + 0.1, DEEP);
      door += `<path d="M${f(p[0])} ${f(p[1])} L${f(q[0])} ${f(q[1])}" stroke="${INK}" stroke-width="2.5" opacity=".6"></path>`;
    }
    for (const by of [FLOOR_Y + 0.08, FLOOR_Y + 0.25]) {
      const p = P(TC - HW, by, DEEP);
      const q = P(TC + HW, by, DEEP);
      door += `<path d="M${f(p[0])} ${f(p[1])} L${f(q[0])} ${f(q[1])}" stroke="#2A2626" stroke-width="16"></path><path d="M${f(p[0])} ${f(p[1] - 5)} L${f(q[0])} ${f(q[1] - 5)}" stroke="#5A5656" stroke-width="3"></path>`;
    }
    // the deep wall's shadow falling across the door
    const jamb = [
      P(TC - HW, FLOOR_Y),
      P(TC - HW, SPRING),
      P(TC - HW + 0.03, SPRING, DEEP),
      P(TC - HW + 0.03, FLOOR_Y, DEEP),
    ];
    door += `<path d="${poly(jamb)}" fill="#0C0810" opacity=".55" filter="url(#tw-b3)"></path>`;
    // padlock
    const [lx, ly] = P(TC + 0.01, FLOOR_Y + 0.17, DEEP);
    door += `<path d="M${f(lx - 20)} ${f(ly)} q0 -30 20 -30 q20 0 20 30" stroke="#8A8A8A" stroke-width="7" fill="none"></path>`;
    door += `<rect x="${f(lx - 28)}" y="${f(ly - 2)}" width="56" height="46" rx="8" fill="${lin([
      [0, '#FFD98A'],
      [1, '#9A6A20'],
    ])}" ${OUT(3)}></rect><circle cx="${f(lx)}" cy="${f(ly + 18)}" r="6" fill="${INK}"></circle>`;
    o += `<g clip-path="url(#tw-door)">${door}</g>`;
    // a sign over it: lightning between two masts
    const [sx, sy] = P(TC, SPRING + 0.2);
    o += `<path d="M${f(sx - 34)} ${f(sy + 30)} l12 -30 M${f(sx + 34)} ${f(sy + 30)} l-12 -30" stroke="#8A8A8A" stroke-width="5"></path>`;
    o += `<path d="M${f(sx - 8)} ${f(sy - 8)} l14 18 h-10 l12 20" stroke="#FFD36B" stroke-width="4" fill="none" stroke-linejoin="round"></path>`;
    const frame = arch(1, 0.028);
    const xs = frame.map((p) => p[0]);
    const ys = [...frame.map((p) => p[1]), sy - 20];
    const box = {
      x: Math.floor(Math.min(...xs)) - 10,
      y: Math.floor(Math.min(...ys)) - 10,
      w: 0,
      h: 0,
    };
    box.w = Math.min(1920, Math.ceil(Math.max(...xs)) + 10) - box.x;
    box.h = Math.min(1080, Math.ceil(Math.max(...ys)) + 10) - box.y;
    stations.radio = { svg: o, box };
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
