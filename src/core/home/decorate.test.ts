import { describe, expect, it } from 'vitest';
import { ALL, floorAt, ownedPieces, pieceAt, placeFor, turn, wallAt } from './decorate.ts';
import { STARTER, type PieceDef } from './layout.ts';

// Where a held piece goes, and what a press picks up (task 7.7, the-home.md §6).
const def = (id: string) => ALL.get(id) as PieceDef;

describe('placing a piece', () => {
  it('centers a floor piece on the cell, its front row there, kept on the floor', () => {
    expect(floorAt(def('home:chest'), [6, 4])).toEqual({
      id: 'home:chest',
      at: [6, 3],
      facing: 'left',
    });
    // The bed (3 by 4) at the left edge stays on the floor, and faces the middle.
    expect(floorAt(def('home:bed'), [0, 0])).toEqual({
      id: 'home:bed',
      at: [0, 0],
      facing: 'right',
    });
    expect(floorAt(def('home-bench'), [11, 4])).toEqual({
      id: 'home-bench',
      at: [9, 4],
      facing: 'left',
    });
  });

  it('keeps a wide wall piece on its side of the window', () => {
    // The shelf is three slots wide: on the right, it can only hang from slot 3.
    expect(wallAt(def('home:shelf'), 5)).toEqual({ id: 'home:shelf', slot: 3 });
    expect(wallAt(def('home:shelf'), 1)).toEqual({ id: 'home:shelf', slot: 0 });
    expect(wallAt(def('home:lantern'), 4)).toEqual({ id: 'home:lantern', slot: 4 });
  });

  it('hangs a wall piece from the slot above a tapped cell, and a floor piece never on the wall', () => {
    expect(placeFor(def('home:lantern'), { cell: [10, 2] })).toEqual({
      id: 'home:lantern',
      slot: 4,
    });
    expect(placeFor(def('home:lantern'), { cell: [6, 2] })).toBeNull();
    expect(placeFor(def('home:chest'), { slot: 2 })).toBeNull();
  });
});

describe('picking a piece up', () => {
  it('takes the piece standing on a rug before the rug, and what hangs in a slot', () => {
    expect(pieceAt(STARTER, { cell: [5, 3] })?.id).toBe('home:rug');
    const chair = { id: 'home-chair', at: [5, 3] as [number, number], facing: 'left' as const };
    expect(pieceAt({ ...STARTER, pieces: [...STARTER.pieces, chair] }, { cell: [5, 3] })?.id).toBe(
      'home-chair',
    );
    expect(pieceAt(STARTER, { slot: 4 })?.id).toBe('home:shelf');
    expect(pieceAt(STARTER, { cell: [6, 0] })).toBeNull();
  });

  it('lets a player place the starter pieces and only the furniture they own', () => {
    const mine = ownedPieces(['home-chair', 'gear-hat']);
    expect(mine.has('home:bed')).toBe(true);
    expect(mine.has('home-chair')).toBe(true);
    expect(mine.has('home-plant')).toBe(false);
    expect(mine.has('gear-hat')).toBe(false);
  });
});

describe('turning a piece (task 8.3)', () => {
  const chair = ALL.get('home-chair');
  it('takes a chair from facing the room through its three turns, and back', () => {
    if (!chair) throw new Error('no chair');
    let p = floorAt(chair, [2, 2]);
    expect(p.facing).toBe('right');
    const seen = [];
    for (let i = 0; i < 4; i++) {
      const next = turn(chair, p);
      if (!next) throw new Error('did not turn');
      p = next;
      seen.push(p.facing);
    }
    expect(seen).toEqual(['to-right', 'away', 'to-left', 'right']);
  });

  it('keeps a turn as the piece moves, and faces the room again otherwise', () => {
    if (!chair) throw new Error('no chair');
    expect(floorAt(chair, [9, 2], 'away').facing).toBe('away');
    expect(floorAt(chair, [9, 2], 'right').facing).toBe('left');
    expect(placeFor(chair, { cell: [9, 2] }, 'to-left')).toMatchObject({ facing: 'to-left' });
  });

  it('turns only what can: the window seat two ways, the bench and the bed not at all', () => {
    const seat = ALL.get('home-window-seat');
    if (!seat) throw new Error('no seat');
    const p = floorAt(seat, [2, 2]);
    expect(turn(seat, p)?.facing).toBe('away');
    expect(turn(seat, { ...p, facing: 'away' })?.facing).toBe('right');
    expect(turn(def('home-bench'), floorAt(def('home-bench'), [2, 2]))).toBeNull();
    expect(turn(def('home:bed'), floorAt(def('home:bed'), [0, 0]))).toBeNull();
  });
});
