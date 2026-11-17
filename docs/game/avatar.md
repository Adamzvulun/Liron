# Avatar: the paper doll

The player's character (#28) and the wardrobe in Your House (#29). Art direction: [ADR 0006](../decisions/0006-art-direction.md) (paper-doll layers; amendment 3, painted rendering). Adam approved the concept on 2026-11-03 ("looks good for now, we can add more stuff later").

## Where the code lives
- [`src/core/avatar/looks.ts`](../../src/core/avatar/looks.ts): every option and gear item, as data. **Add options and items here.**
- [`src/core/avatar/paint.ts`](../../src/core/avatar/paint.ts): paints a look as SVG markup in a 200×320 box (feet on y = 300). New items need art here, and a test fails if an item has none.
- [`src/core/avatar/Avatar.tsx`](../../src/core/avatar/Avatar.tsx): the component. `view="full"` gives the whole figure (city, Your House); `view="portrait"` gives head and shoulders (HUD).
- [`src/core/avatar/Wardrobe.tsx`](../../src/core/avatar/Wardrobe.tsx): the customizer in Your House.
- **In the city:** the painter only paints the ground shadow, and `City.tsx` places the figure at `AVATAR_SPOT` (`layout.ts`). The painter still draws the 60 random numbers the old figure used, so the scene after it stays exactly as approved.

## Layers, back to front
Back gear, back hair, legs, feet, torso, satchel or cloak front, hand gear, arms and hands, ears and head, face, beard, front hair or headscarf, head gear, then the companion. A headscarf also hides the long hair's back layer.

## Options (v0)
| Part | Choices |
|---|---|
| Build | slim, average, broad |
| Skin | porcelain, sand, olive, bronze, umber, ebony |
| Face | cheerful, determined, calm, bold |
| Hair | crop, swept, curls, long, bun, shaved |
| Hair color | black, brown, auburn, blond, gray (stored as `grey`) |
| Beard | none, stubble, full |
| Headscarf (2026-11-11) | none, sand, rose, olive, indigo, black, white |

## Gear
**Slots:** head, torso, legs, feet, hand and back, and (2026-11-11) a companion (ADR 0006). An empty slot shows the plain clothes underneath: a linen shirt, trousers and shoes.

| Item | Slot | How you get it |
|---|---|---|
| Traveler's tunic | torso | starter |
| Desert wrap | head | starter |
| Courier satchel | back | starter |
| Walking staff | hand | starter |
| Signaler's headset | head | reach level 5 in the Signal Tower |
| Merchant cloak | back | keep a 7-day streak |
| Copper-toe boots | feet | finish 10 daily contracts |
| Rider's breeches | legs | pass a first-chapter trial in any guild |

**The Market's wares (#49).** No milestone gives these: they come out of chests and are sold in the Market. Prices by rarity: common 60 gold, rare 180, epic 450 (`content/core/items.json`). Adam may rename them.

| Slot | Common | Rare | Epic |
|---|---|---|---|
| Head | Red tarboosh, Straw sun hat, Embroidered kufi | Scholar's turban | |
| Torso | Embroidered vest (over the shirt), Woven shawl | Scholar's robe | Guildmaster's coat |
| Legs | Sirwal trousers | Indigo silks | Gold-stitched sirwal |
| Feet | Leather sandals | Riding boots | Gilded slippers |
| Hand | Signal flags, Map scroll | Brass signal lamp | Falconer's glove (with the falcon) |
| Back | Bedroll, Water skin | Oud | Guild banner |

The kufi, shawl, gold-stitched sirwal, gilded slippers, falconer's glove and water skin came on 2026-11-11 (migration `20261206000000_more_wares.sql`), one more for each slot.

**Companions (2026-11-11):** a pet that sits at your feet, on the viewer's right, inside the avatar's box (so the city and Your House show it; the HUD portrait doesn't). They're gear in the `pet` slot, sold and found like the wares: sand cat and desert hedgehog (common), fennec fox (rare), camel calf (epic). Migration `20261207000000_companions.sql` adds the slot to the `items` check.

**Rank gear (#176, ADR 0035):** six pieces only a rank gives, never sold or found in a chest: Listener's ear-cups, Keyer's brass key, Operator's coat, Night-watch lantern, Sash of the house and Traveler's keffiyeh. See [ranks and achievements](ranks-and-achievements.md#4-rank-gear).

**Tunic dyes (#49):** crimson, saffron, indigo, forest, and (2026-11-11) rose and charcoal, 60 gold each. They're color items, not gear: an owned dye recolors the traveler's tunic, picked under "Tunic dye" in the wardrobe. Without one the tunic stays teal.

**The locked items are earned (#48, ADR 0033).** The database gives each one when its milestone is met: the headset at level 5 in the Signal Tower, the cloak on a 7-day streak, the boots after 10 daily contracts, the breeches when a first-chapter trial is passed. Chests can also give them, and the Market sells them. Adam may rename them.

## Saved data
- The look is stored in `profiles.avatar` (jsonb). There's no migration: the column has been there since the E2 schema, and players can only update their own row.
- The shape is `{ build, skin, face, hair, hairColour, beard, scarf?, dye?, gear: { head?, torso?, legs?, feet?, hand?, back? } }`. A new player has `{}`, which reads as the default traveler: average build, sand skin, cheerful face, brown crop, tunic and satchel.
- **Reading is forgiving.** An unknown value falls back to its default. Gear that's locked or in the wrong slot is taken off, so a hand-edited row can't wear locked items.
- **Unlocks live in the database** (`owned_items`), not in the look. Reading the look takes off gear and a dye the player doesn't own.

## Ideas for later (Adam: "we can add more stuff later")
~~The companion pet~~ (built 2026-11-11: see Companions above; more pets can follow), and still more items per slot (six came on 2026-11-11, one per slot, with two dyes: see the Market's wares above). ~~A headscarf as a look option~~ **built (2026-11-11):** a "Headscarf" choice in the wardrobe, open to everyone from the start like hair and beard: none, or a cloth in sand, rose, olive, indigo, black or white (`SCARVES` in `looks.ts`, `look.scarf`). It covers the hair and ears and falls to the shoulders, with a small pin; head gear is worn over it.
