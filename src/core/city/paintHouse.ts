// Your House (roadmap A2): the player's own room in the evening, in the city's painted style
// (ADR 0006, ADR 0025): ink outlines, gradients, warm light from a lantern. A bed under a
// lantern, a window onto the square at dusk with the Signal Tower's lamp, a shelf for
// trophies, a tall clothes cupboard and a travel chest. Painted in the browser, deterministic,
// at 1920×1080, with one vanishing point. It sits behind the wardrobe and the trophy wall as a
// still image (HallBackdrop), so nothing in it is a button.

import { f, INK, line, OUT, poly, type Pt } from './paintKit.ts';

export const HOUSE_STAGE = { width: 1920, height: 1080 } as const;

const PLASTER = '#D9B68C';
const WOOD = '#7A4A2A';

/** The vanishing point, and the back wall's corners. */
const VP: Pt = [960, 430];
const L = 420;
const R = 1500;
const T = 150;
const B = 720;
/** A point slid toward (t < 1) or away from (t > 1) the vanishing point. */
const toward = ([x, y]: Pt, t: number): Pt => [VP[0] + (x - VP[0]) * t, VP[1] + (y - VP[1]) * t];
/** Where the floor line through a point on the back wall's foot meets the height y. */
const floorAt = (x0: number, y: number): Pt => toward([x0, B], (y - VP[1]) / (B - VP[1]));

export function defs(): string {
  return `<defs>
<linearGradient id="hs-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B98F68"/><stop offset=".55" stop-color="${PLASTER}"/><stop offset="1" stop-color="#C79C70"/></linearGradient>
<linearGradient id="hs-side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A6446"/><stop offset="1" stop-color="#B58A62"/></linearGradient>
<linearGradient id="hs-side-r" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#7E5A3E"/><stop offset="1" stop-color="#AD8460"/></linearGradient>
<linearGradient id="hs-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6B3F22"/><stop offset="1" stop-color="#9A6238"/></linearGradient>
<linearGradient id="hs-ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3E2516"/><stop offset="1" stop-color="#6A4429"/></linearGradient>
<linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F2456"/><stop offset=".55" stop-color="#5B3F7A"/><stop offset=".85" stop-color="#E0855A"/><stop offset="1" stop-color="#F6B36A"/></linearGradient>
<linearGradient id="hs-quilt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3F7F8C"/><stop offset="1" stop-color="#265965"/></linearGradient>
<linearGradient id="hs-curtain" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7E2630"/><stop offset=".5" stop-color="#A83A3E"/><stop offset="1" stop-color="#6E1F2A"/></linearGradient>
<linearGradient id="hs-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#C98A2A"/></linearGradient>
<radialGradient id="hs-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(640 330) scale(620)"><stop offset="0" stop-color="#FFE7A0" stop-opacity=".55"/><stop offset=".45" stop-color="#FFC861" stop-opacity=".18"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient>
<radialGradient id="hs-dusk" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(960 600) scale(520 300)"><stop offset="0" stop-color="#F6B36A" stop-opacity=".22"/><stop offset="1" stop-color="#F6B36A" stop-opacity="0"/></radialGradient>
<linearGradient id="hs-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A0E1E" stop-opacity="0"/><stop offset="1" stop-color="#1A0E1E" stop-opacity=".35"/></linearGradient>
<clipPath id="hs-pane"><path d="M800 600 L800 340 A160 160 0 0 1 1120 340 L1120 600 Z"/></clipPath>
</defs>`;
}

/** The room's styles (the-home.md §7): the wallpaper and the floor are styles, not pieces. */
export const WALLPAPERS = ['plaster', 'sea-wash', 'rose-stripe', 'zellige'] as const;
export const FLOORS = ['planks', 'terracotta', 'flagstone', 'dark-oak'] as const;
export interface RoomStyle {
  wallpaper: (typeof WALLPAPERS)[number];
  floor: (typeof FLOORS)[number];
}
const PLAIN: RoomStyle = { wallpaper: 'plaster', floor: 'planks' };

/** Each wallpaper's back wall (top, middle, foot) and side walls (far, near). */
const WALL_COLORS = {
  plaster: null,
  'sea-wash': {
    back: ['#7FA39E', '#A9CBC4', '#8DB2AB'],
    left: ['#5E7F7A', '#86A8A1'],
    right: ['#56766F', '#7FA19A'],
  },
  'rose-stripe': {
    back: ['#B98A78', '#E3B9A6', '#C99A86'],
    left: ['#8E6456', '#B98C7A'],
    right: ['#855C4F', '#B08372'],
  },
  zellige: null,
} as const;

/** Each floor's colors, back to front, and its joints. */
const FLOOR_COLORS = {
  planks: null,
  terracotta: { from: '#8A3F24', to: '#C0663E', joint: '#5E2A16' },
  flagstone: { from: '#5E5A52', to: '#9A948A', joint: '#3E3A34' },
  'dark-oak': { from: '#2E1A0E', to: '#5E3820', joint: '#1E1008' },
} as const;

/** The gradients and patterns a style adds to the house's own. */
function styleDefs({ wallpaper, floor }: RoomStyle): string {
  const grad = (id: string, [a, b, c]: readonly string[], x = false) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="${x ? 1 : 0}" y2="${x ? 0 : 1}"><stop offset="0" stop-color="${a}"/>` +
    (c
      ? `<stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>`
      : `<stop offset="1" stop-color="${b}"/>`) +
    `</linearGradient>`;
  const out: string[] = [];
  const w = WALL_COLORS[wallpaper];
  if (w)
    out.push(
      grad(`hs-wall-${wallpaper}`, w.back),
      grad(`hs-side-${wallpaper}`, w.left, true),
      grad(`hs-side-r-${wallpaper}`, [...w.right].reverse(), true),
    );
  if (wallpaper === 'rose-stripe')
    out.push(
      `<pattern id="hs-stripe" width="36" height="40" patternUnits="userSpaceOnUse"><rect width="12" height="40" fill="#FFF3E8" opacity=".22"/><rect x="18" width="3" height="40" fill="#8E2E35" opacity=".18"/></pattern>`,
    );
  if (wallpaper === 'zellige')
    out.push(
      `<pattern id="hs-zellige" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#F3E3C0"/><path d="M20 2 L38 20 L20 38 L2 20 Z" fill="#265965"/><path d="M20 10 L30 20 L20 30 L10 20 Z" fill="#3F7F8C"/><circle cx="20" cy="20" r="3.5" fill="#E0B05A"/><path d="M0 0 L6 0 L0 6 Z M40 0 L34 0 L40 6 Z M0 40 L6 40 L0 34 Z M40 40 L34 40 L40 34 Z" fill="#4E8A4A"/></pattern>`,
    );
  const fl = FLOOR_COLORS[floor];
  if (fl) out.push(grad(`hs-floor-${floor}`, [fl.from, fl.to]));
  return out.length ? `<defs>${out.join('')}</defs>` : '';
}

export function room(style: RoomStyle = PLAIN): string {
  const leftFoot = floorAt(L, 1080);
  const rightFoot = floorAt(R, 1080);
  const out: string[] = [styleDefs(style)];
  const wallFill = (id: string) =>
    WALL_COLORS[style.wallpaper] ? `url(#${id}-${style.wallpaper})` : `url(#${id})`;
  // Ceiling, side walls, back wall, floor.
  out.push(
    `<path d="${poly([
      [0, 0],
      [1920, 0],
      [R, T],
      [L, T],
    ])}" fill="url(#hs-ceil)"/>`,
  );
  out.push(
    `<path d="${poly([[0, 0], [L, T], [L, B], leftFoot, [0, 1080]])}" fill="${wallFill('hs-side')}"/>`,
  );
  out.push(
    `<path d="${poly([[1920, 0], [R, T], [R, B], rightFoot, [1920, 1080]])}" fill="${wallFill('hs-side-r')}"/>`,
  );
  out.push(
    `<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" fill="${wallFill('hs-wall')}"/>`,
  );
  if (style.wallpaper === 'rose-stripe')
    out.push(`<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" fill="url(#hs-stripe)"/>`);
  if (style.wallpaper === 'zellige')
    // A tiled dado along the foot of the back wall, under a wooden rail.
    out.push(
      `<rect x="${L}" y="560" width="${R - L}" height="${B - 560}" fill="url(#hs-zellige)" opacity=".9"/>` +
        `<rect x="${L}" y="550" width="${R - L}" height="14" fill="${WOOD}" ${OUT(2.5)}/>`,
    );
  out.push(
    `<path d="${poly([[L, B], [R, B], rightFoot, [1920, 1080], [0, 1080], leftFoot])}" fill="${FLOOR_COLORS[style.floor] ? `url(#hs-floor-${style.floor})` : 'url(#hs-floor)'}"/>`,
  );
  // Floor planks toward the vanishing point, and their joints, kept on the floor.
  const floor = poly([[L, B], [R, B], rightFoot, [1920, 1080], [0, 1080], leftFoot]);
  const planks: string[] = [];
  const across = (y: number) =>
    line([
      [0, y],
      [1920, y],
    ]);
  if (style.floor === 'planks') {
    for (let x = L - 1260; x <= R + 1260; x += 90) planks.push(line([VP, floorAt(x, 1080)]));
    for (const y of [760, 820, 905, 1010]) planks.push(across(y));
  } else if (style.floor === 'dark-oak') {
    for (let x = L - 1260; x <= R + 1260; x += 60) planks.push(line([VP, floorAt(x, 1080)]));
    for (const y of [745, 790, 850, 930, 1040]) planks.push(across(y));
  } else {
    // Square tiles in perspective: rows equal in depth, so they shrink toward the back.
    const size = style.floor === 'terracotta' ? 135 : 180;
    const rows: number[] = [];
    const step = style.floor === 'terracotta' ? 0.075 : 0.1;
    for (let k = 1; ; k++) {
      const y = VP[1] + (B - VP[1]) / (1 - k * step);
      if (y > 1080 || k * step >= 0.6) break;
      rows.push(y);
    }
    for (const y of rows) planks.push(across(y));
    if (style.floor === 'terracotta')
      for (let x = L - 1260; x <= R + 1260; x += size) planks.push(line([VP, floorAt(x, 1080)]));
    else
      // Flagstones: each row's joints offset by half a stone.
      rows.slice(0, -1).forEach((y0, i) => {
        const y1 = rows[i + 1] ?? 1080;
        for (let x = L - 1260 + (i % 2) * (size / 2); x <= R + 1260; x += size)
          planks.push(line([floorAt(x, y0), floorAt(x, y1)]));
      });
  }
  const joint = FLOOR_COLORS[style.floor]?.joint ?? '#4A2A16';
  out.push(
    `<clipPath id="hs-floorclip"><path d="${floor}"/></clipPath>` +
      `<path d="${planks.join(' ')}" clip-path="url(#hs-floorclip)" stroke="${joint}" stroke-width="2.5" opacity=".55" fill="none"/>`,
  );
  // Ceiling beams, running back to the far wall.
  for (const x of [L, 690, 960, 1230, R]) {
    const [nx] = toward([x, T], 3.2);
    out.push(
      `<path d="${poly([
        [x - 10, T],
        [x + 10, T],
        [nx + 32, -30],
        [nx - 32, -30],
      ])}" fill="#4B2D1A" ${OUT(2.5)}/>`,
    );
  }
  // Timber frame on the back wall: a top beam, corner posts and a skirting board.
  out.push(`<rect x="${L}" y="${T}" width="${R - L}" height="34" fill="${WOOD}" ${OUT()}/>`);
  out.push(`<rect x="${L - 14}" y="${T}" width="28" height="${B - T}" fill="${WOOD}" ${OUT()}/>`);
  out.push(`<rect x="${R - 14}" y="${T}" width="28" height="${B - T}" fill="${WOOD}" ${OUT()}/>`);
  out.push(
    `<rect x="${L}" y="${B - 22}" width="${R - L}" height="22" fill="#5E3820" ${OUT(2.5)}/>`,
  );
  // A post on the left wall, between the bed and the door's side.
  const post = [toward([L, T], 1.7), toward([L, B], 1.7)] as const;
  out.push(
    `<path d="${poly([
      [post[0][0] - 18, post[0][1]],
      [post[0][0] + 18, post[0][1]],
      [post[1][0] + 18, post[1][1]],
      [post[1][0] - 18, post[1][1]],
    ])}" fill="#6A3F22" ${OUT()}/>`,
  );
  return out.join('');
}

export function windowToTheSquare(): string {
  const out: string[] = [];
  const pane = 'M800 600 L800 340 A160 160 0 0 1 1120 340 L1120 600 Z';
  out.push(`<path d="${pane}" fill="url(#hs-sky)"/>`);
  // Stars, the rooftops of the square, and the Signal Tower with its lamp lit.
  const stars: Pt[] = [
    [840, 300],
    [905, 250],
    [1010, 228],
    [1075, 290],
    [870, 370],
    [1050, 345],
    [960, 300],
  ];
  const roofs =
    'M780 600 L780 520 L830 520 L830 500 L880 500 L880 530 L930 530 Q960 470 990 530 L1000 530 L1000 505 L1030 505 L1030 540 L1140 540 L1140 600 Z';
  out.push(
    `<g clip-path="url(#hs-pane)">${stars.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#FFF3C8"/>`).join('')}` +
      `<path d="M1048 600 L1052 400 L1088 400 L1092 600 Z" fill="#2B1F45"/>` +
      `<path d="M1042 400 L1070 360 L1098 400 Z" fill="#2B1F45"/>` +
      `<circle cx="1070" cy="415" r="22" fill="#FFD36B" opacity=".35"/><circle cx="1070" cy="415" r="8" fill="#FFE9A8"/>` +
      `<path d="${roofs}" fill="#33224F"/>` +
      `<rect x="842" y="545" width="10" height="14" fill="#FFC861"/><rect x="948" y="555" width="10" height="14" fill="#FFC861"/><rect x="1110" y="560" width="10" height="14" fill="#FFC861"/>` +
      `</g>`,
  );
  // The frame, its mullions and the sill.
  out.push(`<path d="${pane}" fill="none" stroke="${WOOD}" stroke-width="18"/>`);
  out.push(`<path d="${pane}" fill="none" ${OUT(4)}/>`);
  out.push(`<path d="M960 180 L960 600 M800 450 L1120 450" stroke="${WOOD}" stroke-width="10"/>`);
  out.push(
    `<path d="M960 180 L960 600 M800 450 L1120 450" stroke="${INK}" stroke-width="2" opacity=".6"/>`,
  );
  out.push(`<rect x="772" y="600" width="376" height="24" rx="4" fill="#8A5530" ${OUT()}/>`);
  // A candle on the sill.
  out.push(
    `<rect x="1090" y="566" width="16" height="34" rx="3" fill="#F3E3C0" ${OUT(2)}/>` +
      `<path d="M1098 548 Q1106 560 1098 566 Q1090 560 1098 548 Z" fill="#FFD36B" ${OUT(1.5)}/>` +
      `<circle cx="1098" cy="560" r="30" fill="#FFD36B" opacity=".18"/>`,
  );
  // Curtains, tied back.
  out.push(
    `<path d="M748 196 L812 196 Q800 380 840 470 Q790 560 806 640 L742 640 Q760 420 748 196 Z" fill="url(#hs-curtain)" ${OUT()}/>` +
      `<path d="M1172 196 L1108 196 Q1120 380 1080 470 Q1130 560 1114 640 L1178 640 Q1160 420 1172 196 Z" fill="url(#hs-curtain)" ${OUT()}/>` +
      `<rect x="730" y="186" width="460" height="14" rx="7" fill="#5E3820" ${OUT(2.5)}/>`,
  );
  return out.join('');
}

export function bed(): string {
  const back: Pt[] = [
    [470, B],
    [770, B],
  ];
  const front = back.map(([x]) => floorAt(x, 930));
  const lift = (p: Pt, h: number): Pt => [p[0], p[1] - h];
  const [bl, br] = back as [Pt, Pt];
  const [fl, fr] = front as [Pt, Pt];
  const out: string[] = [];
  // Headboard against the wall, with a carved top.
  out.push(
    `<path d="M460 ${B} L460 520 Q620 440 780 520 L780 ${B} Z" fill="#6A3F22" ${OUT()}/>` +
      `<path d="M490 ${B - 10} L490 540 Q620 478 750 540 L750 ${B - 10}" fill="none" stroke="#8A5530" stroke-width="6"/>`,
  );
  // The frame, then the mattress and quilt on top.
  out.push(
    `<path d="${poly([lift(fl, 70), lift(fr, 70), fr, fl])}" fill="#5E3820" ${OUT()}/>` +
      `<path d="${poly([lift(br, 70), lift(fr, 70), fr, br])}" fill="#4B2D1A" ${OUT()}/>`,
  );
  out.push(
    `<path d="${poly([lift(bl, 130), lift(br, 130), lift(fr, 120), lift(fl, 120)])}" fill="#EFE2C6" ${OUT()}/>`,
  );
  // The quilt covers the front two thirds, with a patchwork stitch.
  const q = (t: number, side: 0 | 1): Pt => {
    const a = side ? br : bl;
    const b = side ? fr : fl;
    return lift([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], 130 - 10 * t);
  };
  out.push(
    `<path d="${poly([q(0.32, 0), q(0.32, 1), lift(fr, 116), lift(fl, 116)])}" fill="url(#hs-quilt)" ${OUT()}/>` +
      `<path d="${poly([lift(fl, 116), lift(fr, 116), lift(fr, 64), lift(fl, 64)])}" fill="#265965" ${OUT()}/>`,
  );
  const stitch: string[] = [];
  for (const t of [0.55, 0.78]) stitch.push(line([q(t, 0), q(t, 1)]));
  for (const s of [0.33, 0.66]) {
    const a = q(0.32, 0);
    const b = q(0.32, 1);
    const c = lift(fl, 116);
    const d = lift(fr, 116);
    stitch.push(
      line([
        [a[0] + (b[0] - a[0]) * s, a[1]],
        [c[0] + (d[0] - c[0]) * s, c[1]],
      ]),
    );
  }
  out.push(
    `<path d="${stitch.join(' ')}" stroke="#F3E3C0" stroke-width="2.5" stroke-dasharray="8 7" fill="none" opacity=".7"/>`,
  );
  // A pillow by the headboard.
  out.push(
    `<path d="M520 ${B - 140} Q520 ${B - 175} 560 ${B - 172} L690 ${B - 172} Q726 ${B - 172} 722 ${B - 140} Q726 ${B - 108} 690 ${B - 110} L560 ${B - 110} Q516 ${B - 108} 520 ${B - 140} Z" fill="#F6EEDC" ${OUT()}/>`,
  );
  // Legs.
  out.push(
    `<rect x="${f(fl[0])}" y="${f(fl[1] - 8)}" width="22" height="30" fill="#4B2D1A" ${OUT(2.5)}/>` +
      `<rect x="${f(fr[0] - 22)}" y="${f(fr[1] - 8)}" width="22" height="30" fill="#4B2D1A" ${OUT(2.5)}/>`,
  );
  return out.join('');
}

export function lantern(): string {
  return (
    `<path d="M640 ${T + 34} L640 268" stroke="${INK}" stroke-width="3"/>` +
    `<path d="M612 268 L668 268 L660 286 L620 286 Z" fill="#3E2516" ${OUT(2.5)}/>` +
    `<path d="M620 286 L660 286 L666 352 L614 352 Z" fill="#FFD36B" ${OUT(2.5)}/>` +
    `<path d="M640 286 L640 352" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M608 352 L672 352 L664 366 L616 366 Z" fill="#3E2516" ${OUT(2.5)}/>` +
    `<circle cx="640" cy="322" r="12" fill="#FFF3C8"/>`
  );
}

export function pictureOverTheBed(): string {
  // A small framed map of the city's roads, the traveler's first keepsake.
  return (
    `<rect x="470" y="300" width="120" height="96" rx="4" fill="#5E3820" ${OUT()}/>` +
    `<rect x="482" y="312" width="96" height="72" fill="#EAD7AE"/>` +
    `<path d="M490 370 Q520 330 548 352 T572 322" stroke="#8A5530" stroke-width="3" fill="none" stroke-dasharray="6 5"/>` +
    `<circle cx="572" cy="322" r="5" fill="#B5432F"/>`
  );
}

export function shelf(): string {
  const out: string[] = [];
  // Two planks on brackets: trophies above, books and a jar below.
  for (const y of [360, 500]) {
    out.push(
      `<rect x="1210" y="${y}" width="250" height="16" rx="3" fill="#8A5530" ${OUT()}/>` +
        `<path d="M1236 ${y + 16} L1236 ${y + 44} L1262 ${y + 16} Z M1434 ${y + 16} L1434 ${y + 44} L1408 ${y + 16} Z" fill="#6A3F22" ${OUT(2.5)}/>`,
    );
  }
  // A trophy cup, a medal on a stand and a small shield.
  out.push(
    `<path d="M1240 300 L1300 300 Q1300 336 1270 340 Q1240 336 1240 300 Z" fill="url(#hs-gold)" ${OUT()}/>` +
      `<path d="M1240 306 Q1222 310 1230 324 Q1236 330 1246 326 M1300 306 Q1318 310 1310 324 Q1304 330 1294 326" fill="none" ${OUT(3)}/>` +
      `<rect x="1262" y="340" width="16" height="10" fill="url(#hs-gold)" ${OUT(2)}/>` +
      `<rect x="1250" y="350" width="40" height="10" rx="2" fill="#5E3820" ${OUT(2)}/>`,
  );
  out.push(
    `<path d="M1328 300 L1342 324 M1356 300 L1342 324" stroke="#3F7F8C" stroke-width="7"/>` +
      `<circle cx="1342" cy="334" r="15" fill="url(#hs-gold)" ${OUT(2.5)}/>` +
      `<path d="M1342 326 L1345 332 L1351 333 L1346 337 L1348 343 L1342 340 L1336 343 L1338 337 L1333 333 L1339 332 Z" fill="#FFF3C8"/>`,
  );
  out.push(
    `<path d="M1388 312 L1436 312 L1436 330 Q1436 352 1412 360 Q1388 352 1388 330 Z" fill="#A83A3E" ${OUT()}/>` +
      `<path d="M1412 318 L1412 352 M1394 330 L1430 330" stroke="#FFE08A" stroke-width="4"/>`,
  );
  // Books and a jar.
  const books: [number, number, string][] = [
    [1232, 64, '#3F7F8C'],
    [1256, 72, '#A83A3E'],
    [1282, 58, '#C98A2A'],
    [1304, 68, '#5B3F7A'],
  ];
  for (const [x, h, c] of books) {
    out.push(
      `<rect x="${x}" y="${500 - h}" width="22" height="${h}" rx="2" fill="${c}" ${OUT(2.5)}/>`,
    );
  }
  out.push(
    `<path d="M1352 444 L1352 430 L1392 430 L1392 444 Q1408 470 1396 500 L1348 500 Q1336 470 1352 444 Z" fill="#7FA79A" ${OUT(2.5)}/>` +
      `<rect x="1346" y="422" width="52" height="10" rx="3" fill="#8A5530" ${OUT(2)}/>`,
  );
  return out.join('');
}

export function cupboard(): string {
  // A tall clothes cupboard against the right wall: its front follows the wall, its side faces you.
  const wallFoot = (x: number): number => B + ((x - R) * (1080 - B)) / (floorAt(R, 1080)[0] - R);
  const top = (x: number, share: number): number => {
    const s = (x - VP[0]) / (R - VP[0]);
    return wallFoot(x) - (B - T) * share * s;
  };
  const a = 1580;
  const b = 1770;
  const fa: Pt = [a, wallFoot(a)];
  const fb: Pt = [b, wallFoot(b)];
  const ta: Pt = [a, top(a, 0.74)];
  const tb: Pt = [b, top(b, 0.74)];
  const side = (p: Pt): Pt => [p[0] - 46, p[1] + 8];
  const out: string[] = [];
  out.push(`<path d="${poly([ta, side(ta), side(fa), fa])}" fill="#4B2D1A" ${OUT()}/>`);
  out.push(`<path d="${poly([ta, tb, fb, fa])}" fill="#6A3F22" ${OUT()}/>`);
  const mid: Pt = [(a + b) / 2, (fa[1] + fb[1]) / 2];
  const midTop: Pt = [(a + b) / 2, (ta[1] + tb[1]) / 2];
  out.push(`<path d="${line([midTop, mid])}" stroke="${INK}" stroke-width="3"/>`);
  // Panels on each door, and two brass knobs.
  const inset = (p: Pt, q: Pt, t: number, dy: number): Pt => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t + dy,
  ];
  for (const [p, q] of [
    [ta, midTop],
    [midTop, tb],
  ] as const) {
    const pf: Pt = [p[0], p[1] + (fa[1] - ta[1])];
    const qf: Pt = [q[0], q[1] + (fa[1] - ta[1])];
    out.push(
      `<path d="${poly([inset(p, q, 0.18, 40), inset(p, q, 0.82, 40), inset(pf, qf, 0.82, -50), inset(pf, qf, 0.18, -50)])}" fill="#7A4A2A" ${OUT(2.5)}/>`,
    );
  }
  const knob = (dx: number): string =>
    `<circle cx="${f(mid[0] + dx)}" cy="${f((midTop[1] + mid[1]) / 2 + (dx > 0 ? 6 : -6))}" r="7" fill="url(#hs-gold)" ${OUT(2)}/>`;
  out.push(knob(-16) + knob(16));
  // A cornice on top.
  out.push(
    `<path d="${poly([
      [ta[0] - 54, ta[1] + 2],
      [ta[0] + 6, ta[1] - 12],
      [tb[0] + 8, tb[1] - 14],
      [tb[0], tb[1] + 6],
    ])}" fill="#5E3820" ${OUT(2.5)}/>`,
  );
  return out.join('');
}

export function chest(): string {
  // A traveler's chest at the foot of the room, its side toward the middle.
  const fl: Pt = [1330, 830];
  const fr: Pt = [1620, 830];
  const bl: Pt = [1330, 960];
  const br: Pt = [1620, 960];
  const back = (p: Pt): Pt => toward(p, 0.84);
  const out: string[] = [];
  out.push(`<path d="${poly([back(fl), fl, bl, back(bl)])}" fill="#5E3820" ${OUT()}/>`);
  out.push(`<path d="${poly([fl, fr, br, bl])}" fill="#8A5530" ${OUT()}/>`);
  // A rounded lid.
  out.push(
    `<path d="M${f(fl[0])} ${fl[1]} Q${f(fl[0])} ${fl[1] - 46} ${f(back(fl)[0] + 40)} ${f(back(fl)[1] - 36)} L${f(back(fr)[0])} ${f(back(fr)[1] - 36)} Q${fr[0]} ${fr[1] - 46} ${fr[0]} ${fr[1]} Z" fill="#9A6238" ${OUT()}/>`,
  );
  out.push(
    `<path d="M${fl[0]} ${fl[1]} Q${fl[0] - 6} ${fl[1] - 40} ${f(back(fl)[0])} ${f(back(fl)[1] - 20)} L${f(back(fl)[0])} ${f(back(fl)[1])} Z" fill="#6A3F22" ${OUT(2.5)}/>`,
  );
  // Brass bands, corners and a lock.
  for (const x of [1384, 1566]) {
    out.push(
      `<rect x="${x - 9}" y="${fl[1] - 40}" width="18" height="${bl[1] - fl[1] + 40}" fill="url(#hs-gold)" ${OUT(2.5)}/>`,
    );
  }
  out.push(
    `<rect x="1452" y="818" width="46" height="46" rx="6" fill="url(#hs-gold)" ${OUT(2.5)}/>` +
      `<path d="M1475 832 a6 6 0 1 1 0.1 0 Z M1471 838 L1479 838 L1477 852 L1473 852 Z" fill="${INK}"/>`,
  );
  return out.join('');
}

export function rug(): string {
  const a = floorAt(800, 790);
  const b = floorAt(1120, 790);
  const c = floorAt(1120, 1040);
  const d = floorAt(800, 1040);
  const inner: Pt[] = [a, b, c, d];
  const mid = (p: Pt, q: Pt): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const center = mid(mid(a, c), mid(b, d));
  const diamond: Pt[] = [mid(a, b), mid(b, c), mid(c, d), mid(d, a)].map(
    (p) => [center[0] + (p[0] - center[0]) * 0.62, center[1] + (p[1] - center[1]) * 0.62] as Pt,
  );
  const small = diamond.map(
    (p) => [center[0] + (p[0] - center[0]) * 0.45, center[1] + (p[1] - center[1]) * 0.45] as Pt,
  );
  return (
    `<path d="${poly(inner)}" fill="#8E2E35" ${OUT()}/>` +
    `<path d="${poly(inner.map((p) => [center[0] + (p[0] - center[0]) * 0.86, center[1] + (p[1] - center[1]) * 0.86] as Pt))}" fill="none" stroke="#E0B05A" stroke-width="6"/>` +
    `<path d="${poly(diamond)}" fill="#265965" stroke="#E0B05A" stroke-width="5"/>` +
    `<path d="${poly(small)}" fill="#E0B05A"/>`
  );
}

export function desk(): string {
  // A writing desk under the shelf, the ledger open on it, an inkpot and a quill (the-home.md §3).
  const lift = (p: Pt, h: number): Pt => [p[0], p[1] - h];
  const bl = floorAt(1110, B);
  const br = floorAt(1260, B);
  const fl = toward(bl, 1.06);
  const fr = toward(br, 1.06);
  const h = 150;
  const out: string[] = [];
  // Back legs, the top, the apron and the front legs.
  out.push(
    `<rect x="${f(bl[0] + 6)}" y="${f(bl[1] - h)}" width="12" height="${h}" fill="#4B2D1A" ${OUT(2)}/>` +
      `<rect x="${f(br[0] - 18)}" y="${f(br[1] - h)}" width="12" height="${h}" fill="#4B2D1A" ${OUT(2)}/>`,
  );
  out.push(
    `<path d="${poly([lift(bl, h), lift(br, h), lift(fr, h), lift(fl, h)])}" fill="#9A6238" ${OUT()}/>` +
      `<path d="${poly([lift(fl, h), lift(fr, h), lift(fr, h - 30), lift(fl, h - 30)])}" fill="#7A4A2A" ${OUT()}/>` +
      `<rect x="${f(fl[0] + 22)}" y="${f(fl[1] - h + 10)}" width="34" height="14" rx="3" fill="url(#hs-gold)" ${OUT(1.5)}/>`,
  );
  out.push(
    `<rect x="${f(fl[0])}" y="${f(fl[1] - h + 30)}" width="16" height="${h - 30}" fill="#5E3820" ${OUT(2.5)}/>` +
      `<rect x="${f(fr[0] - 16)}" y="${f(fr[1] - h + 30)}" width="16" height="${h - 30}" fill="#5E3820" ${OUT(2.5)}/>`,
  );
  // The ledger, open, with ruled lines; the inkpot and its quill.
  const top = lift(fl, h)[1] - 4;
  const mx = (fl[0] + fr[0]) / 2 - 12;
  out.push(
    `<path d="M${f(mx - 52)} ${f(top)} L${f(mx - 46)} ${f(top - 16)} L${f(mx)} ${f(top - 12)} L${f(mx + 46)} ${f(top - 16)} L${f(mx + 52)} ${f(top)} L${f(mx)} ${f(top + 3)} Z" fill="#F3E3C0" ${OUT(2)}/>` +
      `<path d="M${f(mx)} ${f(top - 12)} L${f(mx)} ${f(top + 3)} M${f(mx - 40)} ${f(top - 9)} L${f(mx - 8)} ${f(top - 7)} M${f(mx - 42)} ${f(top - 4)} L${f(mx - 8)} ${f(top - 2)} M${f(mx + 8)} ${f(top - 7)} L${f(mx + 40)} ${f(top - 9)}" stroke="${INK}" stroke-width="1.5" fill="none"/>`,
  );
  const ink: Pt = [fr[0] - 30, top - 2];
  out.push(
    `<path d="M${f(ink[0] - 9)} ${f(ink[1])} L${f(ink[0] + 9)} ${f(ink[1])} L${f(ink[0] + 7)} ${f(ink[1] - 16)} L${f(ink[0] - 7)} ${f(ink[1] - 16)} Z" fill="#1F2456" ${OUT(2)}/>` +
      `<path d="M${f(ink[0])} ${f(ink[1] - 14)} Q${f(ink[0] + 6)} ${f(ink[1] - 44)} ${f(ink[0] + 22)} ${f(ink[1] - 58)}" stroke="#F6EEDC" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  );
  return out.join('');
}

export function letterbox(): string {
  // A small wooden box for letters from friends, with a brass slot and a red flag (§5).
  return (
    `<path d="M684 372 L736 372 L736 440 L684 440 Z" fill="#7A4A2A" ${OUT()}/>` +
    `<path d="M678 376 Q710 348 742 376 Z" fill="#5E3820" ${OUT(2.5)}/>` +
    `<rect x="694" y="390" width="32" height="7" rx="3" fill="url(#hs-gold)" ${OUT(1.5)}/>` +
    `<path d="M742 392 L742 360 L758 366 L742 372" fill="#A83A3E" ${OUT(2)}/>` +
    `<path d="M694 412 L726 412 M694 424 L726 424" stroke="#5E3820" stroke-width="2"/>`
  );
}

/** The evening light laid over the whole room, last. */
export function houseLight(): string {
  return (
    `<rect width="1920" height="1080" fill="url(#hs-dusk)"/>` +
    `<rect width="1920" height="1080" fill="url(#hs-glow)"/>` +
    `<rect width="1920" height="1080" fill="url(#hs-shade)"/>`
  );
}

/** The whole room, as SVG markup for a 1920×1080 stage. */
export function paintHouse(): string {
  return (
    defs() +
    room() +
    windowToTheSquare() +
    pictureOverTheBed() +
    shelf() +
    rug() +
    bed() +
    cupboard() +
    chest() +
    lantern() +
    houseLight()
  );
}
