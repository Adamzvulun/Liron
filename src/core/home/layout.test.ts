import { describe, expect, it } from 'vitest';
import {
  checkLayout,
  parseLayout,
  refusalText,
  ROOM,
  STARTER,
  STARTER_PIECES,
  standCells,
  blockedCells,
  PANELS,
  type PieceDef,
} from './layout.ts';
import { BAD, EXTRA, GOOD } from './layouts.fixture.ts';
import { findPath, reachable } from './path.ts';

function must<T>(v: T | null | undefined, what: string): T {
  if (v === null || v === undefined) throw new Error(`missing ${what}`);
  return v;
}

const owned = new Map<string, PieceDef>(
  [...STARTER_PIECES, ...(EXTRA as unknown as PieceDef[])].map((d) => [d.id, d]),
);

describe('the starter room (the-home.md §3)', () => {
  it('has every starter piece once, and one piece for each panel', () => {
    expect(STARTER.pieces.map((p) => p.id).sort()).toEqual(STARTER_PIECES.map((d) => d.id).sort());
    for (const does of PANELS)
      expect(STARTER_PIECES.filter((d) => d.does === does)).toHaveLength(1);
  });

  it('is a 12 × 5 floor with 6 wall slots and the door on the floor', () => {
    expect([ROOM.cols, ROOM.rows, ROOM.slots.length]).toEqual([12, 5, 6]);
    const [x, y] = ROOM.door;
    expect(x < ROOM.cols && y < ROOM.rows).toBe(true);
  });

  it('keeps footprints between 1 × 1 and 3 × 4, rugs up to 6 × 3', () => {
    for (const d of STARTER_PIECES) {
      const [w, h] = d.size;
      const [mw, mh] = d.place === 'rug' ? [6, 3] : d.place === 'wall' ? [1, 1] : [3, 4];
      expect(w >= 1 && h >= 1 && w <= mw && h <= mh, d.id).toBe(true);
    }
  });
});

describe('checkLayout (the-home.md §6, R6)', () => {
  for (const { name, layout } of GOOD)
    it(`accepts ${name}`, () => {
      expect(checkLayout(layout, owned)).toBeNull();
    });

  for (const { name, layout, refusal } of BAD)
    it(`refuses ${name}`, () => {
      expect(checkLayout(layout, owned)).toEqual(refusal);
    });

  it('counts pieces against the caps', () => {
    const many = Array.from({ length: 7 }, (_, i) => ({
      id: `home-clock-${i}`,
      name: 'clock',
      place: 'wall' as const,
      size: [1, 1] as const,
      does: 'look' as const,
      line: '',
    }));
    const lots = new Map(owned);
    for (const d of many) lots.set(d.id, d);
    const room = {
      ...ROOM,
      slots: [
        ...ROOM.slots,
        ...many.map((_, i) => ({ slot: 10 + i, wall: 'back' as const, below: [] })),
      ],
    };
    const layout = {
      ...STARTER,
      pieces: [...STARTER.pieces, ...many.map((d, i) => ({ id: d.id, slot: 10 + i }))],
    };
    expect(checkLayout(layout, lots, room)).toEqual({ why: 'too-many', place: 'wall' });
  });

  it('says every refusal in words', () => {
    for (const { refusal } of BAD) expect(refusalText(refusal, owned)).toMatch(/^[A-Z].*\.$/);
    expect(refusalText({ why: 'cut-off', id: 'home:cupboard' }, owned)).toBe(
      'That would block the way to the cupboard.',
    );
  });
});

describe('parseLayout', () => {
  it('reads a saved layout and refuses anything else', () => {
    expect(parseLayout(JSON.parse(JSON.stringify(STARTER)))).toEqual(STARTER);
    expect(parseLayout({ ...STARTER, v: 2 })).toBeNull();
    expect(parseLayout({ ...STARTER, extra: 1 })).toBeNull();
    expect(
      parseLayout({ ...STARTER, pieces: [{ id: 'home:bed', at: [-1, 0], facing: 'left' }] }),
    ).toBeNull();
    expect(
      parseLayout({ ...STARTER, pieces: [{ id: 'home:bed', at: [0, 0], facing: 'up' }] }),
    ).toBeNull();
    expect(parseLayout(null)).toBeNull();
  });
});

describe('walking (the-home.md §4, path.ts)', () => {
  const blocked = blockedCells(STARTER, owned);
  const open = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < ROOM.cols && y < ROOM.rows && !blocked.has(`${x},${y}`);

  it('finds the shortest way around the pieces', () => {
    const path = findPath(open, ROOM.door, [11, 4]);
    expect(path).toHaveLength(11);
    expect(path?.at(-1)).toEqual([11, 4]);
    for (const [x, y] of path ?? []) expect(open(x, y)).toBe(true);
  });

  it('walks around the bed, not through it', () => {
    const path = findPath(open, ROOM.door, [3, 0]);
    expect(path).not.toBeNull();
    expect(must(path, 'path').some(([x, y]) => blocked.has(`${x},${y}`))).toBe(false);
  });

  it('gives no way to a covered cell, and none out of a closed corner', () => {
    expect(findPath(open, ROOM.door, [0, 0])).toBeNull();
    const shut = (x: number, y: number) =>
      open(x, y) && !(x === 1 && y === 4) && !(x === 0 && y === 3);
    expect(findPath(shut, ROOM.door, [5, 4])).toBeNull();
    expect(reachable(shut, ROOM.door).size).toBe(1);
  });

  it('is already there when it starts there', () => {
    expect(findPath(open, ROOM.door, ROOM.door)).toEqual([]);
  });

  it('stands in front of a piece first', () => {
    const chest = must(
      STARTER.pieces.find((p) => p.id === 'home:chest'),
      'chest',
    );
    const [first] = standCells(chest, must(owned.get('home:chest'), 'chest'), ROOM, blocked);
    expect(first?.[1]).toBe(4);
  });

  it('reaches every piece that does something from the door, in the starter room', () => {
    const reach = reachable(open, ROOM.door);
    for (const p of STARTER.pieces) {
      const def = must(owned.get(p.id), p.id);
      if (def.does === 'look' || def.place === 'rug') continue;
      expect(
        standCells(p, def, ROOM, blocked).some(([x, y]) => reach.has(`${x},${y}`)),
        p.id,
      ).toBe(true);
    }
  });
});
