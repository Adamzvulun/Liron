# Research: a home you can walk in and decorate (2026-11-22)

For [the-home.md](../game/the-home.md) and [ADR 0055](../decisions/0055-a-walkable-home-drawn-in-the-page.md). Adam asked for "an actual home that you can design and walk and interact in", and said it would be better for visits too.

## 1. How decorated rooms work in other games

Source: Blake Crosley, ["Pixel-Art Rooms: Furniture Grids, Caps and Scoring"](https://blakecrosley.com/blog/pixel-art-rooms-people-decorate) (2026-10-05). It compares Pokémon Emerald's secret bases, Animal Crossing, Stardew Valley, Habbo, FFXIV and Club Penguin. Where it relies on a fan wiki, that is noted below.

- **A grid, and the grid is the walking grid.**
  - Emerald places decorations on the 16-pixel cells the player walks on. Each cell is solid, walkable, behind, wall, or a surface that holds small items. This comes from the author's own reading of the decompiled source.
  - Stardew shows a green or red square per tile while placing (the Stardew wiki, cited by the article).
  - New Horizons alone allows half-tile pushes (Nookipedia, a fan wiki).
- **A placement can block the way.** Emerald checks each cell but never whether a path survives, so a player can wall themselves off. The article calls a path check "the brief's addition". We take that lesson.
- **Caps are small, and they double as a performance budget.**
  - Emerald allows 16 placed pieces per base (12 in the bedroom).
  - Animal Crossing allows 24 (Wild World) to 150 (New Horizons) per room (Nookipedia).
  - FFXIV allows 150 to 600 and says "up to 400 furnishings can be displayed on-screen at once" (the publisher's patch notes).
  - The author suggests under one piece per three floor cells for a 2D room. That is his opinion, not data.
- **Wall and floor are separate.** Posters go on walls. Wallpaper and flooring cover the whole room and don't count as pieces (Stardew, Habbo).
- **Visitors look and don't touch.**
  - In Animal Crossing, visitors may use furniture but not change the room (Nookipedia).
  - In Habbo, visitors can't move furniture without rights (Habbo's help center).
- **Scores:**
  - Animal Crossing's Happy Home Academy rates rooms weekly. Its numbers come from a fan reconstruction.
  - The article's rule is "never punish absence": a room isn't marked down for being empty.

## 2. Moving without a mouse

- [Xbox Accessibility Guideline 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107):
  - every UI works with single, non-simultaneous key presses, and with the keyboard alone;
  - every drag or path gesture has a tap or click alternative.
- [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/?p=3102): click-and-drag should only ever be an alternative, never the only way.
- [IGDA GASIG](https://igda-gasig.org/get-involved/sig-initiatives/resources-for-game-developers/sig-guidelines/): keyboard navigation of every control, with visual and spoken feedback.

For us, this means:

- walking is tap-to-go, with arrow keys as a second way;
- placing a piece is tap the piece, then tap the cell (dragging is only an extra);
- everything in the room can be reached from a plain list of buttons.

## 3. Drawing it: an engine, or the page we already have

- **PixiJS v8, measured here (2026-11-22):** a bare stage with one sprite bundles to **605 kB minified, 178 kB gzipped** (esbuild, `pixi.js@8`, `Application` + `Container` + `Sprite` + `Assets`). Its own docs say subpath imports and `manageImports: false` can cut that ([v8 migration guide](https://pixijs.com/8.x/guides/migrations/v8)). We didn't measure a trimmed build.
- **For scale:**
  - The whole city painter is 17 kB of code ([ADR 0025](../decisions/0025-city-painted-in-the-browser.md)).
  - The startup budget is 199 kB gzipped (`tests/e2e/load-budget.spec.ts`).
  - The house would load lazily, so an engine would land on a phone the first time the house opens.
- **What we already know about phones:** iPhone Safari crashed on the square's live filtered SVG. Drawing each part once into an image fixed it (`src/core/city/square.ts`). A room of about 25 pieces drawn the same way fits that rule.
- **A room is small.** About 60 cells and about 25 pieces is far below the scale an engine exists for. FFXIV's cap of 400 on screen is a 3D game.
- [ADR 0006](../decisions/0006-art-direction.md) said: "Move to PixiJS only if the lobby becomes a walkable scene." The room is a walkable scene. But measured, the engine costs a phone 10 times the painter, and it buys nothing a page of SVG can't already do at this size. ADR 0055 records the choice.

## 4. Visiting together, live (later)

Supabase Realtime, which the wire already uses ([ADR 0046](../decisions/0046-the-wire.md)), allows on the free plan:

- 200 concurrent connections;
- 100 messages a second;
- 2 million messages a month.

Free plans are never charged for going over; a project that keeps exceeding them may be cut off ([limits](https://supabase.com/docs/guides/realtime/limits), [pricing](https://supabase.com/docs/guides/realtime/pricing)). Two friends walking in one room send a few messages a second, far inside that. It waits on the same Realtime setting as the wire (VERSIONS 2.4), so it's a later phase, not the first release.
