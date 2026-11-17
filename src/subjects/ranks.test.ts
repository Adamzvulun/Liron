import { describe, expect, it } from 'vitest';
import { needLine } from '../core/ranks/ranks.ts';
import { GEAR } from '../core/avatar/looks.ts';
import catalogue from '../../content/core/items.json' with { type: 'json' };
import {
  ARABIC_RANKS,
  arabicStanding,
  FRIEND_CHATS,
  FRIEND_WORDS,
  LOCAL_LINES,
  LOCAL_WORDS,
  NEIGHBOR_LINES,
  SLATE_IDS,
  STORY_FRIENDS,
} from './arabic/ranks.ts';
import { NEW_PROGRESS as ARABIC_NEW, type ArabicProgress } from './arabic/progress.ts';
import { PHRASE_SETS } from './arabic/phrases/sets.ts';
import { MORSE_CHARS } from './morse/code.ts';
import { NEW_PROGRESS as MORSE_NEW, type MorseProgress } from './morse/lesson/progress.ts';
import { GHOST_DIT_MS, GHOST_WPM, MORSE_RANKS, morseStanding } from './morse/ranks.ts';
import { PROSIGNS } from './morse/words.ts';

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
    expect(morseStanding(keyer).next?.id).toBe('operator');
    const slow = morseStanding({ ...keyer, sending: { drills: 20, ditMs: 90 } });
    expect(slow.rank.id).toBe('listener');
    expect(needLine(slow)).toBe('2 of 3 · Send at 15 wpm or faster');
  });

  it('makes you an Operator with the four prosigns and the Far Station passed (#178)', () => {
    const keyer = {
      ...MORSE_NEW,
      unlocked: MORSE_CHARS.length,
      trials: [1, 2, 3, 4, 5],
      sending: { drills: 20, ditMs: 80 },
      rankTrials: ['lamp-signal', 'far-station'],
    };
    const s = morseStanding(keyer);
    expect(s.rank.id).toBe('keyer');
    expect(needLine(s)).toBe('1 of 2 · Copy all four prosigns in the Codebook');
    const operator = morseStanding({ ...keyer, prosigns: PROSIGNS.map((p) => p.id) });
    expect(operator.rank.id).toBe('operator');
    expect(operator.next?.id).toBe('telegraphist');
  });

  it('makes you a Telegraphist with the Night Watch, after Operator (#179)', () => {
    const watched = {
      ...MORSE_NEW,
      unlocked: MORSE_CHARS.length,
      trials: [1, 2, 3, 4, 5],
      sending: { drills: 20, ditMs: 80 },
      rankTrials: ['lamp-signal', 'night-watch'],
    };
    // Ranks are taken in order: without the Far Station, the watch waits.
    expect(morseStanding(watched).rank.id).toBe('keyer');
    const all = {
      ...watched,
      prosigns: PROSIGNS.map((p) => p.id),
      rankTrials: ['lamp-signal', 'far-station', 'night-watch'],
    };
    expect(morseStanding(all).rank.id).toBe('telegraphist');
  });

  it('makes you a Ghost with head copy and sending at 30 wpm, after Signal Master (2026-11-15)', () => {
    const master: MorseProgress = {
      ...MORSE_NEW,
      unlocked: MORSE_CHARS.length,
      trials: [1, 2, 3, 4, 5],
      sending: { drills: 20, ditMs: 80 },
      prosigns: PROSIGNS.map((p) => p.id),
      rankTrials: ['lamp-signal', 'far-station', 'night-watch'],
      radio: { ...MORSE_NEW.radio, cleanFast: true },
    };
    expect(morseStanding(master).rank.id).toBe('signal-master');
    // Nothing in the guild is "comes later" any more.
    expect(MORSE_RANKS.every((r) => !r.later)).toBe(true);
    const fast = {
      ...master,
      rush: { ...master.rush, topWpm: GHOST_WPM },
      sending: { drills: 21, ditMs: GHOST_DIT_MS },
    };
    expect(morseStanding(fast).rank.id).toBe('ghost');
    expect(morseStanding({ ...fast, rush: { ...fast.rush, topWpm: 29 } }).rank.id).toBe(
      'signal-master',
    );
    expect(morseStanding({ ...fast, sending: { drills: 21, ditMs: 41 } }).rank.id).toBe(
      'signal-master',
    );
    // The fastest drill counts, not the last one (review, 2026-11-15).
    expect(
      morseStanding({ ...fast, sending: { drills: 22, ditMs: 60, fastest: 40 } }).rank.id,
    ).toBe('ghost');
  });

  it('keeps a rank you have taken when a condition later reads lower', () => {
    // A Keyer whose last drill was slow (and whose old progress has no fastest dit) is still a
    // Keyer once the rank is taken; before it's taken, the slow drill counts.
    const slowKeyer = {
      ...MORSE_NEW,
      unlocked: MORSE_CHARS.length,
      trials: [1, 2, 3, 4, 5],
      rankTrials: ['lamp-signal'],
      sending: { drills: 25, ditMs: 120 },
    };
    expect(morseStanding(slowKeyer).rank.id).toBe('listener');
    const taken = { ...slowKeyer, ranks: ['listener', 'keyer'] };
    expect(morseStanding(taken).rank.id).toBe('keyer');
    expect(morseStanding(taken).next?.id).toBe('operator');
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

  it('earns Neighbor, Friend, Local and Storyteller at the inn’s table (2026-11-15)', () => {
    const met = (n: number) => Array.from({ length: n }, (_, i) => `pcav:${i}`);
    const at = (chat: Partial<ArabicProgress['chat']>, words = 0): ArabicProgress => ({
      ...traveler,
      words: { ...traveler.words, met: met(words) },
      chat: { ...traveler.chat, ...chat },
    });
    // Nothing is "comes later" any more: every rank can be reached.
    expect(ARABIC_RANKS.every((r) => !r.later)).toBe(true);
    expect(arabicStanding(at({ best: NEIGHBOR_LINES - 1 })).rank.id).toBe('traveler');
    expect(arabicStanding(at({ best: NEIGHBOR_LINES })).rank.id).toBe('neighbor');
    const friend = at({ best: NEIGHBOR_LINES, chats: FRIEND_CHATS }, FRIEND_WORDS);
    expect(arabicStanding(friend).rank.id).toBe('friend');
    expect(arabicStanding({ ...friend, chat: { ...friend.chat, chats: 19 } }).rank.id).toBe(
      'neighbor',
    );
    const local = at({ best: LOCAL_LINES, chats: FRIEND_CHATS }, LOCAL_WORDS);
    expect(arabicStanding(local).rank.id).toBe('local');
    const old = Object.fromEntries([2, 3, 4, 5, 6].map((n) => [String(n), 5]));
    expect(arabicStanding({ ...local, chat: { ...local.chat, met: old } }).rank.id).toBe(
      'storyteller',
    );
    // Four old friends are not enough.
    const four = Object.fromEntries([2, 3, 4, 5].map((n) => [String(n), 9]));
    expect(arabicStanding({ ...local, chat: { ...local.chat, met: four } }).rank.id).toBe('local');
    expect(STORY_FRIENDS).toBe(5);
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
