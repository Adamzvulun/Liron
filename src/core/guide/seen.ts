// What the guide counts as already shown (docs/game/the-guide.md §4, #407): the ids saved on the
// account, plus what the player's own state proves they already know, so a player who was here
// before the guide (Adam at level 3, gear owned) isn't greeted like a stranger.
import { DEFAULT_LOOK, lookKey, type Look } from '../avatar/looks.ts';

/** The ids of the guide's lines. Saved on the account, so never rename one. */
export const GUIDE_IDS = {
  welcome: 'welcome',
  board: 'intro:board',
  fellowship: 'intro:fellowship',
  market: 'intro:market',
  wardrobe: 'intro:wardrobe',
  otherHall: 'intro:other-hall',
  arena: 'intro:arena',
  ledger: 'intro:ledger',
} as const;

/** The id of a place's or station's first-visit card, e.g. `card:market`, `card:morse:listen`. */
export const cardId = (...parts: readonly string[]) => `card:${parts.join(':')}`;

/** What the player's state says they already know. */
export interface Known {
  /** Ids saved on the account. */
  saved: readonly string[];
  /** Item ids owned. */
  owned: readonly string[];
  avatar: Look;
}

/**
 * The saved ids, and what the player's state proves. (A player who was here before the guide
 * has `welcome` saved by its migration, 20270113000000_guide_seen.sql.)
 */
export function guideSeen({ saved, owned, avatar }: Known): ReadonlySet<string> {
  const seen = new Set(saved);
  // Owning something means the Market (or a chest or rank) has shown what gear is.
  if (owned.length > 0) {
    seen.add(GUIDE_IDS.market);
    seen.add(cardId('market'));
  }
  // A changed look means the wardrobe has been found.
  if (lookKey(avatar) !== lookKey(DEFAULT_LOOK)) seen.add(GUIDE_IDS.wardrobe);
  return seen;
}
