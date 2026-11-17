// The parts of spaced repetition that don't need ts-fsrs (#137): grades, phases and how a session
// grades an item. Kept apart from scheduler.ts, so the square and the halls don't load ts-fsrs
// until a review is saved.

/** How well the learner knew an item. Subjects map their own results onto these four. */
export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

/** Where an item is in learning. */
export type ReviewPhase = 'new' | 'learning' | 'review' | 'relearning';

/** FSRS's state numbers (0-3), in order. */
export const PHASES: readonly ReviewPhase[] = ['new', 'learning', 'review', 'relearning'];

/** A stored card: FSRS's state as plain JSON (dates as ISO strings). */
export type StoredCard = Record<string, unknown>;

/**
 * A session's grade for one item from how many of its answers were right (code review,
 * 2026-11-04): all right is good, at least half is hard, fewer is again. One slip among many
 * right answers says the item is shaky, not forgotten, so it shouldn't reset the item.
 */
export function gradeFrom(right: number, asked: number): ReviewGrade {
  if (asked <= 0 || right <= 0) return 'again';
  if (right >= asked) return 'good';
  return right * 2 >= asked ? 'hard' : 'again';
}

/** The phase recorded in a stored card. */
export function phaseOf(stored: StoredCard): ReviewPhase {
  return PHASES[Number(stored.state)] ?? 'new';
}
