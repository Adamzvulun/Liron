// The spaced-repetition scheduler (issue #21, ADR 0022): FSRS, through ts-fsrs.
// Only this file imports ts-fsrs. Subjects grade answers; the platform decides when they return.
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';

/** How well the learner knew an item. Subjects map their own results onto these four. */
export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

/** Where an item is in learning. */
export type ReviewPhase = 'new' | 'learning' | 'review' | 'relearning';

const GRADES: Record<ReviewGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};
const PHASES: readonly ReviewPhase[] = ['new', 'learning', 'review', 'relearning'];

/**
 * FSRS settings. 90% retention is FSRS's default and the usual target. Fuzz spreads items
 * introduced together over nearby days, so they don't all come back at once; it is seeded
 * from the card, so the same review always gives the same result.
 */
export const SCHEDULER_SETTINGS = { request_retention: 0.9, enable_fuzz: true } as const;
const scheduler = fsrs(generatorParameters(SCHEDULER_SETTINGS));

/** A stored card: FSRS's state as plain JSON (dates as ISO strings). */
export type StoredCard = Record<string, unknown>;

/** One scheduled review, ready to save. */
export interface ScheduledReview {
  due: Date;
  phase: ReviewPhase;
  /** FSRS's state number (0-3), stored next to the card for queries. */
  state: number;
  rating: number;
  card: StoredCard;
  log: StoredCard;
}

const toJson = (value: object): StoredCard => JSON.parse(JSON.stringify(value)) as StoredCard;

/** Schedules the next review of an item, from its stored card (or null if it's new). */
export function scheduleReview(
  stored: StoredCard | null,
  grade: ReviewGrade,
  now: Date,
): ScheduledReview {
  const rating = GRADES[grade];
  if (rating === undefined) throw new RangeError(`Unknown grade: ${String(grade)}`);
  const card = stored ? (stored as unknown as Card) : createEmptyCard(now);
  const result = scheduler.next(card, now, rating);
  return {
    due: result.card.due,
    phase: PHASES[result.card.state] ?? 'review',
    state: result.card.state,
    rating,
    card: toJson(result.card),
    log: toJson(result.log),
  };
}

/** The phase recorded in a stored card. */
export function phaseOf(stored: StoredCard): ReviewPhase {
  return PHASES[Number(stored.state)] ?? 'new';
}
