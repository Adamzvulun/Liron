// The numbers the Guidebook's pages quote (the-guide.md §3.5, R16; #412), read from the code and
// content that set them, so a page can't go on saying an old price. A page names one as
// {name}; a test fails on a name that isn't here.
import home from '../../../content/core/home.json' with { type: 'json' };
import items from '../../../content/core/items.json' with { type: 'json' };
import { CHEAPEST_WARE } from '../player/compass.ts';
import {
  DAILY_CHEST_GOLD,
  DAILY_GOAL_CHOICES,
  GEM_EVERY_LEVELS,
  GOLD_PER_LEVEL,
  GOLD_PER_XP,
  MAX_SHIELDS,
  STREAK_GEM_EVERY,
} from '../progress/economy.ts';

const shield = items.items.find((i) => i.id === 'streak-shield')?.data as
  { price?: number } | undefined;

const room = home.items.find((i) => i.type === 'home-room')?.data as
  { caps: { floor: number; wall: number } } | undefined;

export const NUMBERS: Readonly<Record<string, number>> = {
  cheapestWare: CHEAPEST_WARE,
  goldPerLevel: GOLD_PER_LEVEL,
  xpPerGold: Math.round(1 / GOLD_PER_XP),
  gemEveryLevels: GEM_EVERY_LEVELS,
  streakGemEvery: STREAK_GEM_EVERY,
  dailyChestGold: DAILY_CHEST_GOLD,
  goalMin: Math.min(...DAILY_GOAL_CHOICES),
  goalMax: Math.max(...DAILY_GOAL_CHOICES),
  shieldPrice: shield?.price ?? NaN,
  maxShields: MAX_SHIELDS,
  floorPieces: room?.caps.floor ?? NaN,
  wallPieces: room?.caps.wall ?? NaN,
};

/** A page's text with its numbers in. Throws on a name that isn't a number here. */
export function fill(text: string): string {
  return text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const n = NUMBERS[name];
    if (n === undefined || Number.isNaN(n))
      throw new Error(`The Guidebook has no number {${name}}`);
    return String(n);
  });
}
