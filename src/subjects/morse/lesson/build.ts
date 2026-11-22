// Building a copy run (docs/game/morse-lessons.md): random groups of 5 from the unlocked
// characters, enough to fill about two minutes of sound at the current speed.

import { schedule, type Speed } from '../timing.ts';

export const GROUP_SIZE = 5;
/** Sound per run, in seconds. Two runs in a row is the gate (ADR 0028). */
export const RUN_SECONDS = 120;
/** Share of the run given to the newest character while it's new. */
export const NEW_CHAR_SHARE = 0.25;

export interface RunPlan {
  /** The groups, e.g. ["KMKKM", "MKMMK", …]. */
  groups: string[];
  /** The same characters, one by one, in playing order. */
  chars: string[];
}

/**
 * `random` returns a number in [0, 1) (Math.random in the app, a seeded one in tests).
 * `weights` (optional) raise or lower a character's chance; the newest character gets
 * NEW_CHAR_SHARE of the run when `newChar` is given.
 */
export function buildRun(
  unlocked: readonly string[],
  speed: Speed,
  options: {
    random?: () => number;
    newChar?: string;
    weights?: ReadonlyMap<string, number>;
    seconds?: number;
    /** A fixed number of characters instead of a length in time (trials: 50). */
    count?: number;
  } = {},
): RunPlan {
  if (unlocked.length < 2) throw new RangeError('A run needs at least two characters');
  const { random = Math.random, newChar, weights, seconds = RUN_SECONDS, count } = options;
  const others = unlocked.filter((c) => c !== newChar);
  const weightOf = (c: string) => Math.max(0.2, weights?.get(c) ?? 1);
  const total = others.reduce((sum, c) => sum + weightOf(c), 0);

  const pick = () => {
    if (newChar && unlocked.includes(newChar) && random() < NEW_CHAR_SHARE) return newChar;
    let r = random() * total;
    for (const c of others) {
      r -= weightOf(c);
      if (r < 0) return c;
    }
    return others[others.length - 1] ?? unlocked[0] ?? '';
  };

  // Length of one group with its word gap, at this speed. Characters differ in length, so
  // measure as we go rather than guessing.
  const groups: string[] = [];
  const more = () =>
    count !== undefined
      ? groups.length * GROUP_SIZE < count
      : schedule(groups.join(' '), speed).duration < seconds;
  while (more()) groups.push(Array.from({ length: GROUP_SIZE }, pick).join(''));
  const chars = groups.join('').split('');
  // Every unlocked character is heard at least once, however short the run: each pick is
  // random, and a short run of K and M could otherwise be all K (it was, now and then, in the
  // tests' 4-second run). One that's missing takes the place of a character heard twice.
  for (const c of unlocked) {
    if (chars.includes(c)) continue;
    const start = Math.floor(random() * chars.length);
    for (let k = 0; k < chars.length; k++) {
      const i = (start + k) % chars.length;
      const there = chars[i] ?? '';
      if (chars.indexOf(there) !== chars.lastIndexOf(there)) {
        chars[i] = c;
        break;
      }
    }
  }
  const regrouped = Array.from({ length: groups.length }, (_, g) =>
    chars.slice(g * GROUP_SIZE, (g + 1) * GROUP_SIZE).join(''),
  );
  return { groups: regrouped, chars };
}

/** A small seeded random, so tests and screenshots repeat exactly. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 2 ** 32;
  };
}
