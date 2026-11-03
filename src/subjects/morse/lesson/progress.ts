// What the Signal Tower remembers about your Koch lessons (#31), and what a finished run does
// to it. Saved as the Morse subject's state (ADR 0019); the platform never looks inside.

import { z } from 'zod';
import type { SubjectApi } from '../../../core/subject.ts';
import { MORSE_CHARS } from '../code.ts';
import { passesGate, nextEffectiveWpm, type RunScore } from './score.ts';

export const CHAR_WPM = 20;
export const START_EFF_WPM = 10;
/** Away this long, and the first run is a warm-up that can't unlock anything. */
export const WARMUP_AFTER_MS = 24 * 60 * 60 * 1000;
const KOCH = MORSE_CHARS.map((c) => c.char);

const progressSchema = z.object({
  /** How many characters are unlocked, in Koch order (2 = K and M). */
  unlocked: z.number().int().min(2).max(KOCH.length).catch(2),
  effWpm: z.number().min(6).max(CHAR_WPM).catch(START_EFF_WPM),
  /** Accuracy of the latest runs since the last unlock (0 to 1). */
  recent: z.array(z.number().min(0).max(1)).max(20).catch([]),
  /** Characters whose introduction you've done. */
  met: z.array(z.string()).catch([]),
  /** Each character's accuracy, smoothed over runs (0 to 1). */
  accuracy: z.record(z.string(), z.number().min(0).max(1)).catch({}),
  lastRunAt: z.string().nullable().catch(null),
  runs: z.number().int().min(0).catch(0),
});

export type MorseProgress = z.infer<typeof progressSchema>;

export const NEW_PROGRESS: MorseProgress = progressSchema.parse({});

/** Reads saved state forgivingly: anything missing or broken falls back to a fresh start. */
export function parseProgress(raw: unknown): MorseProgress {
  const parsed = progressSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : NEW_PROGRESS;
}

export const unlockedChars = (p: MorseProgress) => KOCH.slice(0, p.unlocked);
/** The newest character, if it's new to the runs (not in lesson 1, where both are new). */
export const newestChar = (p: MorseProgress) => (p.unlocked > 2 ? KOCH[p.unlocked - 1] : undefined);
export const nextChar = (p: MorseProgress) => KOCH[p.unlocked];
/** Characters still to meet before the runs start. */
export const toMeet = (p: MorseProgress) =>
  unlockedChars(p).filter(
    (c, i) => (p.unlocked === 2 || i === p.unlocked - 1) && !p.met.includes(c),
  );

export function isWarmup(p: MorseProgress, now: Date): boolean {
  if (!p.lastRunAt || p.unlocked === 2) return false;
  return now.getTime() - new Date(p.lastRunAt).getTime() >= WARMUP_AFTER_MS;
}

/**
 * How often each character comes up: weak ones (low smoothed accuracy) and ones due in spaced
 * repetition more, never less than a fifth of normal (build.ts floors it).
 */
export function weightsFor(p: MorseProgress, due: ReadonlySet<string>): Map<string, number> {
  return new Map(
    unlockedChars(p).map((c) => [c, 1 + 2 * (1 - (p.accuracy[c] ?? 0.8)) + (due.has(c) ? 1 : 0)]),
  );
}

/** XP for a run: about 10 a minute (docs/game/economy.md), plus 10 for lighting a lamp. */
export const xpFor = (score: RunScore, unlockedNow: boolean) =>
  Math.round(score.right / 5) + (unlockedNow ? 10 : 0);

/** The state after a run. Warm-up runs adjust speed and accuracy but never count to the gate. */
export function applyRun(
  p: MorseProgress,
  score: RunScore,
  at: Date,
  warmup = false,
): { next: MorseProgress; unlockedNow: boolean } {
  const accuracy = { ...p.accuracy };
  for (const [c, t] of score.byChar) {
    const run = t.right / t.played;
    accuracy[c] = c in accuracy ? 0.6 * (accuracy[c] ?? run) + 0.4 * run : run;
  }
  const recent = warmup ? p.recent : [...p.recent, score.accuracy].slice(-20);
  const unlockedNow = !warmup && passesGate(recent) && p.unlocked < KOCH.length;
  return {
    unlockedNow,
    next: {
      ...p,
      unlocked: unlockedNow ? p.unlocked + 1 : p.unlocked,
      effWpm: nextEffectiveWpm(p.effWpm, score.accuracy, CHAR_WPM),
      recent: unlockedNow ? [] : recent,
      accuracy,
      lastRunAt: at.toISOString(),
      runs: p.runs + 1,
    },
  };
}

/**
 * Reports a finished run to the platform: saved state, spaced repetition and the receive rating
 * for each character, XP, and practice time. One request at a time, so the learner's rating
 * updates in order.
 */
export async function reportRun(
  api: SubjectApi,
  next: MorseProgress,
  score: RunScore,
  unlockedNow: boolean,
  seconds: number,
  at = new Date(),
): Promise<void> {
  await api.saveState(next);
  for (const [c, t] of score.byChar) {
    const item = `char:${c}`;
    await api.recordReview(item, t.right === t.played ? 'good' : 'again', at);
    await api.recordResult('receive', item, t.right / t.played, { at });
  }
  const xp = xpFor(score, unlockedNow);
  if (xp > 0) await api.awardXP(xp);
  await api.recordPractice(seconds / 60);
}
