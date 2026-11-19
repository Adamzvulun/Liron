import * as z from 'zod/mini';

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

/**
 * Headscarves (avatar ideas for later, 2026-11-11): a look option, not gear, so anyone can wear
 * one from the start. It covers the hair and falls over the shoulders, in one of these cloths.
 */
export const SCARVES = [
  { id: 'sand', label: 'Sand', light: '#F0D6AE', dark: '#B08658' },
  { id: 'rose', label: 'Rose', light: '#E6A4A0', dark: '#9A4E52' },
  { id: 'olive', label: 'Olive', light: '#B4BC84', dark: '#5E6A3A' },
  { id: 'indigo', label: 'Indigo', light: '#7E8CC4', dark: '#2E3A6E' },
  { id: 'black', label: 'Black', light: '#5E5866', dark: '#1E1A22' },
  { id: 'white', label: 'White', light: '#FBF8F2', dark: '#BDB4A6' },
] as const;
export type ScarfId = (typeof SCARVES)[number]['id'];

/** Gear slots (ADR 0006), and the companion pet, who sits at your feet. */
export const SLOTS = [
  { id: 'head', label: 'Head' },
  { id: 'torso', label: 'Torso' },
  { id: 'legs', label: 'Legs' },
  { id: 'feet', label: 'Feet' },
  { id: 'hand', label: 'Hand' },
  { id: 'back', label: 'Back' },
  { id: 'pet', label: 'Companion' },
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
  { id: 'tunic', slot: 'torso', name: 'Traveler’s tunic', starter: true },
  { id: 'wrap', slot: 'head', name: 'Desert wrap', starter: true },
  { id: 'satchel', slot: 'back', name: 'Courier satchel', starter: true },
  { id: 'staff', slot: 'hand', name: 'Walking staff', starter: true },
  {
    id: 'headset',
    slot: 'head',
    name: 'Signaler’s headset',
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
    name: 'Rider’s breeches',
    starter: false,
    earn: 'Pass a first-chapter trial in any guild',
  },
  // Wares (#49): given only by chests and the Market (ADR 0033).
  {
    id: 'tarboosh',
    slot: 'head',
    name: 'Red tarboosh',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'sunhat',
    slot: 'head',
    name: 'Straw sun hat',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'turban',
    slot: 'head',
    name: 'Scholar’s turban',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'vest',
    slot: 'torso',
    name: 'Embroidered vest',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'robe',
    slot: 'torso',
    name: 'Scholar’s robe',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'coat',
    slot: 'torso',
    name: 'Guildmaster’s coat',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'sirwal',
    slot: 'legs',
    name: 'Sirwal trousers',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'silks',
    slot: 'legs',
    name: 'Indigo silks',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'sandals',
    slot: 'feet',
    name: 'Leather sandals',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'ridingboots',
    slot: 'feet',
    name: 'Riding boots',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'flags',
    slot: 'hand',
    name: 'Signal flags',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'scroll',
    slot: 'hand',
    name: 'Map scroll',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'lamp',
    slot: 'hand',
    name: 'Brass signal lamp',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'bedroll',
    slot: 'back',
    name: 'Bedroll',
    starter: false,
    earn: 'From chests and the Market',
  },
  { id: 'oud', slot: 'back', name: 'Oud', starter: false, earn: 'From chests and the Market' },
  {
    id: 'banner',
    slot: 'back',
    name: 'Guild banner',
    starter: false,
    earn: 'From chests and the Market',
  },
  // More wares (2026-11-11): one more for each slot.
  {
    id: 'kufi',
    slot: 'head',
    name: 'Embroidered kufi',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'shawl',
    slot: 'torso',
    name: 'Woven shawl',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'gold-sirwal',
    slot: 'legs',
    name: 'Gold-stitched sirwal',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'slippers',
    slot: 'feet',
    name: 'Gilded slippers',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'falcon',
    slot: 'hand',
    name: 'Falconer’s glove',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'waterskin',
    slot: 'back',
    name: 'Water skin',
    starter: false,
    earn: 'From chests and the Market',
  },
  // Companions (ADR 0006): pets, from chests and the Market like the wares.
  {
    id: 'sand-cat',
    slot: 'pet',
    name: 'Sand cat',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'hedgehog',
    slot: 'pet',
    name: 'Desert hedgehog',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'fennec',
    slot: 'pet',
    name: 'Fennec fox',
    starter: false,
    earn: 'From chests and the Market',
  },
  {
    id: 'camel-calf',
    slot: 'pet',
    name: 'Camel calf',
    starter: false,
    earn: 'From chests and the Market',
  },
  // Rank gear (#176, ADR 0035): only taking the rank gives it. Never sold, never in a chest.
  {
    id: 'ear-cups',
    slot: 'head',
    name: 'Listener’s ear-cups',
    starter: false,
    earn: 'Take the Listener rank in the Signal Tower',
  },
  {
    id: 'brass-key',
    slot: 'hand',
    name: 'Keyer’s brass key',
    starter: false,
    earn: 'Take the Keyer rank in the Signal Tower',
  },
  {
    id: 'operator-coat',
    slot: 'torso',
    name: 'Operator’s coat',
    starter: false,
    earn: 'Take the Operator rank in the Signal Tower',
  },
  {
    id: 'night-lantern',
    slot: 'hand',
    name: 'Night-watch lantern',
    starter: false,
    earn: 'Take the Telegraphist rank in the Signal Tower',
  },
  {
    id: 'house-sash',
    slot: 'torso',
    name: 'Sash of the house',
    starter: false,
    earn: 'Take the Guest rank in the Caravanserai',
  },
  {
    id: 'keffiyeh',
    slot: 'head',
    name: 'Traveler’s keffiyeh',
    starter: false,
    earn: 'Take the Traveler rank in the Caravanserai',
  },
  {
    id: 'signal-cap',
    slot: 'head',
    name: 'Signal master’s cap',
    starter: false,
    earn: 'Take the Signal Master rank in the Signal Tower',
  },
  {
    id: 'ether-cloak',
    slot: 'back',
    name: 'Cloak of the ether',
    starter: false,
    earn: 'Take the Ghost of the Ether rank in the Signal Tower',
  },
  {
    id: 'olive-sprig',
    slot: 'hand',
    name: 'Neighbor’s olive sprig',
    starter: false,
    earn: 'Take the Neighbor rank in the Caravanserai',
  },
  {
    id: 'dallah',
    slot: 'hand',
    name: 'Friend’s coffee pot',
    starter: false,
    earn: 'Take the Friend rank in the Caravanserai',
  },
  {
    id: 'tatreez-vest',
    slot: 'torso',
    name: 'Local’s tatreez vest',
    starter: false,
    earn: 'Take the Local rank in the Caravanserai',
  },
  {
    id: 'story-cloak',
    slot: 'back',
    name: 'Storyteller’s cloak',
    starter: false,
    earn: 'Take the Storyteller rank in the Caravanserai',
  },
  {
    id: 'beacon-lens',
    slot: 'hand',
    name: 'Beacon lens',
    starter: false,
    earn: 'Pass Forty Winters, the Signal Tower’s finale',
  },
  {
    id: 'guest-book-pen',
    slot: 'hand',
    name: 'Innkeeper’s pen',
    starter: false,
    earn: 'Pass The Stranger at the Gate, the Caravanserai’s finale',
  },
];

/**
 * Dyes for the tunic (#49): color items, bought or found like gear. Without one, the tunic is
 * the guild teal.
 */
export const DYES = [
  { id: 'crimson-dye', label: 'Crimson dye', light: '#E8806A', mid: '#B8402E', dark: '#5E1A12' },
  { id: 'saffron-dye', label: 'Saffron dye', light: '#FFD98A', mid: '#D9A12E', dark: '#7A5210' },
  { id: 'indigo-dye', label: 'Indigo dye', light: '#8A9AE0', mid: '#3E4E9E', dark: '#1A2250' },
  { id: 'forest-dye', label: 'Forest dye', light: '#8AC88A', mid: '#3E7A4A', dark: '#16381E' },
  { id: 'rose-dye', label: 'Rose dye', light: '#F2A8C0', mid: '#C8507A', dark: '#5E1A34' },
  { id: 'charcoal-dye', label: 'Charcoal dye', light: '#8A8A94', mid: '#3E3E48', dark: '#141418' },
] as const;
export type DyeId = (typeof DYES)[number]['id'];

const ids = <T extends readonly { id: string }[]>(list: T) =>
  list.map((o) => o.id) as [T[number]['id'], ...T[number]['id'][]];

/** The look saved in `profiles.avatar`. Unknown or missing fields fall back to the default. */
export const lookSchema = z.object({
  build: z.catch(z.enum(ids(BUILDS)), 'average'),
  skin: z.catch(z.enum(ids(SKINS)), 'sand'),
  face: z.catch(z.enum(ids(FACES)), 'cheerful'),
  hair: z.catch(z.enum(ids(HAIRS)), 'crop'),
  hairColour: z.catch(z.enum(ids(HAIR_COLOURS)), 'brown'),
  beard: z.catch(z.enum(ids(BEARDS)), 'none'),
  /** A headscarf's cloth, or none. */
  scarf: z.catch(z.optional(z.enum(ids(SCARVES))), undefined),
  /** The tunic's dye, if the player owns one (#49). */
  dye: z.catch(z.optional(z.enum(ids(DYES))), undefined),
  gear: z.catch(
    z.object(
      Object.fromEntries(
        SLOTS.map((s) => [s.id, z.catch(z.optional(z.string()), undefined)]),
      ) as Record<SlotId, z.ZodMiniCatch<z.ZodMiniOptional<z.ZodMiniString>>>,
    ),
    {},
  ),
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

/** A look's identity, whatever order its keys were written in: for "has it changed?". */
export function lookKey(look: Look): string {
  const gear = Object.entries(look.gear)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(
    Object.entries({ ...look, gear })
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

/** Gear the player may wear: starters, and what they own (ADR 0033). */
export const canWear = (item: GearItem, owned: ReadonlySet<string>) =>
  item.starter || owned.has(item.id);

/**
 * Reads a stored look; anything unknown becomes the default, and gear the player may not wear
 * (not a starter, not owned) is taken off.
 */
export function parseLook(raw: unknown, owned: ReadonlySet<string> = new Set()): Look {
  // A look is someone's own input: an array or a malformed one is the default, never a throw
  // that would break a friend's whole list (review, 2026-11-19).
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length === 0) {
    return DEFAULT_LOOK;
  }
  const parsed = lookSchema.safeParse(raw);
  if (!parsed.success) return DEFAULT_LOOK;
  const look = parsed.data;
  const gear: Look['gear'] = {};
  for (const [slot, item] of Object.entries(look.gear) as [SlotId, string | undefined][]) {
    const found = GEAR.find((g) => g.id === item);
    if (found && found.slot === slot && canWear(found, owned)) gear[slot] = item;
  }
  const { dye, ...rest } = look;
  return dye && owned.has(dye) ? { ...rest, gear, dye } : { ...rest, gear };
}

/**
 * Reads someone else's look: a friend's, for their card and their house (fellowship-build.md
 * §1 trap 3). It is another person's input, so it goes through the same schema as your own,
 * and gear and dye are kept only if they exist in the catalog, in the right slot. Ownership
 * isn't checked: what a friend may wear is theirs to know.
 */
export function parseOthersLook(raw: unknown): Look {
  const everything = new Set<string>([...GEAR.map((g) => g.id), ...DYES.map((d) => d.id)]);
  return parseLook(raw, everything);
}
