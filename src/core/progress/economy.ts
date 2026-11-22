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

export const DEFAULT_DAILY_GOAL = 15;
export const DAILY_GOAL_CHOICES = [5, 10, 15, 20, 30, 45, 60] as const;
export const DAILY_CHEST_GOLD = 20;
export const STREAK_GEM_EVERY = 7; // the chest holds a gem on every 7th day of a streak
/** Streak shields a player can hold (wallets.streak_shields is 0–2, ADR 0033). */
export const MAX_SHIELDS = 2;

/** What reaching the daily goal pays, given the streak including today. */
export function dailyChest(streak: number): { gold: number; gems: number } {
  return {
    gold: DAILY_CHEST_GOLD,
    gems: streak > 0 && streak % STREAK_GEM_EVERY === 0 ? 1 : 0,
  };
}

/** Adds `n` days to an ISO date (YYYY-MM-DD). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Consecutive goal days ending today, or ending yesterday while today's goal is still open.
 * A missed day resets it, unless a streak shield covered it (ADR 0034): a shielded day keeps the
 * streak alive but doesn't add to it.
 */
export function streakFrom(
  goalDays: Iterable<string>,
  today: string,
  shieldedDays: Iterable<string> = [],
): number {
  const goals = new Set(goalDays);
  const shielded = new Set(shieldedDays);
  let day = goals.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (goals.has(day) || shielded.has(day)) {
    if (goals.has(day)) streak++;
    day = addDays(day, -1);
  }
  return streak;
}
