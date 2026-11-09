// The Arabic subject's saved state (#38, #39): which script lesson you're on and how close you
// are to passing it. A lesson is passed at 90% in two sessions in a row, the second on a later
// day than the first (Adam, 2026-11-04: spaced, not massed; see docs/game/arabic-script-lessons.md).
import { z } from 'zod';
import { LESSON_COUNT } from './letters.ts';

export const PASS_SCORE = 0.9;
export const PASSES_NEEDED = 2;

const Progress = z.object({
  /** The lesson you're working on (all earlier ones are passed). */
  lesson: z.number().int().min(1).max(LESSON_COUNT).catch(1),
  /** Sessions in a row at 90% or better in this lesson. */
  streak: z.number().int().min(0).max(PASSES_NEEDED).catch(0),
  /** The day (YYYY-MM-DD, local) the streak's first good session was on. */
  passDay: z.string().nullable().catch(null),
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
  /** Read choices for well-known words: recordings, or Latin letters if you prefer them. */
  knownChoices: z.enum(['sound', 'latin']).catch('sound'),
  /** The word path (#160): your chapter, passes towards it, and the words you've met (deck ids). */
  words: z
    .object({
      chapter: z.number().int().min(1).catch(1),
      streak: z.number().int().min(0).max(PASSES_NEEDED).catch(0),
      passDay: z.string().nullable().catch(null),
      met: z.array(z.string()).catch([]),
      /** Every chapter passed: sessions are practice. */
      done: z.boolean().catch(false),
      sessions: z.number().int().min(0).catch(0),
      /** Grammar cards you've read (#162), e.g. `grammar:no-is`. */
      cards: z.array(z.string()).catch([]),
    })
    .catch({ chapter: 1, streak: 0, passDay: null, met: [], done: false, sessions: 0, cards: [] }),
});
export type ArabicProgress = z.infer<typeof Progress>;

export const NEW_PROGRESS: ArabicProgress = {
  lesson: 1,
  streak: 0,
  passDay: null,
  met: [],
  done: false,
  sessions: 0,
  guest: false,
  phraseSet: 1,
  phrasesMet: [],
  knownChoices: 'sound',
  words: { chapter: 1, streak: 0, passDay: null, met: [], done: false, sessions: 0, cards: [] },
};

/** Reads saved state forgivingly: anything missing or odd falls back to a fresh start. */
export function parseProgress(state: unknown): ArabicProgress {
  const parsed = Progress.safeParse(state ?? {});
  return parsed.success ? parsed.data : NEW_PROGRESS;
}

/** Today in the browser's time zone, as YYYY-MM-DD. */
export function localDay(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * After a session: count a pass, and move on after two in a row on different days. A second
 * good session on the same day keeps the first one counted but doesn't pass (`sameDay`).
 */
export function applySession(
  p: ArabicProgress,
  score: number,
  met: readonly string[],
  day: string = localDay(),
): { next: ArabicProgress; passed: boolean; sameDay: boolean } {
  const good = score >= PASS_SCORE;
  const sameDay = good && p.streak > 0 && p.passDay === day;
  const streak = !good ? 0 : sameDay ? p.streak : p.streak + 1;
  // After the last lesson, sessions are practice: no second pass (or bonus) for it.
  const passed = !p.done && streak >= PASSES_NEEDED;
  const last = p.lesson >= LESSON_COUNT;
  return {
    passed,
    sameDay: sameDay && !p.done,
    next: {
      ...p,
      lesson: passed && !last ? p.lesson + 1 : p.lesson,
      streak: passed ? 0 : streak,
      passDay: passed || !good ? null : streak === 1 && !sameDay ? day : p.passDay,
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

/** The word path opens once you're a guest: every letter is yours (#160). */
export const wordsOpen = (p: ArabicProgress) => p.guest;

/**
 * After a word session: the same gate as the letters, 90% in two sessions in a row, the second
 * on a later day. Passing moves you to the next chapter (`chapters` is how many there are).
 */
export function applyWordSession(
  p: ArabicProgress,
  score: number,
  met: readonly string[],
  chapters: number,
  day: string = localDay(),
): { next: ArabicProgress; passed: boolean; sameDay: boolean } {
  const w = p.words;
  const good = score >= PASS_SCORE;
  const sameDay = good && w.streak > 0 && w.passDay === day;
  const streak = !good ? 0 : sameDay ? w.streak : w.streak + 1;
  const passed = !w.done && streak >= PASSES_NEEDED;
  const last = w.chapter >= chapters;
  return {
    passed,
    sameDay: sameDay && !w.done,
    next: {
      ...p,
      sessions: p.sessions + 1,
      words: {
        ...w,
        chapter: passed && !last ? w.chapter + 1 : w.chapter,
        streak: passed ? 0 : streak,
        passDay: passed || !good ? null : streak === 1 && !sameDay ? day : w.passDay,
        met: [...new Set([...w.met, ...met])],
        done: w.done || (passed && last),
        sessions: w.sessions + 1,
      },
    },
  };
}
