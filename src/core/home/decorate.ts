// The rules of placing a piece while decorating (task 7.7, docs/game/the-home.md §6): where a
// piece goes for a press in the room, and which piece a press picks up.
import {
  cellsOf,
  FURNITURE_PIECES,
  isFloor,
  ROOM,
  slotsOf,
  STARTER_PIECES,
  type Layout,
  type PieceDef,
  type Placed,
} from './layout.ts';
import type { Cell } from './path.ts';
import type { Spot } from './Room.tsx';

export const ALL: ReadonlyMap<string, PieceDef> = new Map(
  [...STARTER_PIECES, ...FURNITURE_PIECES].map((d) => [d.id, d]),
);

/** The starter pieces, and the furniture the player owns: what they may place. */
export function ownedPieces(owned: readonly string[]): ReadonlyMap<string, PieceDef> {
  const mine = new Set(owned);
  return new Map(
    [...STARTER_PIECES, ...FURNITURE_PIECES.filter((d) => mine.has(d.id))].map((d) => [d.id, d]),
  );
}

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * A floor piece put down around a cell: centered on its column, its front row on the cell's row,
 * kept on the floor, and facing the middle of the room (§6).
 */
export function floorAt(def: PieceDef, [c, r]: Cell): Placed {
  const [w, d] = def.size;
  const x = clamp(c - Math.floor((w - 1) / 2), 0, ROOM.cols - w);
  const y = clamp(r - (d - 1), 0, ROOM.rows - d);
  return { id: def.id, at: [x, y], facing: x + w / 2 <= ROOM.cols / 2 ? 'right' : 'left' };
}

/** A wall piece hung from a slot, moved along so it stays on its side of the window. */
export function wallAt(def: PieceDef, slot: number): Placed {
  const first = ROOM.slots.find((s) => s.slot === slot);
  const zone = ROOM.slots.filter((s) => s.zone === first?.zone).map((s) => s.slot);
  const lo = Math.min(...zone);
  const hi = Math.max(...zone) - def.size[0] + 1;
  return { id: def.id, slot: clamp(slot, lo, Math.max(lo, hi)) };
}

/** Where a held piece goes for a press in the room, or null when it can't go there at all. */
export function placeFor(def: PieceDef, spot: Spot): Placed | null {
  if (def.place === 'wall') {
    if ('slot' in spot) return wallAt(def, spot.slot);
    // A cell under the wall: the slot above its column.
    const above = ROOM.slots.find((s) => s.cols.includes(spot.cell[0]));
    return above ? wallAt(def, above.slot) : null;
  }
  return 'cell' in spot ? floorAt(def, spot.cell) : null;
}

/** The piece at a press: a floor piece before a rug under it, or what hangs in a slot. */
export function pieceAt(layout: Layout, spot: Spot): Placed | null {
  if ('slot' in spot) {
    return (
      layout.pieces.find((p) => {
        const def = ALL.get(p.id);
        return (
          def && !isFloor(p) && (slotsOf(p, def, ROOM) ?? []).some((s) => s.slot === spot.slot)
        );
      }) ?? null
    );
  }
  const [x, y] = spot.cell;
  const under = layout.pieces.filter((p) => {
    const def = ALL.get(p.id);
    return def && isFloor(p) && cellsOf(p, def).some((c) => c[0] === x && c[1] === y);
  });
  return under.find((p) => ALL.get(p.id)?.place === 'floor') ?? under[0] ?? null;
}
