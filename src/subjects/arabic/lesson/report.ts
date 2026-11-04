// Reports a finished script session (#38, #41): saved state, spaced repetition for each letter,
// the listen and read ratings, XP and practice time. One request at a time, in order.
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

/** About 10 XP a minute: a session of 18 answers takes 2–3 minutes. Passing a lesson pays 30. */
export function xpFor(answers: readonly Answer[], passedLesson: boolean): number {
  return answers.filter((a) => a.right).length + (passedLesson ? 30 : 0);
}

export async function reportSession(
  api: SubjectApi,
  next: ArabicProgress,
  answers: readonly Answer[],
  passedLesson: boolean,
  seconds: number,
  at = new Date(),
): Promise<void> {
  await api.saveState(next);
  // Each letter: known if every answer that tested it was right.
  const letters = new Map<string, boolean>();
  for (const a of answers)
    for (const l of a.letters) letters.set(l, (letters.get(l) ?? true) && a.right);
  for (const [letter, right] of letters)
    await api.recordReview(letter, right ? 'good' : 'again', at);
  for (const a of answers) {
    if (a.kind === 'listen')
      await api.recordResult('listen', a.letters[0] ?? a.wordId, a.right ? 1 : 0, { at });
    else await api.recordResult('read', a.wordId, a.right ? 1 : 0, { at });
  }
  const xp = xpFor(answers, passedLesson);
  if (xp > 0) await api.awardXP(xp);
  await api.recordPractice(seconds / 60);
}
