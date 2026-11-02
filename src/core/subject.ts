import type { ReviewGrade, ReviewPhase } from './srs/scheduler.ts';

export type { ReviewGrade, ReviewPhase };

// The contract between the platform and a subject (ADR 0003, ADR 0019).
// A subject is a self-contained module in src/subjects/<id>/. It describes itself with
// SubjectInfo and reports progress only through the SubjectApi the platform hands it, which is
// already bound to that subject's id: a subject can't write another subject's progress.

/** Same rule as the database's `subject_progress.subject_id` check. */
export const SUBJECT_ID = /^[a-z][a-z0-9-]{1,31}$/;

/** What the platform knows about a subject. */
export interface SubjectInfo {
  /** Stable id, used in URLs and storage keys. Never change it once used. */
  id: string;
  /** The subject's place in the city, shown as a sign (always capitals). */
  place: string;
  /** What you learn there, in plain words. */
  tagline: string;
  /** CSS colour for the subject's guild hue. */
  guildColor: string;
}

/** Where one item stands in spaced repetition. */
export interface ReviewStatus {
  due: Date;
  phase: ReviewPhase;
  reps: number;
  lapses: number;
}

/** The platform's totals for one subject. */
export interface SubjectProgress {
  xp: number;
  minutes: number;
}

/**
 * Everything a subject may ask of the platform. `State` is the subject's own saved data
 * (any JSON object); the platform stores it and never looks inside.
 */
export interface SubjectApi<State extends object = Record<string, unknown>> {
  readonly subjectId: string;
  /**
   * Earned XP (a whole number, 1 to 10,000). Counts towards the level, today and this subject,
   * and pays gold and gems (docs/game/economy.md). Guideline: about 10 XP per minute of learning.
   */
  awardXP(amount: number): Promise<void>;
  /** Time spent practising, in minutes (rounded to whole minutes; under 30 s counts as nothing). */
  recordPractice(minutes: number): Promise<void>;
  /** This subject's totals. */
  progressSummary(): Promise<SubjectProgress>;
  /** The subject's saved state, or null if it never saved any. */
  loadState(): Promise<State | null>;
  /** Replaces the subject's saved state. */
  saveState(state: State): Promise<void>;
  /**
   * Spaced repetition (ADR 0022). Records how well the learner knew an item (any stable id the
   * subject chooses, up to 128 characters) and returns when it's due again.
   */
  recordReview(itemId: string, grade: ReviewGrade, at?: Date): Promise<ReviewStatus>;
  /** Items due for review now (or at `now`), most overdue first. */
  dueItems(options?: { limit?: number; now?: Date }): Promise<{ itemId: string; due: Date }[]>;
  /** Review status of the given items. Items missing from the map have never been reviewed. */
  reviewStatus(itemIds: readonly string[]): Promise<Map<string, ReviewStatus>>;
}
