// Saving an Instant Recognition round (#32): personal best, each letter's reaction time (which
// steers what comes up next time), a receive rating per letter, XP and minutes.

import type { SubjectApi } from '../../../core/subject.ts';
import type { MorseProgress } from '../lesson/progress.ts';
import { ratingScore, type Attempt, type RoundSummary } from './game.ts';

/** About 10 XP a minute (docs/game/economy.md): a good minute is ~25 right answers. */
export const xpForRound = (summary: RoundSummary) => Math.round(summary.right * 0.4);

/** The state after a round: best score, rounds played, smoothed reaction time per letter. */
export function applyRound(p: MorseProgress, summary: RoundSummary): MorseProgress {
  const avgMs = { ...p.recognition.avgMs };
  for (const [c, t] of summary.byChar) {
    // A letter never answered right counts as slow (the fuse length).
    const ms = t.right ? t.avgMs : 3000;
    const prev = avgMs[c];
    avgMs[c] = Math.round(prev === undefined ? ms : 0.6 * prev + 0.4 * ms);
  }
  return {
    ...p,
    recognition: {
      best: Math.max(p.recognition.best, summary.points),
      rounds: p.recognition.rounds + 1,
      avgMs,
    },
  };
}

/** Each letter's rating score for the round: the mean of its answers' scores. */
export function letterScores(attempts: readonly Attempt[]): Map<string, number> {
  const sums = new Map<string, { total: number; n: number }>();
  for (const a of attempts) {
    const s = sums.get(a.char) ?? { total: 0, n: 0 };
    s.total += ratingScore(a);
    s.n++;
    sums.set(a.char, s);
  }
  return new Map([...sums].map(([c, s]) => [c, s.total / s.n]));
}

/** Reports a round, one request at a time so the learner's rating updates in order. */
export async function reportRound(
  api: SubjectApi,
  next: MorseProgress,
  attempts: readonly Attempt[],
  summary: RoundSummary,
  seconds: number,
  /** The round beat the learner's best before it (a daily contract, ADR 0032). */
  beatBest = false,
  at = new Date(),
): Promise<void> {
  await api.saveSession({
    state: next,
    results: [...letterScores(attempts)].map(([c, score]) => ({
      skill: 'receive',
      itemId: `char:${c}`,
      score,
    })),
    xp: xpForRound(summary),
    minutes: seconds / 60,
    events: [{ kind: 'recognition-round' }, ...(beatBest ? [{ kind: 'recognition-best' }] : [])],
    at,
  });
}
