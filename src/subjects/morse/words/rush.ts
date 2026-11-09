// The callsign rush (#156, E12): made-up callsigns, each a little faster after one copied right
// and slower after a miss (overspeed practice). Pure rules here; the screen is in WordDrill.tsx.
// Design: docs/game/morse-words.md.

import type { SubjectApi } from '../../../core/subject.ts';
import type { MorseProgress } from '../lesson/progress.ts';

export const RUSH_CALLS = 25;
export const RUSH_START_WPM = 20;
export const RUSH_STEP_WPM = 2;
export const RUSH_MIN_WPM = 15;
export const RUSH_MAX_WPM = 50;

const isDigit = (c: string) => /^[0-9]$/.test(c);
const isLetter = (c: string) => /^[A-Z]$/.test(c);

/** The rush opens with the first digit (5, in chapter III): every real callsign has one. */
export const rushOpen = (unlocked: readonly string[]) => unlocked.some(isDigit);

/**
 * A made-up callsign from unlocked characters, shaped like a real one: a prefix of one letter,
 * two letters or a digit and a letter, then a digit, then one to three letters (K5AT, MI2RK,
 * 9A5WE).
 */
export function makeCallsign(unlocked: readonly string[], random: () => number = Math.random) {
  const letters = unlocked.filter(isLetter);
  const digits = unlocked.filter(isDigit);
  if (!letters.length || !digits.length) throw new Error('a callsign needs a letter and a digit');
  const pick = (from: readonly string[]) => from[Math.floor(random() * from.length)] ?? '';
  const shape = random();
  const prefix =
    shape < 0.45
      ? pick(letters)
      : shape < 0.85
        ? pick(letters) + pick(letters)
        : pick(digits) + pick(letters);
  const suffix = Array.from({ length: 1 + Math.floor(random() * 3) }, () => pick(letters)).join('');
  return prefix + pick(digits) + suffix;
}

export interface RushCall {
  call: string;
  wpm: number;
  typed: string;
}

export const rushRight = (c: RushCall) => c.typed.toUpperCase() === c.call;

/** The speed after a call: faster when copied right, slower when missed. */
export const nextWpm = (wpm: number, right: boolean) =>
  Math.min(RUSH_MAX_WPM, Math.max(RUSH_MIN_WPM, wpm + (right ? RUSH_STEP_WPM : -RUSH_STEP_WPM)));

export interface RushSummary {
  /** The sum of the speeds of the calls copied right. */
  score: number;
  right: number;
  /** The fastest call copied right (0 if none). */
  topWpm: number;
}

export function summarizeRush(calls: readonly RushCall[]): RushSummary {
  const right = calls.filter(rushRight);
  return {
    score: right.reduce((s, c) => s + c.wpm, 0),
    right: right.length,
    topWpm: right.reduce((m, c) => Math.max(m, c.wpm), 0),
  };
}

/** XP: about 10 a minute (docs/game/economy.md); a rush of 25 calls takes about 2 minutes. */
export const xpForRush = (s: RushSummary) => Math.round(s.right * 0.8);

export function applyRush(p: MorseProgress, s: RushSummary): MorseProgress {
  return {
    ...p,
    rush: {
      runs: p.rush.runs + 1,
      best: Math.max(p.rush.best, s.score),
      topWpm: Math.max(p.rush.topWpm, s.topWpm),
    },
  };
}

/**
 * Saves a rush in one go: state, XP, minutes and the events daily contracts may count:
 * `rush-round`, `rush-best` when it beat the best before, and `rush-fast` for each call copied
 * above the learner's own character speed. Callsigns are made up, so nothing is rated.
 */
export async function reportRush(
  api: SubjectApi,
  next: MorseProgress,
  calls: readonly RushCall[],
  bestBefore: number,
  charWpm: number,
  seconds: number,
  at = new Date(),
): Promise<void> {
  const s = summarizeRush(calls);
  const fast = calls.filter((c) => rushRight(c) && c.wpm > charWpm).length;
  await api.saveSession({
    state: next,
    xp: xpForRush(s),
    minutes: seconds / 60,
    events: [
      { kind: 'rush-round' },
      ...(s.score > bestBefore ? [{ kind: 'rush-best' }] : []),
      ...(fast ? [{ kind: 'rush-fast', count: Math.min(100, fast) }] : []),
    ],
    at,
  });
}
