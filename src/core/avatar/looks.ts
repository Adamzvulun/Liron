import { z } from 'zod';

// The paper-doll avatar (#28, ADR 0006): base layers and gear slots are data. Painting is in
// paint.ts; the customiser in Your House (#29) offers what is listed here.

export const BUILDS = [
  { id: 'slim', label: 'Slim' },
  { id: 'average', label: 'Average' },
  { id: 'broad', label: 'Broad' },
] as const;

/** Skin tones, each a light, mid and shadow colour for the gradients. */
export const SKINS = [
  { id: 'porcelain', label: 'Porcelain', light: '#FBE0C8', mid: '#EFBE9A', dark: '#C98E68' },
  { id: 'sand', label: 'Sand', light: '#F6C9A2', mid: '#E0A77C', dark: '#B8774E' },
  { id: 'olive', label: 'Olive', light: '#E6B98A', mid: '#C99363', dark: '#94643C' },
  { id: 'bronze', label: 'Bronze', light: '#D49A6A', mid: '#B07648', dark: '#7A4A28' },
  { id: 'umber', label: 'Umber', light: '#A97350', mid: '#875535', dark: '#55301A' },
  { id: 'ebony', label: 'Ebony', light: '#7E5238', mid: '#5E3A24', dark: '#381E10' },
] as const;

export const FACES = [
  { id: 'cheerful', label: 'Cheerful' },
  { id: 'determined', label: 'Determined' },
  { id: 'calm', label: 'Calm' },
  { id: 'bold', label: 'Bold' },
] as const;

export const HAIRS = [
  { id: 'crop', label: 'Crop' },
  { id: 'swept', label: 'Swept' },
  { id: 'curly', label: 'Curls' },
  { id: 'long', label: 'Long' },
  { id: 'bun', label: 'Bun' },
  { id: 'shaved', label: 'Shaved' },
] as const;

export const HAIR_COLOURS = [
  { id: 'black', label: 'Black', light: '#4A3A34', dark: '#16100E' },
  { id: 'brown', label: 'Brown', light: '#7A4E30', dark: '#2E1A0E' },
  { id: 'auburn', label: 'Auburn', light: '#B0583A', dark: '#5A2214' },
  { id: 'blond', label: 'Blond', light: '#F0D08A', dark: '#A8783A' },
  { id: 'grey', label: 'Gray', light: '#D8D4CC', dark: '#7A746C' },
] as const;

export const BEARDS = [
  { id: 'none', label: 'None' },
  { id: 'stubble', label: 'Stubble' },
  { id: 'full', label: 'Beard' },
] as const;

/** Gear slots (ADR 0006). A companion pet comes later. */
export const SLOTS = [
  { id: 'head', label: 'Head' },
  { id: 'torso', label: 'Torso' },
  { id: 'legs', label: 'Legs' },
  { id: 'feet', label: 'Feet' },
  { id: 'hand', label: 'Hand' },
  { id: 'back', label: 'Back' },
] as const;
export type SlotId = (typeof SLOTS)[number]['id'];

export interface GearItem {
  id: string;
  slot: SlotId;
  name: string;
  /** Starter items are everyone's from day one. */
  starter: boolean;
  /** For items that aren't starters: the milestone that gives it (ADR 0033). */
  earn?: string;
}

/**
 * Every piece of gear. Starter items can be worn now; the others show how they're earned.
 * An empty slot shows the plain clothes underneath (linen shirt, trousers, shoes).
 */
export const GEAR: readonly GearItem[] = [
  { id: 'tunic', slot: 'torso', name: "Traveler's tunic", starter: true },
  { id: 'wrap', slot: 'head', name: 'Desert wrap', starter: true },
  { id: 'satchel', slot: 'back', name: 'Courier satchel', starter: true },
  { id: 'staff', slot: 'hand', name: 'Walking staff', starter: true },
  {
    id: 'headset',
    slot: 'head',
    name: "Signaller's headset",
    starter: false,
    earn: 'Reach level 5 in the Signal Tower',
  },
  {
    id: 'cloak',
    slot: 'back',
    name: 'Merchant cloak',
    starter: false,
    earn: 'Keep a 7-day streak',
  },
  {
    id: 'boots',
    slot: 'feet',
    name: 'Copper-toe boots',
    starter: false,
    earn: 'Finish 10 daily contracts',
  },
  {
    id: 'breeches',
    slot: 'legs',
    name: "Rider's breeches",
    starter: false,
    earn: 'Pass a first-chapter trial in any guild',
  },
];

const ids = <T extends readonly { id: string }[]>(list: T) =>
  list.map((o) => o.id) as [T[number]['id'], ...T[number]['id'][]];

/** The look saved in `profiles.avatar`. Unknown or missing fields fall back to the default. */
export const lookSchema = z.object({
  build: z.enum(ids(BUILDS)).catch('average'),
  skin: z.enum(ids(SKINS)).catch('sand'),
  face: z.enum(ids(FACES)).catch('cheerful'),
  hair: z.enum(ids(HAIRS)).catch('crop'),
  hairColour: z.enum(ids(HAIR_COLOURS)).catch('brown'),
  beard: z.enum(ids(BEARDS)).catch('none'),
  gear: z
    .object(
      Object.fromEntries(
        SLOTS.map((s) => [s.id, z.string().optional().catch(undefined)]),
      ) as Record<SlotId, z.ZodCatch<z.ZodOptional<z.ZodString>>>,
    )
    .catch({}),
});
export type Look = z.infer<typeof lookSchema>;

/** The look a new player starts with: the traveler from the city concept. */
export const DEFAULT_LOOK: Look = {
  build: 'average',
  skin: 'sand',
  face: 'cheerful',
  hair: 'crop',
  hairColour: 'brown',
  beard: 'none',
  gear: { torso: 'tunic', back: 'satchel' },
};

/** Gear the player may wear: starters, and what they own (ADR 0033). */
export const canWear = (item: GearItem, owned: ReadonlySet<string>) =>
  item.starter || owned.has(item.id);

/**
 * Reads a stored look; anything unknown becomes the default, and gear the player may not wear
 * (not a starter, not owned) is taken off.
 */
export function parseLook(raw: unknown, owned: ReadonlySet<string> = new Set()): Look {
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) return DEFAULT_LOOK;
  const look = lookSchema.parse(raw);
  const gear: Look['gear'] = {};
  for (const [slot, item] of Object.entries(look.gear) as [SlotId, string | undefined][]) {
    const found = GEAR.find((g) => g.id === item);
    if (found && found.slot === slot && canWear(found, owned)) gear[slot] = item;
  }
  return { ...look, gear };
}
