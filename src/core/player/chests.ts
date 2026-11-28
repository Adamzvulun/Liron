import chestData from '../../../content/core/chests.json' with { type: 'json' };
import { isFurniture, wareName } from './market.ts';
import type { Chest, ChestContents, TodaysContracts } from '../progress/store.ts';
import type { SubjectInfo } from '../subject.ts';

const entries = chestData.items as readonly {
  id: string;
  type: string;
  data: { name?: string; chest?: string };
}[];

/** A chest's name from content/core/chests.json, e.g. "Brass chest". */
export function chestName(kind: string): string {
  return entries.find((i) => i.type === 'chest' && i.id === kind)?.data.name ?? 'Chest';
}

/** The chest finishing a day's contracts gives (ADR 0033). */
const CONTRACTS_CHEST = entries.find((i) => i.id === 'contracts')?.data.chest ?? 'wooden';

/** One spot on the Notice Board's chest shelf: a chest to open, or today's still locked. */
export interface ShelfChest {
  /** null: today's contract chest, not earned yet. */
  id: string | null;
  kind: string;
  name: string;
  /** What earned it, e.g. "For a 7-day streak". */
  reason: string;
  /** Today's contract chest while locked: contracts done, and how many there are. */
  seals?: { done: number; of: number };
}

/** Why a chest was given, from its source and key (ADR 0033). */
export function chestReason(chest: Chest, subjects: readonly SubjectInfo[]): string {
  if (chest.source === 'contracts') return 'For finishing a day’s three contracts';
  if (chest.source === 'trial') {
    const [subject, chapter] = chest.sourceKey.split(':');
    const place = subjects.find((s) => s.id === subject)?.place ?? 'A';
    return `${place}: chapter ${chapter} trial passed`;
  }
  if (chest.source === 'milestone') return 'For your first milestone check';
  const days = chest.sourceKey.split(':')[1];
  return `For a ${days}-day streak`;
}

/**
 * The shelf: chests waiting to be opened, oldest first, then today's contract chest while its
 * contracts aren't all done (it appears among the others once they are).
 */
export function chestShelf(
  chests: readonly Chest[],
  contracts: TodaysContracts | null,
  subjects: readonly SubjectInfo[],
  /** The chest today's contracts give, in a world event's week (task 4.4). */
  eventChest?: string,
): ShelfChest[] {
  const shelf: ShelfChest[] = chests.map((c) => ({
    id: c.id,
    kind: c.kind,
    name: chestName(c.kind),
    reason: chestReason(c, subjects),
  }));
  const list = contracts?.contracts ?? [];
  const done = list.filter((c) => c.paid).length;
  // The database gives the chest for a full board of three (grant_chests); a board picked
  // before any subject was started holds one, and is filled once one is (review, 2026-11-19).
  if (list.length === 3 && done < list.length) {
    const kind = eventChest ?? CONTRACTS_CHEST;
    shelf.push({
      id: null,
      kind,
      name: chestName(kind),
      reason: 'Finish all three of today’s contracts to open it',
      seals: { done, of: list.length },
    });
  }
  return shelf;
}

/** One thing that came out of a chest, in the order they rise. */
export interface Loot {
  key: string;
  icon: 'coin' | 'gem' | 'gear' | 'shield';
  text: string;
}

/** What an opened chest held, as lines to show one by one. */
export function lootOf(c: ChestContents): Loot[] {
  const loot: Loot[] = [{ key: 'gold', icon: 'coin', text: `+${c.gold} gold` }];
  if (c.gems)
    loot.push({ key: 'gems', icon: 'gem', text: `+${c.gems} ${c.gems === 1 ? 'gem' : 'gems'}` });
  if (c.item) {
    const name = wareName({ id: c.item });
    const home = isFurniture(c.item);
    loot.push(
      c.itemGold
        ? { key: 'item', icon: 'coin', text: `${name}, already yours: +${c.itemGold} gold` }
        : { key: 'item', icon: 'gear', text: `${name}, new ${home ? 'for your room' : 'to wear'}` },
    );
  }
  if (c.shield) {
    loot.push(
      c.shieldGold
        ? { key: 'shield', icon: 'coin', text: `Streak shield, you hold 2: +${c.shieldGold} gold` }
        : { key: 'shield', icon: 'shield', text: 'A streak shield' },
    );
  }
  return loot;
}
