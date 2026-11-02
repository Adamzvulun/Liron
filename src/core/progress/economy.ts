// Levels and rewards (issue #19, ADR 0020). The rates are explained in docs/game/economy.md.
// The database applies the same rules when XP is recorded
// (supabase/migrations/20261102230000_levels_and_rewards.sql); a test checks they agree.

/** Total XP needed to reach `level`. Level n -> n+1 costs 10n + 10 XP: 20, 30, 40, ... */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 5 * (l - 1) * (l + 2);
}

/** The level for a total XP. Level 1 starts at 0 XP. */
export function levelForXp(xp: number): number {
  let level = Math.max(1, Math.floor((Math.sqrt(9 + 0.8 * Math.max(0, xp)) - 1) / 2));
  while (xpForLevel(level + 1) <= xp) level++;
  while (level > 1 && xpForLevel(level) > xp) level--;
  return level;
}

/** Where you are inside your current level, for the XP bar. */
export function levelProgress(xp: number): { level: number; into: number; needed: number } {
  const level = levelForXp(xp);
  const start = xpForLevel(level);
  return { level, into: xp - start, needed: xpForLevel(level + 1) - start };
}

export const GOLD_PER_XP = 1 / 5;
export const GOLD_PER_LEVEL = 5; // reaching level L pays 5 x L gold
export const GEM_EVERY_LEVELS = 5;

/** What going from `xpBefore` to `xpAfter` pays. */
export function rewardsFor(xpBefore: number, xpAfter: number): { gold: number; gems: number } {
  const a = levelForXp(xpBefore);
  const b = levelForXp(xpAfter);
  const triangle = (n: number) => (n * (n + 1)) / 2;
  return {
    gold:
      Math.floor(xpAfter * GOLD_PER_XP) -
      Math.floor(xpBefore * GOLD_PER_XP) +
      GOLD_PER_LEVEL * (triangle(b) - triangle(a)),
    gems: Math.floor(b / GEM_EVERY_LEVELS) - Math.floor(a / GEM_EVERY_LEVELS),
  };
}

/** Titles by level, from the world lore (docs/discovery/04-world-and-lore.md). */
const TITLES: readonly [number, string][] = [
  [50, 'Legend'],
  [35, 'Champion'],
  [20, 'Veteran'],
  [10, 'Pathfinder'],
  [5, 'Adventurer'],
  [1, 'Wanderer'],
];

export function titleForLevel(level: number): string {
  return TITLES.find(([min]) => level >= min)?.[1] ?? 'Wanderer';
}
