import { describe, expect, it } from 'vitest';
import { needLine } from '../core/ranks/ranks.ts';
import { GEAR } from '../core/avatar/looks.ts';
import catalogue from '../../content/core/items.json' with { type: 'json' };
import { ARABIC_RANKS, arabicStanding, SLATE_IDS } from './arabic/ranks.ts';
import { NEW_PROGRESS as ARABIC_NEW, type ArabicProgress } from './arabic/progress.ts';
import { PHRASE_SETS } from './arabic/phrases/sets.ts';
import { MORSE_CHARS } from './morse/code.ts';
import { NEW_PROGRESS as MORSE_NEW } from './morse/lesson/progress.ts';
import { MORSE_RANKS, morseStanding } from './morse/ranks.ts';

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
    expect(s.next?.id).toBe('keyer');
    expect(s.later).toBe(false);
  });

  it('makes you a Keyer with 20 drills, a 15 wpm fist and the Lamp Signal (#175)', () => {
    const listener = { ...MORSE_NEW, unlocked: MORSE_CHARS.length, trials: [1, 2, 3, 4, 5] };
    const keyer = {
      ...listener,
      sending: { drills: 20, ditMs: 80 },
      rankTrials: ['lamp-signal'],
    };
    expect(morseStanding(keyer).rank.id).toBe('keyer');
    // Operator waits on the Far Station (#178), and says so.
    expect(morseStanding(keyer).later).toBe(true);
    const slow = morseStanding({ ...keyer, sending: { drills: 20, ditMs: 90 } });
    expect(slow.rank.id).toBe('listener');
    expect(needLine(slow)).toBe('2 of 3 · Send at 15 wpm or faster');
  });

  it('the Night Watch is the Telegraphist’s condition, but the ladder waits on Operator (#179)', () => {
    const watched = {
      ...MORSE_NEW,
      unlocked: MORSE_CHARS.length,
      trials: [1, 2, 3, 4, 5],
      sending: { drills: 20, ditMs: 80 },
      rankTrials: ['lamp-signal', 'night-watch'],
    };
    // Ranks are taken in order: Operator (the Far Station, #178) comes first.
    expect(morseStanding(watched).rank.id).toBe('keyer');
    expect(morseStanding(watched).next?.id).toBe('operator');
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

describe('rank gear (#176)', () => {
  it('names, for each rank that has one, a piece the catalogue gives for that rank', () => {
    const pack = catalogue as {
      items: {
        id: string;
        data: { milestone?: { kind: string; subject?: string; rank?: string } };
      }[];
    };
    const given = [
      ...MORSE_RANKS.map((r) => ['morse', r] as const),
      ...ARABIC_RANKS.map((r) => ['arabic', r] as const),
    ].filter(([, r]) => r.gear);
    expect(given.map(([, r]) => r.gear).sort()).toEqual(
      pack.items
        .filter((i) => i.data.milestone?.kind === 'rank')
        .map((i) => i.id)
        .sort(),
    );
    for (const [subject, r] of given) {
      expect(GEAR.find((g) => g.id === r.gear)).toBeTruthy();
      expect(pack.items.find((i) => i.id === r.gear)?.data.milestone).toEqual({
        kind: 'rank',
        subject,
        rank: r.id,
      });
    }
  });
});
