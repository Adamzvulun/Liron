import { describe, expect, it } from 'vitest';
import { endsSentence, longChoices, LONG_CHOICE } from './questions.ts';

describe('choice and answer wording (review, 2026-11-15)', () => {
  it('stacks the choices once one of them is sentence-long', () => {
    expect(longChoices(['yes', 'no', 'thank you', 'sorry'])).toBe(false);
    expect(
      longChoices(['yes', 'I can’t hear what they’re saying. Could you turn it up a bit?']),
    ).toBe(true);
    expect(longChoices(['x'.repeat(LONG_CHOICE)])).toBe(false);
    expect(longChoices(['x'.repeat(LONG_CHOICE + 1)])).toBe(true);
  });

  it('knows an answer that already ends a sentence', () => {
    expect(endsSentence('You can just drop me off on the corner.')).toBe(true);
    expect(endsSentence('How are you?')).toBe(true);
    expect(endsSentence('Praise God!')).toBe(true);
    expect(endsSentence('God give his family patience. (said when someone has died)')).toBe(false);
    expect(endsSentence('كيفك؟')).toBe(true);
    expect(endsSentence('thank you')).toBe(false);
    expect(endsSentence('you (to a man)')).toBe(false);
  });
});
