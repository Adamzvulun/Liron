// The word drill (#154, E12): head copy of whole words. Pure rules here (picking a round,
// scoring, the state after a round, the report); the screen is WordDrill.tsx. Design:
// docs/game/morse-words.md.

import type { ReviewGrade, SubjectApi } from '../../../core/subject.ts';
import type { MorseProgress } from '../lesson/progress.ts';
import { wordSeed, type MorseWord } from '../words.ts';

export const ROUND_WORDS = 10;
/** New words that may join one round. */
export const NEW_PER_ROUND = 3;

export interface WordAttempt {
  word: MorseWord;
  /** What the learner typed (upper case, no spaces). */
  typed: string;
  /** They asked for AGN (a second hearing). */
  again: boolean;
}

/** What counts as the same answer: case, spaces and a prosign's angle brackets don't matter. */
export const normalize = (s: string) => s.toUpperCase().replace(/[\s<>]/g, '');

export const isRight = (a: WordAttempt) => normalize(a.typed) === normalize(a.word.text);

/** Rating score: right is 1, right after AGN is half, wrong is 0. */
export const scoreOf = (a: WordAttempt) => (isRight(a) ? (a.again ? 0.5 : 1) : 0);

/** Spaced repetition: right is good, right after AGN is hard, wrong is again. */
export const gradeOf = (a: WordAttempt): ReviewGrade =>
  isRight(a) ? (a.again ? 'hard' : 'good') : 'again';

/** The Word Room opens once the Gatekeeper (chapter I's trial) is passed. */
export const wordsOpen = (p: MorseProgress) => p.trials.includes(1);

/**
 * The words of a round, in the order they play:
 * - due words first (most overdue first), then
 * - up to NEW_PER_ROUND words never practiced: two common words by frequency, one piece of
 *   shorthand, as available, then
 * - words practiced before, at random,
 * shuffled together. A round can be shorter when few words are open.
 */
export function pickRound(
  open: readonly MorseWord[],
  dueIds: readonly string[],
  seenIds: ReadonlySet<string>,
  random: () => number = Math.random,
  size = ROUND_WORDS,
): MorseWord[] {
  const byId = new Map(open.map((w) => [w.id, w]));
  const picked: MorseWord[] = [];
  const take = (w: MorseWord | undefined) => {
    if (w && picked.length < size && !picked.includes(w)) picked.push(w);
  };
  for (const id of dueIds) take(byId.get(id));

  const unseen = open.filter((w) => !seenIds.has(w.id));
  const common = unseen.filter((w) => w.kind === 'word');
  const shorthand = unseen.filter((w) => w.kind !== 'word');
  const fresh = [...common.slice(0, 2), ...shorthand.slice(0, 1)];
  // If one kind has run out, the other fills the new places.
  for (const w of [...common.slice(2), ...shorthand.slice(1)]) {
    if (fresh.length >= NEW_PER_ROUND) break;
    fresh.push(w);
  }
  for (const w of fresh.slice(0, NEW_PER_ROUND)) take(w);

  const known = shuffle(
    open.filter((w) => seenIds.has(w.id)),
    random,
  );
  for (const w of known) take(w);
  // Nothing practiced yet and few words open: more new ones fill the round.
  for (const w of unseen) take(w);
  return shuffle(picked, random);
}

function shuffle<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** XP: 2 for each word copied right (about 10 a minute, docs/game/economy.md). */
export const xpForWords = (attempts: readonly WordAttempt[]) => attempts.filter(isRight).length * 2;

/** The state after a round: rounds played and the most words right in one round. */
export function applyWords(p: MorseProgress, attempts: readonly WordAttempt[]): MorseProgress {
  const right = attempts.filter(isRight).length;
  return {
    ...p,
    words: { rounds: p.words.rounds + 1, best: Math.max(p.words.best, right) },
  };
}

/**
 * Reports a round in one save (ADR 0031): state, a review and a head-copy result per word, XP,
 * minutes, and the events daily contracts may count (`words-round`, `words-perfect`).
 */
export async function reportWords(
  api: SubjectApi,
  next: MorseProgress,
  attempts: readonly WordAttempt[],
  seconds: number,
  at = new Date(),
): Promise<void> {
  const perfect = attempts.length >= ROUND_WORDS && attempts.every((a) => isRight(a) && !a.again);
  await api.saveSession({
    state: next,
    reviews: attempts.map((a) => ({ itemId: a.word.id, grade: gradeOf(a) })),
    results: attempts.map((a) => ({
      skill: 'head-copy',
      itemId: a.word.id,
      score: scoreOf(a),
      itemSeed: wordSeed(a.word),
    })),
    xp: xpForWords(attempts),
    minutes: seconds / 60,
    events: [{ kind: 'words-round' }, ...(perfect ? [{ kind: 'words-perfect' }] : [])],
    at,
  });
}
