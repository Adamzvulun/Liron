import { describe, expect, it } from 'vitest';
import { heldRanks, needLine, ranksFrom, standing } from './ranks.ts';

const pack = {
  items: [
    { id: 'rank:b', type: 'rank', data: { order: 2, name: 'B', conditions: ['x', 'y'] } },
    { id: 'rank:a', type: 'rank', data: { order: 1, name: 'A', conditions: ['join'] } },
    { id: 'rank:d', type: 'rank', data: { order: 4, name: 'D', conditions: ['w'] } },
    {
      id: 'rank:c',
      type: 'rank',
      data: { order: 3, name: 'C', conditions: ['z'], later: 'Comes with the keyer' },
    },
    { id: 'other', type: 'note', data: {} },
  ],
};
const ranks = ranksFrom(pack);

describe('ranks', () => {
  it('reads the ladder in order, without the rank: prefix', () => {
    expect(ranks.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('holds the first rank always, and shows the next one’s checks', () => {
    const s = standing(ranks, (r) =>
      r.id === 'b' ? [true, false] : r.conditions.map(() => false),
    );
    expect(s.rank.id).toBe('a');
    expect(s.next?.id).toBe('b');
    expect(s.checks).toEqual([
      { text: 'x', done: true },
      { text: 'y', done: false },
    ]);
    expect(needLine(s)).toBe('1 of 2 · y');
    expect(heldRanks(ranks, s)).toEqual([]);
  });

  it('climbs while every condition is met, and stops at a rank that comes later', () => {
    const s = standing(ranks, (r) => r.conditions.map(() => true));
    expect(s.rank.id).toBe('b');
    expect(s.next?.id).toBe('c');
    expect(s.later).toBe(true);
    expect(needLine(s)).toBe('Comes with the keyer');
    expect(heldRanks(ranks, s).map((r) => r.id)).toEqual(['b']);
  });

  it('says when you are at the top', () => {
    const one = ranksFrom({ items: pack.items.slice(1, 2) });
    const s = standing(one, () => []);
    expect(s.next).toBeUndefined();
    expect(needLine(s)).toBe('The top of the guild');
  });
});
