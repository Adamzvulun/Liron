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
  byTheWindow,
  PANELS,
  ROOF,
  ROOF_PRICE,
  ROOF_STARTER,
  type PieceDef,
} from './layout.ts';
import { BAD, EXTRA, GOOD, ROOF_BAD, ROOF_GOOD } from './layouts.fixture.ts';
import { cellKey, findPath, reachable } from './path.ts';

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

  it('keeps footprints between 1 × 1 and 3 × 4, rugs up to 6 × 3, wall pieces up to 3 slots', () => {
    for (const d of STARTER_PIECES) {
      const [w, h] = d.size;
      const [mw, mh] = d.place === 'rug' ? [6, 3] : d.place === 'wall' ? [3, 1] : [3, 4];
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
        ...many.map((_, i) => ({ slot: 10 + i, zone: 'left' as const, x: 0, cols: [] })),
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
    // Along the front, then up and round the chest in the corner.
    expect(path).toHaveLength(15);
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
    const desk = must(
      STARTER.pieces.find((p) => p.id === 'home:desk'),
      'desk',
    );
    const [first] = standCells(desk, must(owned.get('home:desk'), 'desk'), ROOM, blocked);
    expect(first).toEqual([8, 1]);
  });

  it('reaches what hangs on the wall from the first free cell below it', () => {
    const lantern = must(
      STARTER.pieces.find((p) => p.id === 'home:lantern'),
      'lantern',
    );
    // The bed stands under the lantern, so you reach up from the foot of the bed.
    expect(standCells(lantern, must(owned.get('home:lantern'), 'lantern'), ROOM, blocked)).toEqual([
      [1, 4],
    ]);
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

describe('the home in the progress store (task 7.3)', () => {
  it('starts as the starter room, and keeps what is saved', async () => {
    const { memoryStore } = await import('../progress/store.ts');
    const store = memoryStore();
    expect(parseLayout(await store.home()) ?? STARTER).toEqual(STARTER);
    const moved = must(
      GOOD.find((g) => g.name === 'the chest moved to the middle'),
      'case',
    ).layout;
    await store.saveHome(moved);
    expect(parseLayout(await store.home())).toEqual(moved);
  });
});

describe('byTheWindow (the-home.md §8)', () => {
  it('stands a host under the window, in the starter room', () => {
    const blocked = blockedCells(STARTER, owned);
    expect(byTheWindow((x, y) => !blocked.has(cellKey([x, y])))).toEqual([5, 0]);
  });

  it('steps aside, then forward, when the cells under the window are taken', () => {
    expect(byTheWindow((x, y) => y > 0 || (x !== 5 && x !== 6))).toEqual([4, 0]);
    expect(byTheWindow((_, y) => y > 1)).toEqual([5, 2]);
  });
});

describe('the roof (task 8.4, §16)', () => {
  // On the roof, only furniture: the starter pieces stay in the house.
  const furniture = new Map<string, PieceDef>(
    (EXTRA as unknown as PieceDef[]).map((d) => [d.id, d]),
  );

  it('is the house’s grid, caps and slots, with its own style and nothing on it', () => {
    expect([ROOF.cols, ROOF.rows, ROOF.door, ROOF.caps, ROOF.slots]).toEqual([
      ROOM.cols,
      ROOM.rows,
      ROOM.door,
      ROOM.caps,
      ROOM.slots,
    ]);
    expect(ROOF_STARTER.pieces).toEqual([]);
    expect([ROOF_STARTER.wallpaper, ROOF_STARTER.floor]).toEqual([
      ROOF.wallpapers[0],
      ROOF.floors[0],
    ]);
    expect(ROOF_PRICE).toBe(15);
  });

  for (const { name, layout } of ROOF_GOOD)
    it(`accepts ${name}`, () => {
      expect(checkLayout(layout, furniture, ROOF)).toBeNull();
    });

  for (const { name, layout, refusal } of ROOF_BAD)
    it(`refuses ${name}`, () => {
      expect(checkLayout(layout, furniture, ROOF)).toEqual(refusal);
    });

  it('needs no panels on the roof, but still in the house', () => {
    expect(checkLayout(ROOF_STARTER, furniture, ROOF)).toBeNull();
    expect(checkLayout({ ...ROOF_STARTER, wallpaper: 'plaster', floor: 'planks' }, owned)).toEqual({
      why: 'panel-missing',
      does: 'wardrobe',
    });
  });

  it('keeps a piece in one room at a time', () => {
    const chair = must(ROOF_GOOD[1], 'case').layout;
    expect(checkLayout(chair, furniture, ROOF, ROOF, new Set(['home-chair']))).toEqual({
      why: 'elsewhere',
      id: 'home-chair',
    });
    const r = { why: 'elsewhere', id: 'home-chair' } as const;
    expect(refusalText(r, owned, 'roof')).toBe(
      'The chair is in your room downstairs. Store it there first.',
    );
    expect(refusalText(r, owned)).toBe('The chair is up on the roof. Store it there first.');
  });

  it('is kept by the progress store once opened, for its gems', async () => {
    const { memoryStore } = await import('../progress/store.ts');
    const store = memoryStore();
    expect(await store.home('roof')).toBeNull();
    await expect(store.saveHome(ROOF_STARTER, 'roof')).rejects.toThrow(/roof closed/);
    await expect(store.openRoof()).rejects.toThrow(/too few gems/);
  });
});
