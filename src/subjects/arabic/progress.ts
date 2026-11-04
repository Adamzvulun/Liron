// The Arabic subject's saved state (#38, #39): which script lesson you're on and how close you
// are to passing it. A lesson is passed at 90% in two sessions in a row, like Morse (ADR 0028).
import { z } from 'zod';
import { LESSON_COUNT } from './letters.ts';

export const PASS_SCORE = 0.9;
export const PASSES_NEEDED = 2;

const Progress = z.object({
  /** The lesson you're working on (all earlier ones are passed). */
  lesson: z.number().int().min(1).max(LESSON_COUNT).catch(1),
  /** Sessions in a row at 90% or better in this lesson. */
  streak: z.number().int().min(0).max(PASSES_NEEDED).catch(0),
  /** Letters you've met (their introduction cards), by id. */
  met: z.array(z.string()).catch([]),
  /** Every script lesson passed. */
  done: z.boolean().catch(false),
  sessions: z.number().int().min(0).catch(0),
  /** Passed the Painted Sign (#43): a guest of the house. */
  guest: z.boolean().catch(false),
  /** The coffee corner's phrase set you're on (#45); earlier sets are passed. */
  phraseSet: z.number().int().min(1).catch(1),
  /** Phrases you've met (deck ids). */
  phrasesMet: z.array(z.string()).catch([]),
});
export type ArabicProgress = z.infer<typeof Progress>;

export const NEW_PROGRESS: ArabicProgress = {
  lesson: 1,
  streak: 0,
  met: [],
  done: false,
  sessions: 0,
  guest: false,
  phraseSet: 1,
  phrasesMet: [],
};

/** Reads saved state forgivingly: anything missing or odd falls back to a fresh start. */
export function parseProgress(state: unknown): ArabicProgress {
  const parsed = Progress.safeParse(state ?? {});
  return parsed.success ? parsed.data : NEW_PROGRESS;
}

/** After a session: count a pass, and move on after two in a row. */
export function applySession(
  p: ArabicProgress,
  score: number,
  met: readonly string[],
): { next: ArabicProgress; passed: boolean } {
  const good = score >= PASS_SCORE;
  const streak = good ? p.streak + 1 : 0;
  const passed = streak >= PASSES_NEEDED;
  const last = p.lesson >= LESSON_COUNT;
  return {
    passed,
    next: {
      ...p,
      lesson: passed && !last ? p.lesson + 1 : p.lesson,
      streak: passed ? 0 : streak,
      met: [...new Set([...p.met, ...met])],
      done: p.done || (passed && last),
      sessions: p.sessions + 1,
    },
  };
}

/** After the Painted Sign: passing makes you a guest (once; trying again later is practice). */
export function applyTrial(
  p: ArabicProgress,
  score: number,
  accuracy: number,
): { next: ArabicProgress; passed: boolean } {
  const passed = !p.guest && score >= accuracy;
  return { passed, next: { ...p, guest: p.guest || passed, sessions: p.sessions + 1 } };
}
