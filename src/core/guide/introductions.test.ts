import { describe, expect, it } from 'vitest';
import { CHEAPEST_WARE } from '../player/compass.ts';
import { isInside, nextIntroduction, type IntroFacts } from './introductions.ts';
import { GUIDE_IDS } from './seen.ts';
import { INTRODUCTIONS, PLACE_CARDS } from './words.ts';

// Introductions, one at a time (the-guide.md §3.3, R6–R10; #410).
const newcomer: IntroFacts = {
  gold: 0,
  owned: 0,
  friends: 0,
  roads: [
    { hall: 'tower', done: 1 },
    { hall: 'caravanserai', done: 0 },
  ],
};
const next = (facts: Partial<IntroFacts>, seen: readonly string[] = [GUIDE_IDS.welcome]) => {
  const i = nextIntroduction({ ...newcomer, ...facts }, new Set(seen));
  return i && [i.id, i.spot, i.href];
};
const all = Object.values(GUIDE_IDS);

describe('the next introduction', () => {
  it('waits for the welcome', () => {
    expect(next({}, [])).toBeNull();
  });

  it('starts with the Notice Board', () => {
    expect(next({})).toEqual(['intro:board', 'board', '/notice-board']);
  });

  it('goes in the spec’s order, each when its place becomes useful', () => {
    const seen = [GUIDE_IDS.welcome, GUIDE_IDS.board];
    expect(next({}, seen)).toBeNull();
    expect(next({ friends: 1 }, seen)).toEqual(['intro:fellowship', 'house', '/house']);
    expect(next({ gold: CHEAPEST_WARE - 1 }, seen)).toBeNull();
    expect(next({ gold: CHEAPEST_WARE }, seen)).toEqual(['intro:market', 'market', '/market']);
    expect(next({ owned: 1 }, seen)).toEqual(['intro:wardrobe', 'house', '/house']);
    // A friend comes before the Market, whatever the gold.
    expect(next({ friends: 1, gold: 500 }, seen)?.[0]).toBe('intro:fellowship');
  });

  it('points at the hall not yet begun once the other road is three steps in', () => {
    const seen = [GUIDE_IDS.welcome, GUIDE_IDS.board];
    expect(
      next(
        {
          roads: [
            { hall: 'tower', done: 2 },
            { hall: 'caravanserai', done: 0 },
          ],
        },
        seen,
      ),
    ).toBeNull();
    expect(
      next(
        {
          roads: [
            { hall: 'tower', done: 3 },
            { hall: 'caravanserai', done: 0 },
          ],
        },
        seen,
      ),
    ).toEqual(['intro:other-hall', 'caravanserai', '/caravanserai']);
    expect(
      next(
        {
          roads: [
            { hall: 'tower', done: 0 },
            { hall: 'caravanserai', done: 4 },
          ],
        },
        seen,
      ),
    ).toEqual(['intro:other-hall', 'tower', '/signal-tower']);
    // Both begun: nothing to introduce.
    expect(
      next(
        {
          roads: [
            { hall: 'tower', done: 3 },
            { hall: 'caravanserai', done: 1 },
          ],
        },
        seen,
      ),
    ).toBeNull();
  });

  it('brings in the Arena with a friend and five steps, and the ledger at ten', () => {
    const seen = [GUIDE_IDS.welcome, GUIDE_IDS.board, GUIDE_IDS.fellowship];
    const steps = (a: number, b: number) => ({
      roads: [
        { hall: 'tower' as const, done: a },
        { hall: 'caravanserai' as const, done: b },
      ],
    });
    expect(next({ friends: 1, ...steps(2, 2) }, seen)).toBeNull();
    expect(next({ friends: 1, ...steps(3, 2) }, seen)).toEqual(['intro:arena', 'arena', '/arena']);
    expect(next({ ...steps(3, 2) }, seen)).toBeNull();
    expect(next({ ...steps(5, 5) }, seen)).toEqual(['intro:ledger', 'house', '/house']);
  });

  it('has nothing left once everything is introduced', () => {
    expect(
      next({ friends: 2, gold: 900, owned: 3, roads: [{ hall: 'tower', done: 40 }] }, all),
    ).toBeNull();
  });
});

describe('going in', () => {
  it('counts the place and the pages under it', () => {
    const house = nextIntroduction({ ...newcomer, owned: 1 }, new Set(['welcome', 'intro:board']));
    if (!house) throw new Error('expected the wardrobe');
    expect(isInside(house, '/house')).toBe(true);
    expect(isInside(house, '/house/fellowship')).toBe(true);
    expect(isInside(house, '/houses')).toBe(false);
    expect(isInside(house, '/')).toBe(false);
  });
});

describe('Nour’s words for the introductions', () => {
  it('has a line for every introduction, and no other', () => {
    const intros = all.filter((id) => id.startsWith('intro:')).sort();
    expect(Object.keys(INTRODUCTIONS.lines).sort()).toEqual(intros);
  });
});

describe('the platform’s first-visit cards (#411)', () => {
  it('say what each place is for in two sentences or less', () => {
    for (const { text } of Object.values(PLACE_CARDS)) {
      expect(text.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(2);
    }
  });
});
