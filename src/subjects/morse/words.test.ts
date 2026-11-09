import { describe, expect, it } from 'vitest';
import { MORSE_CHARS, codeFor } from './code.ts';
import { MORSE_WORDS, PROSIGNS, openWords, wordSeed, written } from './words.ts';

const KOCH = MORSE_CHARS.map((c) => c.char);

describe('Morse words (#153)', () => {
  it('only uses characters the tower teaches', () => {
    for (const w of MORSE_WORDS)
      for (const c of w.text) expect(codeFor(c), `${w.id}: ${c}`).toBeDefined();
  });

  it('has unique texts per kind and a meaning for all shorthand', () => {
    const keys = MORSE_WORDS.map((w) => `${w.kind}:${w.text}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const w of MORSE_WORDS) if (w.kind !== 'word') expect(w.meaning, w.id).toBeTruthy();
  });

  it('lists common words by frequency rank', () => {
    const ranks = MORSE_WORDS.filter((w) => w.kind === 'word').map((w) => w.rank);
    expect(ranks).toEqual(ranks.map((_, i) => i + 1));
  });

  it('has the four prosigns with their ITU codes', () => {
    expect(PROSIGNS.map((p) => [p.text, p.code])).toEqual([
      ['AR', '.-.-.'],
      ['SK', '...-.-'],
      ['BT', '-...-'],
      ['KN', '-.--.'],
    ]);
    expect(PROSIGNS.map(written)[0]).toBe('<AR>');
    // BT sounds the same as =, which Koch teaches.
    expect(PROSIGNS[2]?.code).toBe(codeFor('='));
  });

  it('opens a word only once all its characters are unlocked', () => {
    const ch1 = openWords(KOCH.slice(0, 8));
    expect(ch1).toHaveLength(20);
    expect(ch1.map((w) => w.text)).toContain('ARE');
    expect(ch1.map((w) => w.text)).not.toContain('THE');
    expect(ch1.map((w) => w.text)).toContain('AR');
    expect(openWords(KOCH)).toHaveLength(MORSE_WORDS.length);
    expect(openWords(['K', 'M']).map((w) => w.text)).toEqual(['K']);
  });

  it('seeds common words easier than shorthand', () => {
    const by = (id: string) => {
      const w = MORSE_WORDS.find((x) => x.id === id);
      if (!w) throw new Error(id);
      return w;
    };
    expect(wordSeed(by('word:the'))).toBeLessThan(wordSeed(by('abbr:fb')));
    expect(wordSeed(by('abbr:fb'))).toBeLessThan(wordSeed(by('abbr:qth')));
    expect(wordSeed(by('prosign:ar'))).toBe(1100);
  });
});
