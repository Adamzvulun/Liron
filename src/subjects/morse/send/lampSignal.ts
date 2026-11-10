// The Lamp Signal (#175, E13): the Keyer's trial. Send 10 common words with the straight key;
// the tower must read at least 9 of them, and your keying must be 15 wpm or faster.
// Design: docs/game/ranks-and-achievements.md §2.

import type { SubjectApi } from '../../../core/subject.ts';
import type { MorseProgress } from '../lesson/progress.ts';
import { KEYER_DIT_MS } from '../ranks.ts';
import { MORSE_WORDS } from '../words.ts';
import { wpmFor, type Decoded } from './decoder.ts';

export const LAMP_ID = 'lamp-signal';
export const LAMP_WORDS = 10;
export const LAMP_PASS = 9;
/** A first pass, like the questline trials; any other try still earns a little. */
export const LAMP_XP = { pass: 50, try: 10 };

/** The words it draws from: the 100 commonest, 2 to 5 letters (a lamp blinks short words). */
export const LAMP_POOL: readonly string[] = MORSE_WORDS.filter(
  (w) => w.kind === 'word' && (w.rank ?? 999) <= 100 && w.text.length >= 2 && w.text.length <= 5,
).map((w) => w.text);

/** Ten different words from the pool. */
export function lampText(random: () => number = Math.random): string {
  const pool = [...LAMP_POOL];
  const out: string[] = [];
  while (out.length < LAMP_WORDS && pool.length) {
    const [w] = pool.splice(Math.floor(random() * pool.length), 1);
    if (w) out.push(w);
  }
  return out.join(' ');
}

/**
 * Words read right, in order: the longest run of the sent words found in the tower's reading
 * (so a split or merged word costs only itself, not every word after it).
 */
export function wordsRight(sent: readonly string[], read: readonly string[]): number {
  const row = new Array<number>(read.length + 1).fill(0);
  for (const s of sent) {
    let diag = 0;
    for (let j = 1; j <= read.length; j++) {
      const up = row[j] ?? 0;
      row[j] = s === read[j - 1] ? diag + 1 : Math.max(up, row[j - 1] ?? 0);
      diag = up;
    }
  }
  return row[read.length] ?? 0;
}

export interface LampResult {
  right: number;
  total: number;
  wpm: number;
  /** Read well enough (9 of 10). */
  read: boolean;
  /** Fast enough (15 wpm). */
  fast: boolean;
  passed: boolean;
}

export function lampResult(text: string, decoded: Decoded): LampResult {
  const sent = text.split(' ');
  const right = wordsRight(sent, decoded.text.split(' ').filter(Boolean));
  const read = right >= LAMP_PASS;
  const fast = decoded.ditMs <= KEYER_DIT_MS;
  return {
    right,
    total: sent.length,
    wpm: Math.round(wpmFor(decoded.ditMs)),
    read,
    fast,
    passed: read && fast,
  };
}

/** The trial is open once you know every character: the words use them all. */
export const lampOpen = (p: MorseProgress, allChars: number) => p.unlocked >= allChars;

export const lampPassed = (p: MorseProgress) => p.rankTrials.includes(LAMP_ID);

export function applyLamp(p: MorseProgress, r: LampResult): MorseProgress {
  return r.passed && !lampPassed(p) ? { ...p, rankTrials: [...p.rankTrials, LAMP_ID] } : p;
}

/** Saves an attempt; a first pass sends `trial-lamp-signal` (ADR 0035). */
export async function reportLamp(
  api: SubjectApi,
  before: MorseProgress,
  next: MorseProgress,
  r: LampResult,
  seconds: number,
  at = new Date(),
): Promise<void> {
  const first = r.passed && !lampPassed(before);
  await api.saveSession({
    state: next,
    xp: first ? LAMP_XP.pass : LAMP_XP.try,
    minutes: seconds / 60,
    events: first ? [{ kind: `trial-${LAMP_ID}` }] : [],
    at,
  });
}
