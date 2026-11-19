import type { ComponentType } from 'react';
import type { PartnerAsk, PartnerReply } from './partner.ts';
import type { Heard } from './speech.ts';
import type { RoundsApi } from './fellowship/challenges.ts';
import type { WireApi } from './fellowship/wire.ts';
import type { ReviewGrade, ReviewPhase } from './srs/scheduler.ts';
import type { SkillRating } from './rating/ratings.ts';
import type { Item, Lesson } from './content/schema.ts';
import type { RoadAnswer, RoadContext } from './road/road.ts';
import type { LedgerAnswer, LedgerLook } from './player/ledger.ts';

export type { ReviewGrade, ReviewPhase, SkillRating };

// The contract between the platform and a subject (ADR 0003, ADR 0019).
// A subject is a self-contained module in src/subjects/<id>/. It describes itself with
// SubjectInfo and reports progress only through the SubjectApi the platform hands it, which is
// already bound to that subject's id: a subject can't write another subject's progress.

/** Same rule as the database's `subject_progress.subject_id` check. */
export const SUBJECT_ID = /^[a-z][a-z0-9-]{1,31}$/;

/** The square's buildings that can hold a subject's hall (the city's art has two so far). */
/** The most items `dueItems({ only })` asks about at once. */
export const MAX_DUE_ONLY = 200;

export const HALL_BUILDINGS = ['tower', 'caravanserai'] as const;
export type HallBuilding = (typeof HALL_BUILDINGS)[number];

/** A subject's line on the Notice Board. */
export interface SubjectQuest {
  text: string;
  /** Words in the subject's own script, shown after the text with their language and direction. */
  script?: { text: string; lang: string; dir: 'ltr' | 'rtl' };
}

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
  /**
   * The city building its hall is in: one of the square's hall buildings (ADR 0019). A subject
   * with none isn't in the city yet: a new building is new city art (an empty plot painted).
   */
  building?: HallBuilding;
  /**
   * Its line on the Notice Board: where a learner picks up today, linking to its building.
   * Shown with no reward until quests are real (E10, #46).
   */
  quest?: SubjectQuest;
  /**
   * What its button on the first page says (docs/game/the-road.md §8), as an invitation:
   * “Climb the Signal Tower”.
   */
  welcome?: string;
  /**
   * Its road (docs/game/the-road.md): where the learner stands on its one linear story and the
   * one thing to do now, from its own saved state and what the platform knows about today.
   * Async so a subject can load its road lazily, keeping the square's first load small (#124).
   */
  road?: (state: unknown, ctx: RoadContext) => Promise<RoadAnswer>;
  /**
   * Its block of the ledger in Your House (docs/game/ledger.md): what the learner has learned,
   * from its saved state and the cards the platform hands it. Async so it loads lazily.
   */
  ledger?: (state: unknown, look: LedgerLook) => Promise<LedgerAnswer>;
  /**
   * The skills this subject rates separately (ADR 0010), e.g. Morse: receive, send, head-copy.
   * Same format as subject ids. If listed, ratings for any other skill are refused.
   */
  skills?: readonly string[];
  /**
   * What the subject shows inside its place in the city (its hall). The platform hands it the
   * subject's own API.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each subject has its own state
  Hall?: ComponentType<{ api: SubjectApi<any> }>;
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

/** One moment in a session that a daily contract may count (ADR 0032). */
export interface SessionEvent {
  kind: string;
  count?: number;
}

/**
 * A finished session, saved all at once (ADR 0031): either all of it is stored or none of it.
 * Every part is optional; what's there is applied in this order: state, reviews, results, then
 * XP and minutes.
 */
export interface SessionReport<State extends object = Record<string, unknown>> {
  /** The subject's new state (replaces the old one). */
  state?: State;
  /** Spaced-repetition reviews, in order (an item may appear twice; the second builds on it). */
  reviews?: readonly { itemId: string; grade: ReviewGrade }[];
  /** Rated answers, in order, as for `recordResult`. */
  results?: readonly { skill: string; itemId: string; score: number; itemSeed?: number }[];
  /** XP earned (a whole number, 0 to 10,000). */
  xp?: number;
  /** Minutes practised (rounded as for `recordPractice`). */
  minutes?: number;
  /**
   * Moments that matter for daily contracts (ADR 0032), e.g. `{ kind: 'run-90' }`. A kind is a
   * short id the subject declares with its contract templates; others are ignored. `count`
   * defaults to 1 (at most 100).
   */
  events?: readonly SessionEvent[];
  /** When the session ended (default: now). */
  at?: Date;
  /**
   * The session's id. Sending the same id again applies nothing, so pass the same one when
   * retrying a save. Default: a new random id.
   */
  sessionId?: string;
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
  /**
   * Saves a finished session in one go (ADR 0031): its state, reviews, ratings, XP and time.
   * Use this at the end of a session; the single calls below are for one-off actions.
   */
  saveSession(report: SessionReport<State>): Promise<void>;
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
  /**
   * Items due for review now (or at `now`), most overdue first. `only` asks about those items
   * alone (at most 200), so a station's reviews aren't crowded out by the subject's other due cards.
   */
  dueItems(options?: {
    limit?: number;
    now?: Date;
    only?: readonly string[];
  }): Promise<{ itemId: string; due: Date }[]>;
  /** Review status of the given items. Items missing from the map have never been reviewed. */
  reviewStatus(itemIds: readonly string[]): Promise<Map<string, ReviewStatus>>;
  /**
   * Skill ratings (Glicko-2, ADR 0024). Records one answer to an item in one skill: `score` is
   * 1 for right, 0 for wrong, or anything between for partial credit. Both the learner's skill
   * rating and the item's rating move. A never-rated item starts at `itemSeed` (default 1000).
   */
  recordResult(
    skill: string,
    itemId: string,
    score: number,
    options?: { at?: Date; itemSeed?: number },
  ): Promise<{ learner: SkillRating; item: SkillRating }>;
  /** The learner's rating in each skill they have results in. */
  skillRatings(): Promise<Map<string, SkillRating>>;
  /** The given items' ratings in one skill. Items missing from the map are not rated yet. */
  itemRatings(skill: string, itemIds: readonly string[]): Promise<Map<string, SkillRating>>;
  /**
   * One of this subject's private content packs (ADR 0023), by source, e.g. `lingualism-pcav`:
   * copyrighted content that lives in Supabase, readable only when signed in (ADR 0011). Loaded
   * once and kept for the session.
   */
  privateContent(source: string): Promise<{ items: Item[]; lessons: Lesson[] }>;
  /**
   * A short-lived link to a private media file named in this subject's content (`media.path`).
   * Load the pack first: a path no loaded pack of this subject names is refused.
   */
  mediaUrl(path: string): Promise<string>;
  /**
   * Links to several media files in one request (#124), e.g. a session's recordings as it
   * starts, at most `MAX_MEDIA_LINKS`. Every path must be named, as for `mediaUrl`. Paths the
   * store couldn't sign are missing from the map.
   */
  mediaUrls(paths: readonly string[]): Promise<Map<string, string>>;
  /**
   * "Did it understand you?" (ADR 0014): what the speech model hears in a recording of the
   * learner (Palestinian Arabic for now). Sends the audio to Groq through our own function, so
   * call it only when the learner asks for the check. Fails with a `SpeechError`, e.g. when
   * today's checks are used up.
   */
  transcribe(audio: Blob): Promise<Heard>;
  /**
   * The AI partner (E15, ADR 0036): one line a character says, written by Gemini (or Groq) through
   * our own function. Fails with a `PartnerError`, e.g. when today's replies are used up; every
   * caller keeps a scripted line to fall back on.
   */
  partner(ask: PartnerAsk): Promise<PartnerReply>;
  /**
   * Challenges between friends (task 3.4, docs/game/challenges.md): record a finished round's
   * score against the session that saved it (pass `sessionId` to `saveSession`), offer it to a
   * friend, or answer a friend's challenge with it.
   */
  rounds: RoundsApi;
  /** A live line to a friend (task 3.6, ADR 0046): your key's edges out, theirs in. */
  wire: WireApi;
}
