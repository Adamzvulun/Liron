import { describe, expect, it } from 'vitest';
import { ALL, floorAt, ownedPieces, pieceAt, placeFor, wallAt } from './decorate.ts';
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
