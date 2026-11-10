import { describe, expect, it } from 'vitest';
import { needLine } from '../core/ranks/ranks.ts';
import { arabicStanding, SLATE_IDS } from './arabic/ranks.ts';
import { NEW_PROGRESS as ARABIC_NEW, type ArabicProgress } from './arabic/progress.ts';
import { PHRASE_SETS } from './arabic/phrases/sets.ts';
import { MORSE_CHARS } from './morse/code.ts';
import { NEW_PROGRESS as MORSE_NEW } from './morse/lesson/progress.ts';
import { morseStanding } from './morse/ranks.ts';

describe('the Signal Tower’s ranks (#174)', () => {
  it('starts every player as an Initiate, on the way to Listener', () => {
    const s = morseStanding(MORSE_NEW);
    expect(s.rank.name).toBe('Initiate');
    expect(s.next?.name).toBe('Listener');
    expect(needLine(s)).toMatch(/^0 of 2 · /);
  });

  it('makes you a Listener with all 41 characters and the Beacon’s Answer passed', () => {
    const all = { ...MORSE_NEW, unlocked: MORSE_CHARS.length };
    expect(morseStanding(all).rank.id).toBe('initiate');
    const s = morseStanding({ ...all, trials: [1, 2, 3, 4, 5] });
    expect(s.rank.id).toBe('listener');
    // Keyer needs the Lamp Signal (#175): it waits, and says so.
    expect(s.next?.id).toBe('keyer');
    expect(s.later).toBe(true);
  });
});

describe('the House of the Crossing’s ranks (#174)', () => {
  const traveler: ArabicProgress = {
    ...ARABIC_NEW,
    done: true,
    guest: true,
    phraseSet: PHRASE_SETS.length + 1,
    written: [...SLATE_IDS],
    words: { ...ARABIC_NEW.words, chapter: 11, trials: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  };

  it('starts every player as a Stranger, and passing the Painted Sign makes you a Guest', () => {
    expect(arabicStanding(ARABIC_NEW).rank.id).toBe('stranger');
    expect(arabicStanding({ ...ARABIC_NEW, done: true }).rank.id).toBe('stranger');
    expect(arabicStanding({ ...ARABIC_NEW, done: true, guest: true }).rank.id).toBe('guest');
  });

  it('makes you a Traveler only with all four of its conditions', () => {
    expect(arabicStanding(traveler).rank.id).toBe('traveler');
    const missing: Partial<ArabicProgress>[] = [
      { words: { ...traveler.words, chapter: 10 } },
      { phraseSet: PHRASE_SETS.length },
      { written: SLATE_IDS.slice(1) },
      { words: { ...traveler.words, trials: [2, 3] } },
    ];
    for (const m of missing) {
      const s = arabicStanding({ ...traveler, ...m });
      expect(s.rank.id).toBe('guest');
      expect(s.checks.filter((c) => !c.done)).toHaveLength(1);
    }
  });

  it('teaches the 28 letters and the extras on the slate, but not the lam-alef ligature', () => {
    expect(SLATE_IDS).toHaveLength(31);
    expect(SLATE_IDS.slice(-3)).toEqual([
      'letter:teh-marbuta',
      'letter:hamza',
      'letter:alef-maqsura',
    ]);
  });
});
