// Reports a finished script session (#38, #41): saved state, spaced repetition for each letter,
// the listen and read ratings, XP and practice time. One request at a time, in order.
import { gradeFrom } from '../../../core/srs/scheduler.ts';
import type { SubjectApi } from '../../../core/subject.ts';
import type { ArabicProgress } from '../progress.ts';

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

/** About 10 XP a minute: a session of 18 answers takes 2–3 minutes; a pass adds its bonus. */
export function xpFor(answers: readonly Answer[], bonus: number): number {
  return answers.filter((a) => a.right).length + bonus;
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
  await api.saveState(next);
  // Each letter (and mark): graded by how many of the answers that tested it were right.
  const letters = new Map<string, { right: number; asked: number }>();
  for (const a of answers)
    for (const l of a.letters) {
      const t = letters.get(l) ?? { right: 0, asked: 0 };
      letters.set(l, { right: t.right + (a.right ? 1 : 0), asked: t.asked + 1 });
    }
  for (const [letter, t] of letters)
    await api.recordReview(letter, gradeFrom(t.right, t.asked), at);
  for (const a of answers) {
    if (a.kind === 'listen')
      await api.recordResult('listen', a.letters[0] ?? a.wordId, a.right ? 1 : 0, { at });
    else await api.recordResult('read', a.wordId, a.right ? 1 : 0, { at });
  }
  const xp = xpFor(answers, bonus);
  if (xp > 0) await api.awardXP(xp);
  await api.recordPractice(seconds / 60);
}
