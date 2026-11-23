import home from '../../../content/core/home.json' with { type: 'json' };
import { ROOM, STARTER_PIECES, type Layout, type Room } from './layout.ts';

/**
 * Coziness (task 8.2, #470; the-home.md §14): how many different things a room has ever held
 * beyond the starter room. The database keeps the list and only ever adds to it
 * (`home_held_of`, migration 20270120000000_coziness.sql); `heldOf` counts a layout the same way.
 */
const STARTER_IDS = new Set(STARTER_PIECES.map((p) => p.id));

/** What a layout holds beyond the starter room: furniture ids, `wallpaper:…` and `floor:…`. */
export function heldOf(l: Layout, room: Room = ROOM): string[] {
  const held = new Set(l.pieces.map((p) => p.id).filter((id) => !STARTER_IDS.has(id)));
  if (!room.wallpapers.includes(l.wallpaper)) held.add(`wallpaper:${l.wallpaper}`);
  if (!room.floors.includes(l.floor)) held.add(`floor:${l.floor}`);
  return [...held].sort();
}

/** What has been held, with a layout's things added: the list never loses one. */
export const withHeld = (held: readonly string[], l: Layout) =>
  [...new Set([...held, ...heldOf(l)])].sort();

export interface Tier {
  at: number;
  name: string;
}

export const TIERS: Tier[] = (
  home.items.find((i) => i.type === 'home-coziness')?.data as { tiers: Tier[] }
).tiers;

/** The tier a count reaches, and the next one with how many more it needs. */
export function coziness(n: number): { tier: Tier; next?: { tier: Tier; more: number } } {
  const reached = TIERS.filter((t) => t.at <= Math.max(0, n));
  const tier = reached[reached.length - 1] ?? FIRST;
  const after = TIERS.find((t) => t.at > n);
  return after ? { tier, next: { tier: after, more: after.at - n } } : { tier };
}
const FIRST: Tier = TIERS[0] ?? { at: 0, name: '' };
