// Reports a round at the echo well (#193) in one save (ADR 0031): the state (pairs heard and the
// streak), a listen rating per answer on its pair (`pair:hah-heh`), XP and practice time.
import type { SubjectApi } from '../../../core/subject.ts';
import type { ArabicProgress } from '../progress.ts';
import { XP_PER_RIGHT, type PairQuestion } from './pairs.ts';

export interface PairAnswer {
  question: PairQuestion;
  right: boolean;
}

export const xpOfRound = (answers: readonly PairAnswer[]) =>
  answers.filter((a) => a.right).length * XP_PER_RIGHT;

export async function reportRound(
  api: SubjectApi,
  next: ArabicProgress,
  answers: readonly PairAnswer[],
  seconds: number,
  at = new Date(),
): Promise<void> {
  await api.saveSession({
    state: next,
    results: answers.map((a) => ({
      skill: 'listen',
      itemId: a.question.pair.itemId,
      score: a.right ? 1 : 0,
    })),
    xp: xpOfRound(answers),
    minutes: seconds / 60,
    at,
  });
}
