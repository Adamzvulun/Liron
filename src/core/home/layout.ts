// The home's layout and its rules (docs/game/the-home.md §3 and §6, ADR 0055): which pieces
// stand where, and whether an arrangement is allowed. The same rules are checked again by
// the database when a layout is saved (save_home, task 7.3); `layouts.fixture.ts` holds the
// cases both sides are tested on.
import * as z from 'zod/mini';
import home from '../../../content/core/home.json' with { type: 'json' };
import { cellKey, neighbors, reachable, type Cell } from './path.ts';

/** What a piece does when used (§5). The four panels can be moved but never stored. */
export const PANELS = ['wardrobe', 'trophies', 'ledger', 'fellowship'] as const;
export type Does = (typeof PANELS)[number] | 'sit' | 'light' | 'look';
export type Place = 'floor' | 'rug' | 'wall';

export interface PieceDef {
  id: string;
  name: string;
  place: Place;
  /** Width across and depth into the room, in cells. Wall pieces are 1 × 1. */
  size: readonly [number, number];
  does: Does;
  line: string;
}

export interface Room {
  cols: number;
  rows: number;
  door: Cell;
  caps: { floor: number; wall: number };
  /** The wall slots, and the floor cells you stand on to use what hangs there. */
  slots: { slot: number; wall: 'back' | 'left' | 'right'; below: Cell[] }[];
  wallpapers: string[];
  floors: string[];
}

const Id = z.string().check(z.regex(/^[a-z0-9][a-z0-9:._-]{0,63}$/));
const Coord = z.int().check(z.nonnegative(), z.lte(63));
const FloorPiece = z.strictObject({
  id: Id,
  at: z.tuple([Coord, Coord]),
  facing: z.enum(['left', 'right']),
});
const WallPiece = z.strictObject({ id: Id, slot: Coord });

export const Layout = z.strictObject({
  v: z.literal(1),
  wallpaper: Id,
  floor: Id,
  pieces: z.array(z.union([FloorPiece, WallPiece])).check(z.maxLength(64)),
});
export type Layout = z.infer<typeof Layout>;
export type Placed = Layout['pieces'][number];
export type PlacedFloor = z.infer<typeof FloorPiece>;

export const isFloor = (p: Placed): p is PlacedFloor => 'at' in p;

/** A layout read from anywhere (the database, a friend): the right shape, or null. */
export function parseLayout(value: unknown): Layout | null {
  const parsed = Layout.safeParse(value);
  return parsed.success ? parsed.data : null;
}

const roomData = home.items.find((i) => i.type === 'home-room')?.data as unknown as Room & {
  starter: unknown;
};
export const ROOM: Room = roomData;
export const STARTER: Layout = Layout.parse(roomData.starter);
/** The pieces every player has without owning them (§3). */
export const STARTER_PIECES: PieceDef[] = home.items
  .filter((i) => i.type === 'home-piece')
  .map((i) => ({ id: i.id, ...(i.data as unknown as Omit<PieceDef, 'id'>) }));

/** Why a layout is refused, and the piece it is about. */
export type Refusal =
  | { why: 'unknown'; id: string }
  | { why: 'twice'; id: string }
  | { why: 'wrong-place'; id: string }
  | { why: 'off-floor'; id: string }
  | { why: 'overlap'; id: string; with: string }
  | { why: 'on-door'; id: string }
  | { why: 'slot'; id: string }
  | { why: 'slot-taken'; id: string; with: string }
  | { why: 'too-many'; place: 'floor' | 'wall' }
  | { why: 'panel-missing'; does: (typeof PANELS)[number] }
  | { why: 'cut-off'; id: string }
  | { why: 'style' };

/** The cells a floor piece covers. */
export function cellsOf(p: PlacedFloor, def: PieceDef): Cell[] {
  const [w, d] = def.size;
  const out: Cell[] = [];
  for (let dy = 0; dy < d; dy++)
    for (let dx = 0; dx < w; dx++) out.push([p.at[0] + dx, p.at[1] + dy]);
  return out;
}

/** Which cells are taken by something you can't walk through (rugs don't count). */
export function blockedCells(
  layout: Layout,
  defs: ReadonlyMap<string, PieceDef>,
): Map<string, string> {
  const taken = new Map<string, string>();
  for (const p of layout.pieces) {
    const def = defs.get(p.id);
    if (!def || !isFloor(p) || def.place !== 'floor') continue;
    for (const c of cellsOf(p, def)) taken.set(cellKey(c), p.id);
  }
  return taken;
}

/**
 * The cells you can stand on to use a piece: the free cells beside a floor piece, or the cells
 * below a wall slot. In order of preference: in front first (toward the viewer), then the sides,
 * then behind.
 */
export function standCells(
  p: Placed,
  def: PieceDef,
  room: Room,
  blocked: ReadonlyMap<string, string>,
): Cell[] {
  const free = ([x, y]: Cell) =>
    x >= 0 && y >= 0 && x < room.cols && y < room.rows && !blocked.has(cellKey([x, y]));
  if (!isFloor(p)) {
    const slot = room.slots.find((s) => s.slot === p.slot);
    return (slot?.below ?? []).filter(free);
  }
  const own = new Set(cellsOf(p, def).map(cellKey));
  const front: Cell[] = [];
  const rest: Cell[] = [];
  const seen = new Set<string>();
  for (const c of cellsOf(p, def))
    for (const n of neighbors(c)) {
      const k = cellKey(n);
      if (own.has(k) || seen.has(k) || !free(n)) continue;
      seen.add(k);
      (n[1] > c[1] ? front : rest).push(n);
    }
  return [...front, ...rest];
}

/**
 * Checks a layout against the room's rules. `owned` is every piece the player may place: the
 * starter pieces and the furniture they own. Returns the first problem found, or null.
 */
export function checkLayout(
  layout: Layout,
  owned: ReadonlyMap<string, PieceDef>,
  room: Room = ROOM,
  styles: { wallpapers: readonly string[]; floors: readonly string[] } = room,
): Refusal | null {
  if (!styles.wallpapers.includes(layout.wallpaper) || !styles.floors.includes(layout.floor))
    return { why: 'style' };
  const seen = new Set<string>();
  const covered = new Map<string, string>();
  const rugs = new Map<string, string>();
  const slots = new Map<number, string>();
  let floor = 0;
  let wall = 0;
  const doorKey = cellKey(room.door);
  for (const p of layout.pieces) {
    const def = owned.get(p.id);
    if (!def) return { why: 'unknown', id: p.id };
    if (seen.has(p.id)) return { why: 'twice', id: p.id };
    seen.add(p.id);
    if (isFloor(p) !== (def.place !== 'wall')) return { why: 'wrong-place', id: p.id };
    if (!isFloor(p)) {
      wall++;
      if (!room.slots.some((s) => s.slot === p.slot)) return { why: 'slot', id: p.id };
      const other = slots.get(p.slot);
      if (other) return { why: 'slot-taken', id: p.id, with: other };
      slots.set(p.slot, p.id);
      continue;
    }
    floor++;
    const [w, d] = def.size;
    if (p.at[0] + w > room.cols || p.at[1] + d > room.rows) return { why: 'off-floor', id: p.id };
    const layer = def.place === 'rug' ? rugs : covered;
    for (const c of cellsOf(p, def)) {
      const k = cellKey(c);
      const other = layer.get(k);
      if (other) return { why: 'overlap', id: p.id, with: other };
      if (def.place === 'floor' && k === doorKey) return { why: 'on-door', id: p.id };
      layer.set(k, p.id);
    }
  }
  if (floor > room.caps.floor) return { why: 'too-many', place: 'floor' };
  if (wall > room.caps.wall) return { why: 'too-many', place: 'wall' };
  for (const does of PANELS)
    if (!layout.pieces.some((p) => owned.get(p.id)?.does === does))
      return { why: 'panel-missing', does };

  // The way from the door must reach every piece that does something (§6).
  const open = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < room.cols && y < room.rows && !covered.has(cellKey([x, y]));
  const reach = reachable(open, room.door);
  for (const p of layout.pieces) {
    const def = owned.get(p.id);
    if (!def || def.does === 'look' || def.place === 'rug') continue;
    if (!standCells(p, def, room, covered).some((c) => reach.has(cellKey(c))))
      return { why: 'cut-off', id: p.id };
  }
  return null;
}

/** What the room says when it refuses a layout, in the guide's plain voice. */
export function refusalText(r: Refusal, defs: ReadonlyMap<string, PieceDef>): string {
  const name = (id: string) => `the ${defs.get(id)?.name ?? 'piece'}`;
  switch (r.why) {
    case 'unknown':
      return 'That piece isn’t yours to place.';
    case 'twice':
      return `${cap(name(r.id))} is already in the room.`;
    case 'wrong-place':
      return `${cap(name(r.id))} doesn’t go there.`;
    case 'off-floor':
      return `${cap(name(r.id))} doesn’t fit there.`;
    case 'overlap':
      return `${cap(name(r.id))} would stand on ${name(r.with)}.`;
    case 'on-door':
      return 'That would block the door.';
    case 'slot':
      return `${cap(name(r.id))} needs a place on the wall.`;
    case 'slot-taken':
      return `${cap(name(r.with))} already hangs there.`;
    case 'too-many':
      return r.place === 'floor'
        ? `The floor holds ${ROOM.caps.floor} pieces at most.`
        : `The walls hold ${ROOM.caps.wall} pieces at most.`;
    case 'panel-missing':
      return 'The cupboard, shelf, desk and letterbox always stay in the room.';
    case 'cut-off':
      return `That would block the way to ${name(r.id)}.`;
    case 'style':
      return 'That wallpaper or floor isn’t yours yet.';
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
