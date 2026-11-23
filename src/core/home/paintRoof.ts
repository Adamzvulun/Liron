// The roof (task 8.4, docs/game/the-home.md §16): your second room, a flat roof above the house
// at dusk, in the house's style (paintHouse.ts) and on the same grid (projection.ts). Two
// neighbors' walls stand at the back, where wall pieces hang in the house's slots; between them
// a low parapet looks out over the city's rooftops to the Signal Tower. Low parapets run along
// both sides, and the hatch you come up through is at the door's cell, front left. Painted
// whole, back to front: the sky, the city, the walls, the floor, the parapets, the hatch.
import { INK, line, OUT, poly, type Pt } from '../city/paintKit.ts';
import { cellsQuad, floorPoint, VP } from './projection.ts';

const L = 420;
const R = 1500;
const B = 720;
/** Where the back gap between the two walls runs, and the walls' tops. */
const GAP: readonly [number, number] = [790, 1130];
const TOP_L = 236;
const TOP_R = 262;
/** How high the parapets stand at the back wall's foot. */
const PARAPET = 46;
/** The grid columns the side parapets stand on: the back walls' corners, L and R. */
const EDGE: readonly [number, number] = [-1.2, 13.2];

const toward = ([x, y]: Pt, t: number): Pt => [VP[0] + (x - VP[0]) * t, VP[1] + (y - VP[1]) * t];

export function roofDefs(): string {
  return `<defs>
<linearGradient id="rf-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B1F4E"/><stop offset=".42" stop-color="#4A3772"/><stop offset=".68" stop-color="#B8607A"/><stop offset=".86" stop-color="#EE9A62"/><stop offset="1" stop-color="#F8C27A"/></linearGradient>
<linearGradient id="rf-lime" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9D6B4"/><stop offset=".6" stop-color="#D8BE96"/><stop offset="1" stop-color="#B99A74"/></linearGradient>
<linearGradient id="rf-ochre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D49A5E"/><stop offset=".6" stop-color="#C08250"/><stop offset="1" stop-color="#9E6640"/></linearGradient>
<linearGradient id="rf-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B98A62"/><stop offset="1" stop-color="#D9AE80"/></linearGradient>
<linearGradient id="rf-parapet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2C9A2"/><stop offset="1" stop-color="#B8946C"/></linearGradient>
<radialGradient id="rf-dusk" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(960 560) scale(760 420)"><stop offset="0" stop-color="#F8C27A" stop-opacity=".2"/><stop offset="1" stop-color="#F8C27A" stop-opacity="0"/></radialGradient>
<linearGradient id="rf-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A0E2E" stop-opacity=".12"/><stop offset=".5" stop-color="#1A0E2E" stop-opacity="0"/><stop offset="1" stop-color="#1A0E1E" stop-opacity=".3"/></linearGradient>
</defs>`;
}

/** The sky, its first stars and moon, and the city's rooftops with the Signal Tower lit. */
function skyAndCity(): string {
  const out: string[] = [`<rect width="1920" height="1080" fill="url(#rf-sky)"/>`];
  const stars: Pt[] = [
    [120, 80],
    [260, 170],
    [410, 60],
    [880, 70],
    [1010, 150],
    [1180, 52],
    [1560, 120],
    [1700, 60],
    [1840, 190],
    [640, 120],
    [1380, 180],
  ];
  out.push(stars.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#FFF3C8"/>`).join(''));
  // A young moon.
  out.push(
    `<path d="M1660 150 A46 46 0 1 0 1712 214 A38 38 0 1 1 1660 150 Z" fill="#FFF1C4"/>` +
      `<circle cx="1690" cy="190" r="70" fill="#FFF1C4" opacity=".08"/>`,
  );
  // Far rooftops, then nearer ones, across the whole width: flat roofs, domes, a minaret.
  const far =
    'M0 560 L0 500 L70 500 L70 470 L150 470 L150 510 L230 510 Q275 440 320 510 L400 510 L400 480 L480 480 L480 520 ' +
    'L560 520 L560 470 L600 470 L600 420 L612 380 L624 420 L624 470 L700 470 L700 520 L800 520 L800 490 ' +
    'L880 490 Q930 430 980 490 L1050 490 L1050 470 L1140 470 L1140 515 L1230 515 L1230 480 L1300 480 ' +
    'L1300 505 L1400 505 Q1450 450 1500 505 L1580 505 L1580 470 L1680 470 L1680 510 L1780 510 L1780 480 ' +
    'L1920 480 L1920 560 Z';
  out.push(`<path d="${far}" fill="#3E2A5E" opacity=".85"/>`);
  // The Signal Tower, its lamp lit, as from the house's window.
  out.push(
    `<path d="M1006 560 L1012 300 L1056 300 L1062 560 Z" fill="#2B1F45"/>` +
      `<path d="M998 300 L1034 250 L1070 300 Z" fill="#2B1F45"/>` +
      `<circle cx="1034" cy="318" r="34" fill="#FFD36B" opacity=".3"/>` +
      `<circle cx="1034" cy="318" r="10" fill="#FFE9A8"/>`,
  );
  const near =
    'M0 1080 L0 560 L110 560 L110 540 L200 540 L200 575 L330 575 L330 545 L380 545 L380 590 L560 590 ' +
    'L560 560 L660 560 L660 600 L860 600 L860 575 Q905 525 950 575 L1100 575 L1100 555 L1210 555 L1210 590 ' +
    'L1360 590 L1360 560 L1480 560 L1480 600 L1620 600 L1620 565 L1760 565 L1760 590 L1920 590 L1920 1080 L0 1080 Z';
  out.push(`<path d="${near}" fill="#33224F"/>`);
  // Lit windows in the nearer roofs.
  const windows: Pt[] = [
    [140, 575],
    [250, 590],
    [600, 580],
    [930, 600],
    [1140, 575],
    [1260, 605],
    [1400, 580],
    [1700, 585],
    [1830, 605],
  ];
  out.push(
    windows
      .map(([x, y]) => `<rect x="${x}" y="${y}" width="12" height="16" fill="#FFC861"/>`)
      .join(''),
  );
  return out.join('');
}

/** The two neighbors' walls at the back, where wall pieces hang, and the low wall between. */
function backWalls(): string {
  const out: string[] = [];
  // The left wall: lime-washed, its top stepped, a rain spout.
  out.push(
    `<path d="${poly([
      [L, B],
      [L, TOP_L + 30],
      [L + 40, TOP_L + 30],
      [L + 40, TOP_L],
      [GAP[0], TOP_L],
      [GAP[0], B],
    ])}" fill="url(#rf-lime)" ${OUT()}/>`,
  );
  out.push(
    `<rect x="${L + 34}" y="${TOP_L - 12}" width="${GAP[0] - L - 22}" height="16" rx="3" fill="#C9AE86" ${OUT(2.5)}/>`,
  );
  out.push(
    `<path d="M${GAP[0] - 30} ${TOP_L + 70} l26 0 l0 12 l-26 0 Z" fill="#8A6446" ${OUT(2)}/>` +
      `<path d="M${GAP[0] - 18} ${TOP_L + 82} l0 30" stroke="#6E8FA0" stroke-width="3" opacity=".5"/>`,
  );
  // Weathering on the lime: a few cracks and a damp line at the foot.
  out.push(
    `<path d="M470 300 l18 30 l-6 26 M720 420 l-14 22 l10 18" stroke="#9C7E5A" stroke-width="2" fill="none" opacity=".6"/>` +
      `<rect x="${L}" y="${B - 40}" width="${GAP[0] - L}" height="40" fill="#8A6A4A" opacity=".18"/>`,
  );
  // The right wall: ochre plaster under a tiled coping.
  out.push(
    `<path d="${poly([
      [GAP[1], B],
      [GAP[1], TOP_R],
      [R, TOP_R],
      [R, B],
    ])}" fill="url(#rf-ochre)" ${OUT()}/>`,
  );
  out.push(
    `<path d="${poly([
      [GAP[1] - 14, TOP_R + 4],
      [GAP[1] + 6, TOP_R - 20],
      [R - 6, TOP_R - 20],
      [R + 14, TOP_R + 4],
    ])}" fill="#9A4A2E" ${OUT(2.5)}/>`,
  );
  const tiles: string[] = [];
  for (let x = GAP[1] + 30; x < R; x += 34) tiles.push(`M${x} ${TOP_R - 19} l-4 22`);
  out.push(`<path d="${tiles.join(' ')}" stroke="${INK}" stroke-width="1.6" opacity=".45"/>`);
  out.push(
    `<path d="M1180 360 l-12 26 l8 20 M1450 470 l16 20" stroke="#7E4E2C" stroke-width="2" fill="none" opacity=".55"/>` +
      `<rect x="${GAP[1]}" y="${B - 40}" width="${R - GAP[1]}" height="40" fill="#6A3A20" opacity=".18"/>`,
  );
  // The low wall between them, looking out over the city.
  out.push(
    `<rect x="${GAP[0]}" y="${B - PARAPET}" width="${GAP[1] - GAP[0]}" height="${PARAPET}" fill="url(#rf-parapet)" ${OUT()}/>` +
      `<rect x="${GAP[0] - 6}" y="${B - PARAPET - 8}" width="${GAP[1] - GAP[0] + 12}" height="12" rx="3" fill="#E9D6B4" ${OUT(2.5)}/>`,
  );
  // A string of little lights from wall to wall.
  const sag = (u: number): Pt => [GAP[0] + (GAP[1] - GAP[0]) * u, 300 + 70 * Math.sin(Math.PI * u)];
  const points = Array.from({ length: 21 }, (_, i) => sag(i / 20));
  out.push(`<path d="${line(points)}" stroke="${INK}" stroke-width="2" fill="none"/>`);
  out.push(
    points
      .filter((_, i) => i % 2 === 1)
      .map(
        ([x, y]) =>
          `<circle cx="${x}" cy="${y + 8}" r="16" fill="#FFD36B" opacity=".22"/><circle cx="${x}" cy="${y + 8}" r="6" fill="#FFE9A8" ${OUT(1.5)}/>`,
      )
      .join(''),
  );
  return out.join('');
}

/** The roof's floor: packed lime slabs in perspective, to the front of the stage. */
function floor(): string {
  const far = floorPoint(EDGE[0], 0);
  const farR = floorPoint(EDGE[1], 0);
  const near = floorPoint(EDGE[0], 5);
  const nearR = floorPoint(EDGE[1], 5);
  const edge = (a: Pt, b: Pt, y: number): Pt => [
    a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]),
    y,
  ];
  const shape = poly([far, farR, edge(farR, nearR, 1080), edge(far, near, 1080)]);
  const out: string[] = [`<path d="${shape}" fill="url(#rf-floor)"/>`];
  // Slabs: one joint line per grid line, carried past the grid to the parapets.
  const joints: string[] = [];
  for (let c = -2; c <= 14; c++) joints.push(line([floorPoint(c, 0), floorPoint(c, 7)]));
  for (let r = 1; r <= 6; r++) joints.push(line([floorPoint(-3, r), floorPoint(15, r)]));
  out.push(
    `<clipPath id="rf-floorclip"><path d="${shape}"/></clipPath>` +
      `<path d="${joints.join(' ')}" clip-path="url(#rf-floorclip)" stroke="#8A6444" stroke-width="2.5" opacity=".45" fill="none"/>`,
  );
  // A few slabs a shade darker, patched over the years.
  const patches: [number, number][] = [
    [2, 1],
    [7, 0],
    [10, 3],
    [5, 4],
    [-1, 2],
    [13, 1],
  ];
  out.push(
    patches
      .map(([c, r]) => `<path d="${poly(cellsQuad(c, r))}" fill="#8A6444" opacity=".12"/>`)
      .join(''),
  );
  return out.join('');
}

/** The low parapets along both sides of the roof, from the back walls to the front. */
function sideParapets(): string {
  const side = (col: number) => {
    const back = floorPoint(col, 0);
    const front = floorPoint(col, 7);
    const up = (p: Pt, t: number): Pt => [p[0], p[1] - PARAPET * t];
    const tb = 1;
    const tf = (front[1] - VP[1]) / (back[1] - VP[1]);
    return `<path d="${poly([back, up(back, tb), up(front, tf), front])}" fill="url(#rf-parapet)" ${OUT()}/>`;
  };
  // The coping along each top.
  const coping = (col: number) => {
    const back = floorPoint(col, 0);
    const front = floorPoint(col, 7);
    const tf = (front[1] - VP[1]) / (back[1] - VP[1]);
    return `<path d="${line([
      [back[0], back[1] - PARAPET],
      [front[0], front[1] - PARAPET * tf],
    ])}" stroke="#E9D6B4" stroke-width="10" stroke-linecap="round"/>`;
  };
  return side(EDGE[0]) + side(EDGE[1]) + coping(EDGE[0]) + coping(EDGE[1]);
}

/** The hatch you come up through, open, at the door's cell (front left). */
function hatch(at: readonly [number, number]): string {
  const [c, r] = at;
  const [bl, br, fr, fl] = cellsQuad(c + 0.12, r + 0.1, 0.76, 0.8) as [Pt, Pt, Pt, Pt];
  const q = [bl, br, fr, fl];
  const lid = bl;
  const hinge = (p: Pt): Pt => {
    const t = toward(p, 0.9);
    return [t[0], t[1] - 62];
  };
  return (
    `<path d="${poly(q)}" fill="#2A1A10" ${OUT()}/>` +
    // The top two steps of the stair below.
    `<path d="${line([
      [fl[0] + 14, fl[1] - 22],
      [fr[0] - 14, fr[1] - 22],
    ])}" stroke="#7A4A2A" stroke-width="10"/>` +
    `<path d="${line([
      [fl[0] + 24, fl[1] - 46],
      [fr[0] - 24, fr[1] - 46],
    ])}" stroke="#6A3F22" stroke-width="8"/>` +
    // The lid, propped open against the back edge.
    `<path d="${poly([lid, br, hinge(br), hinge(lid)])}" fill="#7A4A2A" ${OUT()}/>` +
    `<path d="${line([
      [lid[0] + 10, lid[1] - 35],
      [br[0] - 10, br[1] - 35],
    ])}" stroke="${INK}" stroke-width="2" opacity=".5"/>`
  );
}

/** The roof behind everything placed on it, for the 1920 × 1080 stage. */
export function roof(door: readonly [number, number]): string {
  return roofDefs() + skyAndCity() + backWalls() + floor() + sideParapets() + hatch(door);
}

/** The evening over the roof, laid over everything, last. */
export function roofLight(): string {
  return (
    roofDefs() +
    `<rect width="1920" height="1080" fill="url(#rf-dusk)"/>` +
    `<rect width="1920" height="1080" fill="url(#rf-shade)"/>`
  );
}
