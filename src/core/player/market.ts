import { DYES, GEAR, SLOTS } from '../avatar/looks.ts';
import home from '../../../content/core/home.json' with { type: 'json' };
import { MAX_SHIELDS } from '../progress/economy.ts';
import type { Ware } from '../progress/store.ts';

// Read from the content, not layout.ts, so the stall and the chests don't load the room's rules.
const FURNITURE = new Map(
  home.items
    .filter((i) => i.type === 'home-furniture' || i.type === 'home-style')
    .map((i) => [i.id, i.data as { name: string; place?: string }]),
);
const furniture = (id: string) => FURNITURE.get(id);

/** Whether an item is for the room, furniture or a wallpaper or floor (§7, #443). */
export const isFurniture = (id: string): boolean => FURNITURE.has(id);

/** A ware's name: the gear's, the dye's or the furniture's, or the streak shield. */
export function wareName(w: Pick<Ware, 'id'>): string {
  const piece = furniture(w.id);
  if (piece) return piece.name.charAt(0).toUpperCase() + piece.name.slice(1);
  return (
    GEAR.find((g) => g.id === w.id)?.name ??
    DYES.find((d) => d.id === w.id)?.label ??
    (w.id === 'streak-shield' ? 'Streak shield' : w.id)
  );
}

/** What the ware is, in a few words. */
export function wareNote(w: Ware): string {
  if (w.kind === 'functional')
    return `Saves your streak on a missed day. Hold up to ${MAX_SHIELDS}.`;
  if (w.kind === 'color') return 'Dyes your traveler’s tunic.';
  const rarity = w.rarity.charAt(0).toUpperCase() + w.rarity.slice(1);
  if (w.kind === 'furniture' || w.kind === 'style')
    return `${rarity} · ${furniture(w.id)?.place === 'wall' ? 'for your wall' : 'for your room'}`;
  if (!w.slot) return rarity;
  // A pet is a companion; the rest is worn on the slot named (head, torso, …).
  const slot = SLOTS.find((s) => s.id === w.slot)?.label.toLowerCase() ?? w.slot;
  return `${rarity} · ${slot}`;
}
