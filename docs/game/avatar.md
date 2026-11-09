# Avatar: the paper doll

The player's character (#28) and the wardrobe in Your House (#29). Art direction: [ADR 0006](../decisions/0006-art-direction.md) (paper-doll layers; amendment 3, painted rendering). Adam approved the concept on 2026-11-03 ("looks good for now, we can add more stuff later").

## Where the code lives
- [`src/core/avatar/looks.ts`](../../src/core/avatar/looks.ts): every option and gear item, as data. **Add options and items here.**
- [`src/core/avatar/paint.ts`](../../src/core/avatar/paint.ts): paints a look as SVG markup in a 200×320 box (feet on y = 300). New items need art here, and a test fails if an item has none.
- [`src/core/avatar/Avatar.tsx`](../../src/core/avatar/Avatar.tsx): the component. `view="full"` gives the whole figure (city, Your House); `view="portrait"` gives head and shoulders (HUD).
- [`src/core/avatar/Wardrobe.tsx`](../../src/core/avatar/Wardrobe.tsx): the customiser in Your House.
- **In the city:** the painter only paints the ground shadow, and `City.tsx` places the figure at `AVATAR_SPOT` (`layout.ts`). The painter still draws the 60 random numbers the old figure used, so the scene after it stays exactly as approved.

## Layers, back to front
Back gear, back hair, legs, feet, torso, satchel or cloak front, hand gear, arms and hands, ears and head, face, beard, front hair, head gear.

## Options (v0)
| Part | Choices |
|---|---|
| Build | slim, average, broad |
| Skin | porcelain, sand, olive, bronze, umber, ebony |
| Face | cheerful, determined, calm, bold |
| Hair | crop, swept, curls, long, bun, shaved |
| Hair colour | black, brown, auburn, blond, grey |
| Beard | none, stubble, full |

## Gear
**Slots:** head, torso, legs, feet, hand and back. A companion pet comes later (ADR 0006). An empty slot shows the plain clothes underneath: a linen shirt, trousers and shoes.

| Item | Slot | How you get it |
|---|---|---|
| Traveller's tunic | torso | starter |
| Desert wrap | head | starter |
| Courier satchel | back | starter |
| Walking staff | hand | starter |
| Signaller's headset | head | reach level 5 in the Signal Tower |
| Merchant cloak | back | keep a 7-day streak |
| Copper-toe boots | feet | finish 10 quests |
| Rider's breeches | legs | pass a first-chapter trial in any guild |

**The locked items are earned (#48, ADR 0033).** The database gives each one when its milestone is met: the headset at level 5 in the Signal Tower, the cloak on a 7-day streak, the boots after 10 daily contracts, the breeches when a first-chapter trial is passed. Chests and the Market will also give them. Adam may rename them.

## Saved data
- The look is stored in `profiles.avatar` (jsonb). There's no migration: the column has been there since the E2 schema, and players can only update their own row.
- The shape is `{ build, skin, face, hair, hairColour, beard, gear: { head?, torso?, legs?, feet?, hand?, back? } }`. A new player has `{}`, which reads as the default traveller: average build, sand skin, cheerful face, brown crop, tunic and satchel.
- **Reading is forgiving.** An unknown value falls back to its default. Gear that's locked or in the wrong slot is taken off, so a hand-edited row can't wear locked items.
- **Unlocks live in the database** (`owned_items`), not in the look. Reading the look takes off gear the player doesn't own.

## Ideas for later (Adam: "we can add more stuff later")
More clothing colours, more items per slot, a headscarf as a look option, and the companion pet.
