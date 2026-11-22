# 0055 — A walkable home, drawn in the page, saved as one layout

- **Status:** Proposed (Adam asked for the home on 2026-11-22 and left the choices to Claude: "Do whatever you think I would do"). It becomes Accepted when Adam approves the room's look (task 7.1).
- **Date:** 2026-11-22
- **Spec:** [the-home.md](../game/the-home.md). **Research:** [walkable-home.md](../research/walkable-home.md).
- **Amends:** [0006](0006-art-direction.md) ("Move to PixiJS only if the lobby becomes a walkable scene"). **Builds on:** [0025](0025-city-painted-in-the-browser.md), [0029](0029-database-is-the-only-writer-of-rewards.md), [0033](0033-inventory-chests-and-market.md), [0042](0042-the-fellowship-first-slice.md).

## Context

Your House is a still painting with four panels over it. Adam wants a home you can walk in, arrange and interact with, and wants visits to mean more. Three things need deciding:

- how the room is drawn and moved in;
- how its arrangement is stored and shown to friends;
- how furniture is owned.

## Options considered

**Drawing.**

1. **PixiJS (WebGL), as ADR 0006 foresaw.** Measured on 2026-11-22: 178 kB gzipped for a bare stage, about 10 times the city's painter. The painted SVG would have to become textures, and keyboard and screen-reader access would have to be built again beside the canvas.
2. **A canvas drawn by hand.** No dependency, but the same access problem, and a phone froze for 2.4 s drawing the square into a canvas (ADR 0025 amendment).
3. **The page as it is: painted SVG pieces as HTML layers.** Pieces are sorted by row, moved by `transform`, and drawn as pictures on touch screens. **Chosen.** At about 25 pieces and 60 cells, this is the scale the square already handles. Every piece can be a real button.

**Perspective.**

1. **Isometric tiles** (Habbo-like). They fit placement well, but they would be a second art style beside the city.
2. **The room's existing one-point view, with a perspective floor grid.** **Chosen.** It keeps the house painting and ADR 0006's low eye level.

**Storing the layout.**

1. **A row per placed piece.** Fine for queries, but saving means many rows changing together.
2. **One `jsonb` layout per player, saved whole by one function that checks everything.** **Chosen.** The arrangement is one thing that is saved and shown whole, the same shape as `look`.

## Decision

- **No engine, no new library.** The room is HTML layers holding painted SVG pieces. Pieces are drawn by `paintKit.ts` in the house's style, one function per piece.
  - Depth is the order of the layers, by grid row.
  - Walking animates `transform` only.
  - On touch screens every piece is a picture (the `pictureOf` pattern from `square.ts`).
  - The ADR 0025 rules apply to the room: no blend modes, and no CSS filters on anything in the stage.
- **The grid** is 12 × 5 floor cells in the room's perspective, plus 6 back-wall slots. Paths come from a small A* written in `src/core/home/`, with unit tests.
- **Storage.**
  - `homes(user_id primary key, layout jsonb, updated_at)`, readable by its owner, written only by `save_home(layout)`.
  - `save_home` checks, and refuses the whole layout if any check fails:
    - every piece is owned (`owned_items`, or a starter piece);
    - it is in bounds and nothing overlaps;
    - it is within the caps;
    - the door still reaches every piece that does something.
  - The same rules live in one TypeScript module for the browser, with a test that both sides refuse the same layouts.
- **Friends read a layout** only through `home_of(friend)`, which checks `are_friends` the way `card_of` does. It returns placed pieces only, never what is owned but stored.
- **Furniture is an item** (`kind: "furniture"`) in `content/core/items.json`, owned in `owned_items`, sold by `market_stock` (one daily slot) and dropped by chests, all through migrations (ADR 0033). The starter pieces are given to everyone and need no row.
- **No live presence in this release.** Visiting together, live, is a later phase on Realtime presence (the-home.md §9).

## Consequences

- The house chunk grows by the pieces' painting code. R11 holds it to 60 kB gzipped more, measured in `load-budget.spec.ts`.
- If the room ever needs hundreds of pieces or real-time crowds, this ADR should be revisited. An engine might then be worth its 178 kB.
- A visit now shows more about a friend (their arrangement). FRIENDS.md says so before v1.4 ships.
- Changing a piece's footprint later means a migration, as with any item.
