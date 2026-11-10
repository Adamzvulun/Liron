// What the Signal Tower remembers about your Koch lessons (#31), and what a finished run does
// to it. Saved as the Morse subject's state (ADR 0019); the platform never looks inside.

import { z } from 'zod';
import { gradeFrom } from '../../../core/srs/scheduler.ts';
import type { SubjectApi } from '../../../core/subject.ts';
import { MORSE_CHARS } from '../code.ts';
import { radioSchema } from '../qso/radio.ts';
import { CHAPTERS, type Chapter } from '../questline.ts';
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
  /** Questline chapters whose trial is passed (#34). */
  trials: z.array(z.number().int().positive()).catch([]),
  /** Guild ranks you've taken (#174): their rank-up card is seen and their event sent. */
  ranks: z.array(z.string()).catch([]),
  /** Rank trials passed (E13): `lamp-signal` (#175), `night-watch` (#179), later `far-station`. */
  rankTrials: z.array(z.string()).catch([]),
  /** Prosigns copied right in the Codebook (#178), by id (`prosign:ar`): the Operator learns all. */
  prosigns: z.array(z.string()).catch([]),
  /** Instant Recognition (#32): personal best, rounds played, each letter's reaction time. */
  recognition: z
    .object({
      best: z.number().int().min(0).catch(0),
      rounds: z.number().int().min(0).catch(0),
      avgMs: z.record(z.string(), z.number().min(0)).catch({}),
    })
    .catch({ best: 0, rounds: 0, avgMs: {} }),
  /** Sending drills (#36): how many, and your dit length (your keying speed) from the last one. */
  sending: z
    .object({
      drills: z.number().int().min(0).catch(0),
      ditMs: z.number().min(20).max(400).nullable().catch(null),
    })
    .catch({ drills: 0, ditMs: null }),
  /** The word drill (#154): rounds played, and the most words copied right in one round. */
  words: z
    .object({
      rounds: z.number().int().min(0).catch(0),
      best: z.number().int().min(0).catch(0),
    })
    .catch({ rounds: 0, best: 0 }),
  /** The callsign rush (#156): runs, best score, and the fastest call copied right. */
  rush: z
    .object({
      runs: z.number().int().min(0).catch(0),
      best: z.number().int().min(0).catch(0),
      topWpm: z.number().int().min(0).catch(0),
    })
    .catch({ runs: 0, best: 0, topWpm: 0 }),
  /** The Radio Room on the air (E16): your station and the logbook. */
  radio: radioSchema,
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

/**
 * The trial waiting at the end of a chapter (#34): every lamp of the chapter is lit, the next
 * character would start the next chapter, and the trial isn't passed yet. It holds the gate.
 */
export function pendingTrial(p: MorseProgress): Chapter | undefined {
  let end = 0;
  for (const chapter of CHAPTERS) {
    end += chapter.letters.length;
    if (p.unlocked === end && !p.trials.includes(chapter.number)) return chapter;
  }
  return undefined;
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
  const unlockedNow = !warmup && passesGate(recent) && p.unlocked < KOCH.length && !pendingTrial(p);
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

/** A trial run: at the chapter's accuracy over its full length, the gate opens. */
export function applyTrial(
  p: MorseProgress,
  chapter: Chapter,
  score: RunScore,
  at: Date,
): { next: MorseProgress; passed: boolean } {
  // Speed and accuracy move as for any run; the gate's run history is left alone.
  const { next } = applyRun(p, score, at, true);
  const passed = score.played >= chapter.trial.chars && score.accuracy >= chapter.trial.accuracy;
  if (!passed) return { next, passed };
  return {
    passed,
    next: {
      ...next,
      trials: [...p.trials, chapter.number],
      unlocked: Math.min(KOCH.length, p.unlocked + 1),
      recent: [],
    },
  };
}

/**
 * Reports a finished run to the platform: saved state, spaced repetition and the receive rating
 * for each character, XP, and practice time. One request at a time, so the learner's rating
 * updates in order. Every trial passed so far goes with it as `trial-<chapter>`, for the gear and
 * chests it earns (ADR 0033); the database counts each once a day and gives them once.
 */
export async function reportRun(
  api: SubjectApi,
  next: MorseProgress,
  score: RunScore,
  unlockedNow: boolean,
  seconds: number,
  at = new Date(),
): Promise<void> {
  const chars = [...score.byChar].map(([c, t]) => ({ itemId: `char:${c}`, t }));
  await api.saveSession({
    state: next,
    reviews: chars.map(({ itemId, t }) => ({ itemId, grade: gradeFrom(t.right, t.played) })),
    results: chars.map(({ itemId, t }) => ({
      skill: 'receive',
      itemId,
      score: t.right / t.played,
    })),
    xp: xpFor(score, unlockedNow),
    minutes: seconds / 60,
    // Daily contracts (ADR 0032): a run, and a run at 90%.
    events: [
      { kind: 'run' },
      ...(score.accuracy >= 0.9 ? [{ kind: 'run-90' }] : []),
      ...next.trials.map((n) => ({ kind: `trial-${n}` })),
    ],
    at,
  });
}
