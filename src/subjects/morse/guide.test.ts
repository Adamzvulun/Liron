import { describe, expect, it } from 'vitest';
import { CARD_KEYS, CARD_WORDS, cardFor } from './guide.ts';

// First-visit cards (the-guide.md §3.4, #411).
describe('the morse hall’s first-visit cards', () => {
  it('has words for every station that shows one, and none to spare', () => {
    expect([...CARD_WORDS.keys()].sort()).toEqual([...new Set(CARD_KEYS)].sort());
  });

  it('says what a place is for in two sentences or less', () => {
    for (const { text } of CARD_WORDS.values()) {
      expect(text.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(2);
    }
  });

  it('gives each card an id the account can save', () => {
    expect(cardFor('hall')?.id).toBe('card:morse:hall');
    expect(cardFor('no-such-view')).toBeNull();
  });
});
