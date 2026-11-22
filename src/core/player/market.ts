import { DYES, GEAR, SLOTS } from '../avatar/looks.ts';
import { MAX_SHIELDS } from '../progress/economy.ts';
import type { Ware } from '../progress/store.ts';

/** A ware's name: the gear's or the dye's, or the streak shield. */
export function wareName(w: Pick<Ware, 'id'>): string {
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
  if (!w.slot) return rarity;
  // A pet is a companion; the rest is worn on the slot named (head, torso, …).
  const slot = SLOTS.find((s) => s.id === w.slot)?.label.toLowerCase() ?? w.slot;
  return `${rarity} · ${slot}`;
}
