import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK } from '../avatar/looks.ts';
import { GUIDE_IDS, cardId, guideSeen } from './seen.ts';

describe('what the guide counts as seen (the-guide.md §4, R10)', () => {
  it('a new friend has seen nothing', () => {
    const seen = guideSeen({ saved: [], owned: [], avatar: DEFAULT_LOOK });
    expect([...seen]).toEqual([]);
  });

  it('keeps what was saved', () => {
    const seen = guideSeen({ saved: ['welcome', 'intro:board'], owned: [], avatar: DEFAULT_LOOK });
    expect(seen.has(GUIDE_IDS.welcome)).toBe(true);
    expect(seen.has(GUIDE_IDS.board)).toBe(true);
  });

  it("Adam's case: welcome saved by the migration, gear owned, a new look", () => {
    const seen = guideSeen({
      saved: ['welcome'],
      owned: ['tunic'],
      avatar: { ...DEFAULT_LOOK, hair: 'curly' },
    });
    expect(seen.has(GUIDE_IDS.welcome)).toBe(true);
    expect(seen.has(GUIDE_IDS.market)).toBe(true);
    expect(seen.has(cardId('market'))).toBe(true);
    expect(seen.has(GUIDE_IDS.wardrobe)).toBe(true);
    // The Notice Board can't be known from state, so it is still to come.
    expect(seen.has(GUIDE_IDS.board)).toBe(false);
  });

  it('gear owned but the look untouched: the wardrobe is still to come', () => {
    const seen = guideSeen({ saved: [], owned: ['tunic'], avatar: DEFAULT_LOOK });
    expect(seen.has(GUIDE_IDS.market)).toBe(true);
    expect(seen.has(GUIDE_IDS.wardrobe)).toBe(false);
  });

  it('ids are short and plain, as the database requires', () => {
    for (const id of [...Object.values(GUIDE_IDS), cardId('morse', 'listen')]) {
      expect(id).toMatch(/^[a-z0-9:-]{1,64}$/);
    }
  });
});
