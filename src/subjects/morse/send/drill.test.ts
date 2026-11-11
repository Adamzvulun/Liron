import { describe, expect, it } from 'vitest';
import { MORSE_CHARS } from '../code.ts';
import { keyableWords, WORD_DRILL, wordDrillText } from './drill.ts';

const first = (n: number) => MORSE_CHARS.slice(0, n).map((c) => c.char);
// A fixed sequence, so a drill comes out the same every time.
const seq = () => {
  let i = 0;
  return () => (((i++ * 0.37) % 1) + 1) % 1;
};

describe('keying words at the telegraph table', () => {
  it('only offers common words made of the letters you have learned', () => {
    const letters = first(8);
    const words = keyableWords(letters);
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      expect(w.length).toBeGreaterThanOrEqual(2);
      expect(w.length).toBeLessThanOrEqual(5);
      expect([...w].every((c) => letters.includes(c))).toBe(true);
    }
  });

  it('waits until enough words can be keyed', () => {
    expect(keyableWords(first(2))).toEqual([]);
    expect(wordDrillText(first(2))).toBeNull();
  });

  it('draws different words, as many as a drill holds', () => {
    const text = wordDrillText(first(MORSE_CHARS.length), seq());
    const words = text?.split(' ') ?? [];
    expect(words).toHaveLength(WORD_DRILL);
    expect(new Set(words).size).toBe(WORD_DRILL);
  });
});
