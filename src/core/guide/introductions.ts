// Introductions, one at a time (docs/game/the-guide.md §3.3, R6–R10; #410). After the welcome,
// Nour introduces the first place in this list whose moment has come and which hasn't been
// introduced, and that place wears the "new" mark until the player goes in. Every place stays
// open the whole time: this only decides what Nour points at next.
import { PLACE_PATHS } from '../city/layout.ts';
import type { PlaceId } from '../city/painter';
import { visitPath } from '../fellowship/fellowship.ts';
import { CHEAPEST_WARE } from '../player/compass.ts';
import { GUIDE_IDS } from './seen.ts';

/** Where an introduction points: a place on the square, or the Arena's sign. */
export type Spot = PlaceId | 'arena';

/** What the square knows about the player, enough to tell when each place becomes useful. */
export interface IntroFacts {
  gold: number;
  /** How many items the player owns. */
  owned: number;
  /** How many friends stand in the player's Fellowship. */
  friends: number;
  /** Each guild's road: the hall it is walked in, and how many of its steps are done. */
  roads: readonly { hall: PlaceId | undefined; done: number }[];
}

export interface Introduction {
  /** Its id in `guide_seen` (seen.ts). */
  id: string;
  /** What wears the new mark. */
  spot: Spot;
  /** Going here introduces it. */
  href: string;
}

const HREF: Record<Spot, string> = { ...PLACE_PATHS, arena: '/arena' };

const at = (id: string, spot: Spot): Introduction => ({ id, spot, href: HREF[spot] });
const stepsDone = (f: IntroFacts) => f.roads.reduce((n, r) => n + r.done, 0);

/** The order of the spec's table (§3.3), each with when its place becomes useful. */
const ORDER: readonly ((f: IntroFacts) => Introduction | null)[] = [
  // 1. The Notice Board: as soon as the welcome is done.
  () => at(GUIDE_IDS.board, 'board'),
  // 2. The Fellowship, through Your House: once there is a friend (an invited friend has one).
  (f) => (f.friends > 0 ? at(GUIDE_IDS.fellowship, 'house') : null),
  // 3. The Market: gold enough for its cheapest ware.
  (f) => (f.gold >= CHEAPEST_WARE ? at(GUIDE_IDS.market, 'market') : null),
  // 4. The wardrobe, in Your House: once there is gear to wear.
  (f) => (f.owned > 0 ? at(GUIDE_IDS.wardrobe, 'house') : null),
  // 5. The other hall: one road three steps in, another not begun.
  (f) => {
    if (!f.roads.some((r) => r.done >= 3)) return null;
    const other = f.roads.find((r) => r.done === 0 && r.hall);
    return other?.hall ? at(GUIDE_IDS.otherHall, other.hall) : null;
  },
  // 6. The Arena: a friend to challenge, and five steps done.
  (f) => (f.friends > 0 && stepsDone(f) >= 5 ? at(GUIDE_IDS.arena, 'arena') : null),
  // 7. The ledger and trophies, in Your House: once there's a road behind the player (ten
  //    steps, a stand-in: the square doesn't read ranks, and a first rank can come at once).
  (f) => (stepsDone(f) >= 10 ? at(GUIDE_IDS.ledger, 'house') : null),
];

/** The introduction due now, or null: the first whose moment has come and isn't seen (R6). */
export function nextIntroduction(
  facts: IntroFacts,
  seen: ReadonlySet<string>,
): Introduction | null {
  if (!seen.has(GUIDE_IDS.welcome)) return null;
  for (const due of ORDER) {
    const intro = due(facts);
    if (intro && !seen.has(intro.id)) return intro;
  }
  return null;
}

/** A friend's house sits under Your House's path, but visiting it isn't going into your own. */
const VISITING = visitPath('');

/** Whether the player is inside the introduced place (R8): its path, or a page under it. */
export const isInside = (intro: Introduction, path: string) =>
  !path.startsWith(VISITING) && (path === intro.href || path.startsWith(`${intro.href}/`));
