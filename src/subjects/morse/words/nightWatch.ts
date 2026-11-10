// The Night Watch (#179, E13): the Telegraphist's trial. Twenty common words at a full 20 wpm,
// each heard once, with no AGN; copy at least 18. Design: docs/game/ranks-and-achievements.md §2.

import type { SubjectApi } from '../../../core/subject.ts';
import type { MorseProgress } from '../lesson/progress.ts';
import { MORSE_WORDS, type MorseWord } from '../words.ts';
import { isRight, type WordAttempt } from './drill.ts';

export const WATCH_ID = 'night-watch';
export const WATCH_WORDS = 20;
export const WATCH_PASS = 18;
/** The words play at 20 wpm with no extra spacing: real head-copy speed. */
export const WATCH_WPM = 20;
/** A first pass, like the Lamp Signal; any other watch still earns a little. */
export const WATCH_XP = { pass: 60, try: 10 };

/** The words it draws from: the 100 commonest. */
export const WATCH_POOL: readonly MorseWord[] = MORSE_WORDS.filter(
  (w) => w.kind === 'word' && (w.rank ?? 999) <= 100,
);

/** Twenty different words from the pool, in the order they play. */
export function watchWords(random: () => number = Math.random, size = WATCH_WORDS): MorseWord[] {
  const pool = [...WATCH_POOL];
  const out: MorseWord[] = [];
  while (out.length < size && pool.length) {
    const [w] = pool.splice(Math.floor(random() * pool.length), 1);
    if (w) out.push(w);
  }
  return out;
}

export interface WatchResult {
  right: number;
  total: number;
  passed: boolean;
}

/** Passed with 18 of 20 copied right (or the same share of a shorter test watch). */
export function watchResult(attempts: readonly WordAttempt[]): WatchResult {
  const right = attempts.filter(isRight).length;
  const total = attempts.length;
  const need = Math.ceil((total * WATCH_PASS) / WATCH_WORDS);
  return { right, total, passed: total > 0 && right >= need };
}

/** The trial is open once you know every character, like the Lamp Signal. */
export const watchOpen = (p: MorseProgress, allChars: number) => p.unlocked >= allChars;

export const watchPassed = (p: MorseProgress) => p.rankTrials.includes(WATCH_ID);

export function applyWatch(p: MorseProgress, r: WatchResult): MorseProgress {
  return r.passed && !watchPassed(p) ? { ...p, rankTrials: [...p.rankTrials, WATCH_ID] } : p;
}

/** Saves a watch; a first pass sends `trial-night-watch` (ADR 0035). */
export async function reportWatch(
  api: SubjectApi,
  before: MorseProgress,
  next: MorseProgress,
  r: WatchResult,
  seconds: number,
  at = new Date(),
): Promise<void> {
  const first = r.passed && !watchPassed(before);
  await api.saveSession({
    state: next,
    xp: first ? WATCH_XP.pass : WATCH_XP.try,
    minutes: seconds / 60,
    events: first ? [{ kind: `trial-${WATCH_ID}` }] : [],
    at,
  });
}
