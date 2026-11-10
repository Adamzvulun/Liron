// Reports a round at the echo well (#193) in one save (ADR 0031): the state (pairs heard and the
// streak), a listen rating per answer on its pair (`pair:hah-heh`), XP, practice time and the
// events for contracts and achievements (#197); and a shadowing round (#194).
import type { SubjectApi } from '../../../core/subject.ts';
import type { ArabicProgress } from '../progress.ts';
import { XP_PER_RIGHT, type PairQuestion, type SoundPair } from './pairs.ts';
import { GRADE, XP_PER_SENTENCE, type Judgement, type ShadowLine } from './shadow.ts';

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
  heard: SoundPair | null,
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
    events: [{ kind: 'pairs-round' }, ...(heard ? [{ kind: `heard-${heard.id}` }] : [])],
    at,
  });
}

/**
 * A shadowing round (#194), in one save: the count of sentences shadowed, a review per sentence
 * graded by your own judgement, 3 XP a sentence and practice time. Recordings are never sent.
 */
export async function reportShadow(
  api: SubjectApi,
  next: ArabicProgress,
  judged: readonly { line: ShadowLine; judgement: Judgement }[],
  seconds: number,
  at = new Date(),
): Promise<void> {
  await api.saveSession({
    state: next,
    reviews: judged.map((j) => ({ itemId: j.line.itemId, grade: GRADE[j.judgement] })),
    xp: judged.length * XP_PER_SENTENCE,
    minutes: seconds / 60,
    events: judged.length ? [{ kind: 'shadow-sentence', count: judged.length }] : [],
    at,
  });
}
