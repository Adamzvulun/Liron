// Guild ranks (E13, #174, ADR 0035): each subject's ladder is data (content/<subject>/ranks.json);
// the subject's own code says which conditions are met, and this works out where you stand.
import { z } from 'zod';

const RankData = z.object({
  order: z.number().int().positive(),
  name: z.string(),
  arabic: z.string().optional(),
  conditions: z.array(z.string()).min(1),
  /** The rank's gear (#176): an item id in content/core/items.json, given when it's taken. */
  gear: z.string().optional(),
  /** Set while a condition needs a feature that isn't built yet: the rank can't be taken. */
  later: z.string().optional(),
});

export interface Rank extends z.infer<typeof RankData> {
  id: string;
}

/** Reads a ranks pack, in ladder order. */
export function ranksFrom(pack: { items: { id: string; type: string; data: unknown }[] }): Rank[] {
  return pack.items
    .filter((i) => i.type === 'rank')
    .map((i) => ({ id: i.id.replace(/^rank:/, ''), ...RankData.parse(i.data) }))
    .sort((a, b) => a.order - b.order);
}

export interface RankCheck {
  text: string;
  done: boolean;
}

export interface RankStanding {
  rank: Rank;
  /** The next rank, if there is one. */
  next?: Rank;
  /** The next rank's conditions, each marked done or not. */
  checks: RankCheck[];
  /** True when the next rank waits on a feature that isn't built yet. */
  later: boolean;
}

/**
 * Where you stand: the highest rank whose conditions, and every rank's below it, are all met.
 * `met(rank)` gives one boolean per condition, in the order of the rank's conditions; the first
 * rank is always held. A rank in `taken` (one you've already taken) counts as met, so a rank is
 * never lost when a condition later reads lower, such as a slower drill (review, 2026-11-15).
 */
export function standing(
  ranks: readonly Rank[],
  met: (rank: Rank) => boolean[],
  taken: readonly string[] = [],
): RankStanding {
  const first = ranks[0];
  if (!first) throw new Error('A rank ladder needs at least one rank');
  let held = first;
  let i = 1;
  for (; i < ranks.length; i++) {
    const r = ranks[i];
    // Every condition the rank names, not only those the subject answered: a condition added to
    // the content without its check stays unmet (review, 2026-11-19).
    const allMet = (done: boolean[]) => r?.conditions.every((_, j) => done[j] === true) ?? false;
    if (!r || r.later || !(taken.includes(r.id) || allMet(met(r)))) break;
    held = r;
  }
  const next = ranks[i];
  const done = next ? met(next) : [];
  return {
    rank: held,
    next,
    checks: next ? next.conditions.map((text, j) => ({ text, done: !!done[j] })) : [],
    later: !!next?.later,
  };
}

/** Ranks above the first that you hold, in order: what a save reports as `rank-<id>` events. */
export const heldRanks = (ranks: readonly Rank[], s: RankStanding) =>
  ranks.slice(1, ranks.indexOf(s.rank) + 1);

/** The short line under the rank: "2 of 4 · <the first open condition>". */
export function needLine(s: RankStanding): string {
  if (!s.next) return 'The top of the guild';
  if (s.later) return s.next.later ?? 'Comes later';
  const open = s.checks.find((c) => !c.done);
  const done = s.checks.filter((c) => c.done).length;
  return open ? `${done} of ${s.checks.length} · ${open.text}` : 'Ready';
}
