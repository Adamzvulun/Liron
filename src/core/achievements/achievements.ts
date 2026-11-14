// Achievements and titles (E13, #177, ADR 0035). Each one is data (content/core/achievements.json);
// the database checks them and pays their gems, and says how far along each one is. This joins
// the two for Your House.
import * as z from 'zod/mini';
import pack from '../../../content/core/achievements.json' with { type: 'json' };

const AchievementData = z.object({
  order: z.int().check(z.positive()),
  name: z.string(),
  /** The condition, as the player reads it. */
  text: z.string(),
  /** What the database counts (supabase/migrations/20261118000000_achievements.sql). */
  condition: z.looseObject({ kind: z.string(), n: z.int().check(z.positive()) }),
  gems: z.int().check(z.minimum(1), z.maximum(5)),
  /** The title it unlocks, worn under your name. */
  title: z.optional(z.string()),
});

export interface Achievement extends z.infer<typeof AchievementData> {
  id: string;
}

export const ACHIEVEMENTS: readonly Achievement[] = pack.items
  .filter((i) => i.type === 'achievement')
  .map((i) => ({ id: i.id, ...AchievementData.parse(i.data) }))
  .sort((a, b) => a.order - b.order);

/** One achievement as the database reports it for the signed-in player. */
export interface AchievementStatus {
  id: string;
  progress: number;
  target: number;
  /** When it was earned; null while it isn't. */
  earnedAt: string | null;
}

/** The player's achievements, the title worn ('' for none) and the gems held. */
export interface MyAchievements {
  title: string;
  gems: number;
  achievements: AchievementStatus[];
}

export interface Plaque extends Achievement {
  progress: number;
  target: number;
  earned: boolean;
}

/** Every achievement in the content's order, with the player's progress (none if unknown). */
export function plaques(mine: MyAchievements | null): Plaque[] {
  const status = new Map(mine?.achievements.map((a) => [a.id, a]));
  return ACHIEVEMENTS.map((a) => {
    const s = status.get(a.id);
    return {
      ...a,
      progress: s?.progress ?? 0,
      target: s?.target ?? a.condition.n,
      earned: Boolean(s?.earnedAt),
    };
  });
}

/** The titles the player has earned and can wear, in the content's order. */
export const earnedTitles = (mine: MyAchievements | null): string[] =>
  plaques(mine).flatMap((p) => (p.earned && p.title ? [p.title] : []));
