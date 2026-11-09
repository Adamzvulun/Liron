// Reports a finished script session (#38, #41): saved state, spaced repetition for each letter,
// the listen and read ratings, XP and practice time. All in one save (ADR 0031).
import { gradeFrom } from '../../../core/srs/scheduler.ts';
import type { SubjectApi } from '../../../core/subject.ts';
import { PASS_SCORE, type ArabicProgress } from '../progress.ts';
import { CHAPTER } from '../questline.ts';

export interface Answer {
  kind: 'listen' | 'read';
  /** The word asked about (a deck item id). */
  wordId: string;
  /** The letters this answer tested: the first letter for Listen, every letter for Read. */
  letters: readonly string[];
  right: boolean;
}

export function scoreOf(answers: readonly Answer[]): number {
  return answers.length ? answers.filter((a) => a.right).length / answers.length : 0;
}

/** Passing a lesson pays 30 XP on top of the answers. */
export const LESSON_BONUS = 30;

/**
 * XP per right answer. A session (18 answers, with listening and the meet cards) takes about
 * 4 minutes, so 2 a right answer is close to the economy's 10 XP a minute (2026-11-04 review).
 */
export const XP_PER_RIGHT = 2;

export function xpFor(answers: readonly Answer[], bonus: number): number {
  return answers.filter((a) => a.right).length * XP_PER_RIGHT + bonus;
}

export async function reportSession(
  api: SubjectApi,
  next: ArabicProgress,
  answers: readonly Answer[],
  /** Extra XP: a lesson passed (LESSON_BONUS), the Painted Sign passed (its trial's xp). */
  bonus: number,
  seconds: number,
  at = new Date(),
): Promise<void> {
  // Each letter (and mark): graded by how many of the answers that tested it were right.
  const letters = new Map<string, { right: number; asked: number }>();
  for (const a of answers)
    for (const l of a.letters) {
      const t = letters.get(l) ?? { right: 0, asked: 0 };
      letters.set(l, { right: t.right + (a.right ? 1 : 0), asked: t.asked + 1 });
    }
  await api.saveSession({
    state: next,
    reviews: [...letters].map(([itemId, t]) => ({ itemId, grade: gradeFrom(t.right, t.asked) })),
    results: answers.map((a) =>
      a.kind === 'listen'
        ? { skill: 'listen', itemId: a.letters[0] ?? a.wordId, score: a.right ? 1 : 0 }
        : { skill: 'read', itemId: a.wordId, score: a.right ? 1 : 0 },
    ),
    xp: xpFor(answers, bonus),
    minutes: seconds / 60,
    // Daily contracts (ADR 0032): a letters session, and one at 90% or better.
    events: [
      { kind: 'letters-session' },
      ...(answers.length && answers.filter((a) => a.right).length / answers.length >= PASS_SCORE
        ? [{ kind: 'letters-90' }]
        : []),
      // The Painted Sign, once passed, for its gear and chest (ADR 0033); counted once a day.
      ...(next.guest ? [{ kind: `trial-${CHAPTER.number}` }] : []),
    ],
    at,
  });
}
