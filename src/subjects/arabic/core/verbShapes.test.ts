import { describe, expect, it } from 'vitest';
import pack from '../../../../content/arabic/verb-shapes.json' with { type: 'json' };
import { MATES, shapeMates, type CoreWord } from './coreWords.ts';
import { BINYAN, BINYANIM, VERB_SHAPES } from './verbShapes.ts';
import { WORD_CHAPTERS } from './wordChapters.ts';

describe('verb shapes (ADR 0002)', () => {
  const taught = new Map(WORD_CHAPTERS.flatMap((c) => c.words.map((w) => [w.deck, w.gloss])));

  it('names, once each, a taught verb and the binyan its shape matches', () => {
    expect(VERB_SHAPES.size).toBe(pack.items.length);
    for (const deck of VERB_SHAPES.keys()) expect(taught.get(deck)).toMatch(/^to /);
  });

  it('pairs the classic ones, and uses every binyan it names', () => {
    expect(VERB_SHAPES.get('pcav:1447')).toBe('hitpael'); // it3állam, to learn
    expect(VERB_SHAPES.get('pcav:0005')).toBe('nifal'); // inwálad, to be born: נולד
    expect(VERB_SHAPES.get('pcav:0739')).toBe('piel'); // ráttab, to tidy up
    expect(VERB_SHAPES.get('pcav:4612')).toBe('hifil'); // á3ʈa, to give
    expect(new Set(VERB_SHAPES.values())).toEqual(new Set(BINYANIM));
    // The t- after the first letter (ištáɣal, to work) has no binyan of its own: left out.
    expect(VERB_SHAPES.has('pcav:1294')).toBe(false);
  });

  it('keeps the badge short enough for one line on a phone', () => {
    for (const b of Object.values(BINYAN))
      expect(
        `Shaped like ${b.name}, ${b.example} ▾`.replace(/\p{M}/gu, '').length,
      ).toBeLessThanOrEqual(30);
  });
});

describe('the verbs a badge opens to', () => {
  const verb = (deck: string, chapter: number, shape?: CoreWord['shape']): CoreWord => ({
    deck,
    itemId: `word:${deck}`,
    chapter,
    arabic: deck,
    latin: '',
    hebrew: '',
    meaning: `to ${deck}`,
    audio: '',
    ...(shape ? { shape } : {}),
  });

  it('are the same shape, from this chapter or before, latest first, not the word itself', () => {
    const word = verb('a', 5, 'piel');
    const pool = [
      word,
      verb('b', 2, 'piel'),
      verb('c', 5, 'piel'),
      verb('d', 9, 'piel'),
      verb('e', 3, 'hitpael'),
      verb('f', 1),
    ];
    expect(shapeMates(word, pool).map((w) => w.deck)).toEqual(['c', 'b']);
    expect(shapeMates(verb('x', 5), pool)).toEqual([]);
  });

  it('are at most MATES', () => {
    const pool = Array.from({ length: 20 }, (_, i) => verb(`v${i}`, 1, 'piel'));
    expect(shapeMates(verb('w', 1, 'piel'), pool)).toHaveLength(MATES);
  });
});
