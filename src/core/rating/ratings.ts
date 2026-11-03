// Skill ratings as the platform keeps them (issue #22, ADR 0024): Glicko-2 numbers plus how many
// results they rest on and when they last moved.
import { afterIdle, newGlicko, rateAnswer, type Glicko } from './glicko2.ts';

/** A stored rating: the Glicko-2 numbers, the number of results, and the last result's time. */
export interface StoredRating extends Glicko {
  games: number;
  ratedAt: Date;
}

/** A rating as subjects see it. */
export interface SkillRating {
  rating: number;
  /** Rating deviation, as of now: it grows on days without practice. */
  rd: number;
  games: number;
  /** True until the rating rests on PROVISIONAL_GAMES results. */
  provisional: boolean;
}

/**
 * A rating counts as provisional until it rests on this many results. After 30 answers a new
 * learner's deviation is down to about 110, the line Lichess uses for "provisional" (ADR 0024).
 */
export const PROVISIONAL_GAMES = 30;

const DAY_MS = 86_400_000;

/** The rating as of `at`: its deviation grown by the whole days since it last moved. */
export function asOf(stored: StoredRating, at: Date): StoredRating {
  const idleDays = Math.floor((at.getTime() - stored.ratedAt.getTime()) / DAY_MS);
  return { ...stored, ...afterIdle(stored, idleDays) };
}

export const toSkillRating = (r: StoredRating, now: Date): SkillRating => {
  const current = asOf(r, now);
  return {
    rating: current.rating,
    rd: current.rd,
    games: r.games,
    provisional: r.games < PROVISIONAL_GAMES,
  };
};

/**
 * Rates one answer: the learner's skill rating and the item's rating each take one game against
 * the other. `itemSeed` is where a never-rated item starts (for example from curriculum order).
 */
export function rateResult(
  learner: StoredRating | null,
  item: StoredRating | null,
  score: number,
  at: Date,
  itemSeed?: number,
): { learner: StoredRating; item: StoredRating } {
  const before = (r: StoredRating | null, seed?: number): StoredRating =>
    r ? asOf(r, at) : { ...newGlicko(seed), games: 0, ratedAt: at };
  const l = before(learner);
  const i = before(item, itemSeed);
  const after = rateAnswer(l, i, score);
  return {
    learner: { ...after.learner, games: l.games + 1, ratedAt: at },
    item: { ...after.item, games: i.games + 1, ratedAt: at },
  };
}
