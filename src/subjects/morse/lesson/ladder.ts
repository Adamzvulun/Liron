// The speed ladder (docs/game/morse-speed.md, #508): after Forty Winters, five rungs of faster
// character speed. A rung opens when you copy at 90% with standard spacing at the one below, in
// two sessions on different days (Koch's gate, as in the lessons).
import { localDay } from '../../../core/road/road.ts';
import { finalePassed } from '../qso/fortyWinters.ts';
import { charWpmOf, topSpeed, type MorseProgress } from './progress.ts';
import { GATE_ACCURACY, GATE_RUNS, type RunScore } from './score.ts';

export const RUNGS = [22, 25, 28, 30, 35] as const;
/** A run needs this many characters to count, so a handful of lucky ones can't open a rung. */
export const LADDER_MIN_CHARS = 30;

/** The rung the player is working toward; none before Forty Winters, or past the last. */
export const nextRung = (p: MorseProgress) =>
  finalePassed(p) ? RUNGS.find((r) => r > topSpeed(p)) : undefined;

/**
 * Counts a copy run toward the next rung. It counts when it is not a warm-up, was played at the
 * top open speed with standard spacing (Farnsworth caught up), and scored 90% or better over
 * at least 30 characters, by the player's local day. A second such day opens the rung and raises the automatic speed; a manual override stays.
 * `before` is the state the run was played under, `next` what `applyRun` made of it.
 */
export function climb(
  before: MorseProgress,
  next: MorseProgress,
  score: RunScore,
  at: Date,
  warmup: boolean,
  minChars = LADDER_MIN_CHARS,
): { next: MorseProgress; rung: number | null } {
  const rung = nextRung(before);
  const top = topSpeed(before);
  const day = localDay(at);
  const counts =
    rung !== undefined &&
    !warmup &&
    score.played >= minChars &&
    charWpmOf(before) === top &&
    before.effWpm >= top &&
    score.accuracy >= GATE_ACCURACY;
  if (!counts || before.ladderDays.includes(day)) return { next, rung: null };
  const days = [...before.ladderDays, day];
  if (days.length < GATE_RUNS) return { next: { ...next, ladderDays: days }, rung: null };
  return {
    next: { ...next, ladderDays: [], rungs: [...before.rungs, rung], charWpm: rung },
    rung,
  };
}
