// The home drawn from its layout (docs/game/the-home.md §2–3, ADR 0055): the fixed room (walls,
// floor, window), then each piece where the layout puts it. Every piece is painted once, at its
// place in the starter room, and carried to its new place by a transform (projection.ts), so
// the starter room is drawn exactly as painted. Back to front: what hangs on the wall, the rugs,
// then the floor pieces by their front row, so nearer pieces cover farther ones.
import * as house from '../city/paintHouse.ts';
import {
  isFloor,
  isTurn,
  ROOM,
  STARTER,
  slotsOf,
  type Facing,
  type Layout,
  type PieceDef,
} from './layout.ts';
import { cellsQuad, floorPoint, moveFloor, moveWall, VP, type Pt } from './projection.ts';
import { FURNITURE } from './paintFurniture.ts';
import { poly } from '../city/paintKit.ts';

/**
 * The painting of each starter piece, and for a floor piece the point it was painted standing
 * on: the middle of its front edge, on the floor (projection.ts, moveFloor). Bought furniture
 * is painted in paintFurniture.ts.
 */
type Painted = { paint: (facing?: Facing) => string; origin?: Pt; wallX?: number };
const PAINT: Record<string, Painted> = {
  'home:bed': { paint: house.bed, origin: [374, 930] },
  'home:rug': { paint: house.rug, origin: [960, 1040] },
  'home:desk': { paint: house.desk, origin: [1198, 737] },
  'home:cupboard': { paint: house.cupboard, origin: [1652, 865] },
  'home:chest': { paint: house.chest, origin: [1475, 960] },
  'home:picture': { paint: house.pictureOverTheBed },
  'home:lantern': { paint: house.lantern },
  'home:shelf': { paint: house.shelf },
  'home:letterbox': { paint: house.letterbox },
};

/** The x on the back wall where a wall piece hangs: the middle of the slots it covers. */
function wallX(slot: number, def: PieceDef): number | null {
  const slots = slotsOf({ slot }, def, ROOM);
  if (!slots) return null;
  return slots.reduce((sum, s) => sum + s.x, 0) / slots.length;
}

export interface HomeView {
  /** Draw the floor grid and the wall slots, as in Decorate (§6). */
  grid?: boolean;
  /** Cells to tint, e.g. where the held piece may go, or where it may not. */
  marks?: { cells: [number, number][]; tone: 'ok' | 'no' | 'held' }[];
  /** Extra markup to draw among the floor pieces at a row, such as the avatar. */
  standing?: { row: number; svg: string }[];
}

const TONE = { ok: '#7FD89A', no: '#E0655A', held: '#FFE7A8' } as const;

/**
 * The facing to paint a floor piece in (task 8.3): only a turn it has, and with the two side
 * turns swapped when moveFloor mirrors it across the middle, so it ends up facing the right way.
 */
function turned(p: { at: readonly [number, number]; facing: Facing }, def: PieceDef, origin?: Pt) {
  if (!isTurn(p.facing) || !def.turns?.includes(p.facing) || !origin) return undefined;
  const x = floorPoint(p.at[0] + def.size[0] / 2, p.at[1] + def.size[1])[0];
  const mirrored = Math.sign(origin[0] - VP[0]) * Math.sign(x - VP[0]) < 0;
  if (!mirrored || p.facing === 'away') return p.facing;
  return p.facing === 'to-left' ? 'to-right' : 'to-left';
}

/** Each placed piece's markup, carried to its place: what hangs, the rugs, and the rest by row. */
function placed(layout: Layout, defs: ReadonlyMap<string, PieceDef>) {
  const anchor = new Map(STARTER.pieces.map((p) => [p.id, p]));
  const wall: string[] = [];
  const rugs: string[] = [];
  const floor: { row: number; x: number; svg: string }[] = [];
  for (const p of layout.pieces) {
    const def = defs.get(p.id);
    const piece: Painted | undefined = PAINT[p.id] ?? FURNITURE[p.id as keyof typeof FURNITURE];
    if (!def || !piece) continue;
    // A starter piece left where the starter room has it is drawn exactly as painted.
    const home = anchor.get(p.id);
    const art = piece.paint(
      isFloor(p) && 'origin' in piece ? turned(p, def, piece.origin) : undefined,
    );
    if (!isFloor(p)) {
      const from =
        'wallX' in piece && piece.wallX !== undefined
          ? piece.wallX
          : home && !isFloor(home)
            ? wallX(home.slot, def)
            : null;
      const to = wallX(p.slot, def);
      if (from === null || to === null) continue;
      wall.push(wrap(art, moveWall(from, to)));
      continue;
    }
    if (!('origin' in piece) || !piece.origin) continue;
    const still = !!home && isFloor(home) && home.at[0] === p.at[0] && home.at[1] === p.at[1];
    const svg = wrap(art, still ? '' : moveFloor(piece.origin, p.at, def.size));
    if (def.place === 'rug') rugs.push(svg);
    else floor.push({ row: p.at[1] + def.size[1], x: p.at[0], svg });
  }
  return { wall, rugs, floor };
}

/** The room laid out as `layout`, as SVG markup for the 1920 × 1080 stage. */
export function paintHome(
  layout: Layout,
  defs: ReadonlyMap<string, PieceDef>,
  view: HomeView = {},
): string {
  const { wall, rugs, floor } = placed(layout, defs);
  for (const s of view.standing ?? []) floor.push({ row: s.row + 1, x: 99, svg: s.svg });
  // Nearer pieces last; on the same row, the one standing there (x 99) last.
  floor.sort((a, b) => a.row - b.row || a.x - b.x);

  return (
    house.defs() +
    house.room(styleOf(layout)) +
    house.windowToTheSquare() +
    wall.join('') +
    rugs.join('') +
    (view.grid ? grid() : '') +
    (view.marks ?? []).map(mark).join('') +
    floor.map((f) => f.svg).join('') +
    (view.marks ?? []).map(outline).join('') +
    house.houseLight()
  );
}

/**
 * The room in layers, for the walkable room (Room.tsx, task 7.5): the walls, the window, what
 * hangs and the rugs behind everything; then one layer per row line, holding the pieces whose
 * front edge is on it; then the lamplight over all. Someone standing in row r goes between the
 * layer at line r + 1 and the next, as paintHome's `standing` does.
 */
export function homeLayers(
  layout: Layout,
  defs: ReadonlyMap<string, PieceDef>,
): { back: string; bands: { row: number; svg: string }[]; light: string; glow: string } {
  const { wall, rugs, floor } = placed(layout, defs);
  floor.sort((a, b) => a.row - b.row || a.x - b.x);
  const bands = new Map<number, string>();
  for (const f of floor) bands.set(f.row, (bands.get(f.row) ?? '') + f.svg);
  return {
    back:
      house.defs() +
      house.room(styleOf(layout)) +
      house.windowToTheSquare() +
      wall.join('') +
      rugs.join(''),
    bands: [...bands].map(([row, svg]) => ({ row, svg: house.defs() + svg })),
    // The lantern's glow on its own, so the lantern can put it out (§5); the rest of the light stays.
    light:
      house.defs() +
      `<rect width="1920" height="1080" fill="url(#hs-dusk)"/>` +
      `<rect width="1920" height="1080" fill="url(#hs-shade)"/>`,
    glow: house.defs() + `<rect width="1920" height="1080" fill="url(#hs-glow)"/>`,
  };
}

/** The layout's wallpaper and floor, or the plain room's for any this build doesn't paint. */
function styleOf(layout: Layout): house.RoomStyle {
  const known = <T extends string>(list: readonly T[], id: string, or: T): T =>
    list.includes(id as T) ? (id as T) : or;
  return {
    wallpaper: known(house.WALLPAPERS, layout.wallpaper, 'plaster'),
    floor: known(house.FLOORS, layout.floor, 'planks'),
  };
}

const wrap = (art: string, transform: string) =>
  transform ? `<g transform="${transform}">${art}</g>` : art;

/**
 * What Decorate draws over the room (§6): the grid and the wall slots, and the cells a held
 * piece would cover, tinted, with their edges again on top.
 */
export function decorOverlay(marks: NonNullable<HomeView['marks']>): string {
  return grid() + marks.map(mark).join('') + marks.map(outline).join('');
}

function grid(): string {
  const cells: string[] = [];
  for (let r = 0; r < ROOM.rows; r++)
    for (let c = 0; c < ROOM.cols; c++) cells.push(`<path d="${poly(cellsQuad(c, r))}"/>`);
  const slots = ROOM.slots
    .map(
      (s) =>
        `<rect x="${s.x - 34}" y="300" width="68" height="130" rx="8" fill="#FFE7A8" fill-opacity=".14" stroke="#FFE7A8" stroke-dasharray="8 6" stroke-width="2"/>`,
    )
    .join('');
  return (
    slots +
    `<g fill="none" stroke="#FFE7A8" stroke-width="2" stroke-opacity=".5">${cells.join('')}</g>`
  );
}

function mark({ cells, tone }: NonNullable<HomeView['marks']>[number]): string {
  return cells
    .map(
      ([c, r]) =>
        `<path d="${poly(cellsQuad(c, r))}" fill="${TONE[tone]}" fill-opacity=".38" stroke="${TONE[tone]}" stroke-width="2.5"/>`,
    )
    .join('');
}

/** The marked cells' edges again, over the pieces, so a held piece shows where it would stand. */
function outline({ cells, tone }: NonNullable<HomeView['marks']>[number]): string {
  return cells
    .map(
      ([c, r]) =>
        `<path d="${poly(cellsQuad(c, r))}" fill="none" stroke="${TONE[tone]}" stroke-width="3" stroke-dasharray="10 6"/>`,
    )
    .join('');
}
