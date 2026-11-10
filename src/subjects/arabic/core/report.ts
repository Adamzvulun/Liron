// Reports a finished word session (#160) in one save (ADR 0031): state, a spaced-repetition
// review for each word, the listen and read ratings, XP, practice time, and the events daily
// contracts count (`word-session`, and `word-90` for 90% or better).
import type { SubjectApi } from '../../../core/subject.ts';
import { PASS_SCORE, type ArabicProgress } from '../progress.ts';
import { gradeOf, skillOf, wordXp, type WordQuestion } from './coreWords.ts';

export interface WordAnswer {
  question: WordQuestion;
  right: boolean;
}

export const scoreOfWords = (answers: readonly WordAnswer[]) =>
  answers.length ? answers.filter((a) => a.right).length / answers.length : 0;

export async function reportWords(
  api: SubjectApi,
  next: ArabicProgress,
  answers: readonly WordAnswer[],
  passed: boolean,
  seconds: number,
  at = new Date(),
): Promise<void> {
  const right = answers.filter((a) => a.right).length;
  await api.saveSession({
    state: next,
    reviews: answers.map((a) => ({ itemId: a.question.word.itemId, grade: gradeOf(a.right) })),
    results: answers.map((a) => ({
      skill: skillOf(a.question.kind),
      itemId: a.question.word.itemId,
      score: a.right ? 1 : 0,
    })),
    xp: wordXp(right, passed),
    minutes: seconds / 60,
    events: [
      { kind: 'word-session' },
      ...(scoreOfWords(answers) >= PASS_SCORE ? [{ kind: 'word-90' }] : []),
    ],
    at,
  });
}

/**
 * A regular's trial (#161), in one save: the words' reviews and ratings like a session, 2 XP a
 * right answer plus the trial's XP when it's passed, and `trial-<road chapter>` for its chest.
 */
export async function reportWordTrial(
  api: SubjectApi,
  next: ArabicProgress,
  answers: readonly WordAnswer[],
  trial: { road: number; xp: number; passed: boolean },
  seconds: number,
  at = new Date(),
): Promise<void> {
  const right = answers.filter((a) => a.right).length;
  await api.saveSession({
    state: next,
    reviews: answers.map((a) => ({ itemId: a.question.word.itemId, grade: gradeOf(a.right) })),
    results: answers.map((a) => ({
      skill: skillOf(a.question.kind),
      itemId: a.question.word.itemId,
      score: a.right ? 1 : 0,
    })),
    xp: wordXp(right, false) + (trial.passed ? trial.xp : 0),
    minutes: seconds / 60,
    events: [
      { kind: 'word-session' },
      ...(scoreOfWords(answers) >= PASS_SCORE ? [{ kind: 'word-90' }] : []),
      ...(trial.passed ? [{ kind: `trial-${trial.road}` }] : []),
    ],
    at,
  });
}
