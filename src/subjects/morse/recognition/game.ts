// Instant Recognition (#32): one character plays, you press it before the lamp goes out.
// Pure rules here (picking, points, the summary); the screen is Recognition.tsx.

/** Length of a round, in seconds. */
export const ROUND_SECONDS = 60;
/** Time to answer after the sound ends, in milliseconds. */
export const FUSE_MS = 3000;

export interface Attempt {
  char: string;
  /** What was pressed, or "" if the lamp went out. */
  pressed: string;
  right: boolean;
  /** From the end of the sound to the key press, in milliseconds (the fuse length if missed). */
  ms: number;
}

/** Points for one answer: 10 for a right answer, up to 30 more for speed. Nothing if wrong. */
export function pointsFor(attempt: Attempt): number {
  if (!attempt.right) return 0;
  return 10 + Math.round((30 * Math.max(0, FUSE_MS - attempt.ms)) / FUSE_MS);
}

/**
 * The next character. Slow characters come up more often: the weight is the character's average
 * reaction time (unknown ones count as slow), never the same character three times running.
 */
export function pickNext(
  chars: readonly string[],
  avgMs: ReadonlyMap<string, number>,
  recent: readonly string[],
  random: () => number = Math.random,
): string {
  const [a, b] = recent.slice(-2);
  const allowed = a !== undefined && a === b ? chars.filter((c) => c !== a) : [...chars];
  const pool = allowed.length ? allowed : [...chars];
  const weight = (c: string) => 300 + (avgMs.get(c) ?? FUSE_MS / 2);
  const total = pool.reduce((sum, c) => sum + weight(c), 0);
  let r = random() * total;
  for (const c of pool) {
    r -= weight(c);
    if (r < 0) return c;
  }
  return pool[pool.length - 1] ?? '';
}

export interface RoundSummary {
  points: number;
  right: number;
  answered: number;
  /** Average reaction time of right answers, in ms (0 if none). */
  avgMs: number;
  /** Per character: average reaction time of right answers, and right / tries. */
  byChar: Map<string, { avgMs: number; right: number; tries: number }>;
}

export function summarize(attempts: readonly Attempt[]): RoundSummary {
  const byChar = new Map<string, { avgMs: number; right: number; tries: number }>();
  let points = 0;
  let rightMs = 0;
  let right = 0;
  for (const at of attempts) {
    points += pointsFor(at);
    const t = byChar.get(at.char) ?? { avgMs: 0, right: 0, tries: 0 };
    t.tries++;
    if (at.right) {
      t.avgMs = (t.avgMs * t.right + at.ms) / (t.right + 1);
      t.right++;
      right++;
      rightMs += at.ms;
    }
    byChar.set(at.char, t);
  }
  return {
    points,
    right,
    answered: attempts.length,
    avgMs: right ? Math.round(rightMs / right) : 0,
    byChar,
  };
}

/** The score a rating gets for one answer: right and fast near 1, slow lower, wrong 0. */
export const ratingScore = (attempt: Attempt) =>
  attempt.right ? 0.5 + 0.5 * Math.max(0, 1 - attempt.ms / FUSE_MS) : 0;
