# The home: a room you walk in, decorate and invite friends into

**Status:** planned (Phase 7, v1.4). Adam asked for it on 2026-11-22: "an actual home that you can design and walk and interact in. That'll be better also for the visit feature that's already in." Research: [walkable-home.md](../research/walkable-home.md). Decision: [ADR 0055](../decisions/0055-a-walkable-home-drawn-in-the-page.md) (proposed).

## 1. What changes, in one paragraph

Today Your House is a painted picture with panels stacked over it: the wardrobe, the ledger, the trophy wall and the Fellowship. Instead, it becomes a room your avatar stands in. You tap the floor and walk there. You tap the cupboard and the wardrobe opens. You tap the shelf and your trophies open, and the desk opens your ledger. The furniture is yours to move, swap and add to with pieces from the Market and from chests. A friend who visits walks into *your* room as themselves, sees it as you arranged it, and finds you standing in it.

## 2. Who it's for, and why

- **For the player:**
  - a place that is theirs;
  - a reason to spend gold that isn't clothing;
  - the house's four panels found where they belong in the room.
- **For visits:** today a friend's house is a card: their avatar, ranks and achievements in a column. A room says far more about a friend, and gives the visit something to do.
- **Not for:** building houses, more rooms, or live chat. Those are later phases or never (§9).

## 3. The room

- **The view.** It keeps today's painting: one vanishing point, low and warm, lit by a lantern ([ADR 0006](../decisions/0006-art-direction.md)). The back wall, the window onto the square and the side walls stay fixed. Everything that stands on the floor becomes a separate piece.
- **The floor grid.** The floor is **12 cells across and 5 deep**. The cells are drawn in perspective from the existing vanishing point (`floorAt` in `paintHouse.ts`), so they shrink toward the back wall.
  - A cell is walkable, holds a piece, or is the door.
  - The door is at the front, at the bottom edge. You come in through it.
- **The back wall** has **6 wall slots**, three on each side of the window: pictures, the trophy shelf, a clock, a banner.
  - A wall piece hangs in 1 to 3 neighboring slots on one side (the shelf takes 3).
  - You use what hangs there from the first free cell below it, walking out from the wall: the lantern hangs over the bed, so you reach it from the foot of the bed.
- **Depth.**
  - Pieces and avatars are drawn back to front, by the row they stand on.
  - An avatar in row 4 is drawn behind a cupboard in row 5.
  - An avatar is scaled by its row, at 70% at the back wall and 100% at the front.
- **The starter room.** Every player starts with the pieces the house already has: the bed, the cupboard, the chest, the lantern, the rug, the shelf and the picture over the bed. They are arranged as in today's painting, so the house looks the same the first time it opens. Two new pieces join them, in the same style: a **writing desk** under the shelf (the ledger) and a **letterbox** by the window (the fellowship). See [the concept renders](../design/home-v0/README.md).
- **How a piece moves.** Each piece is painted once, where it stands in the starter room. Moved, it is scaled toward the vanishing point by its new depth and set down on its new cells (`projection.ts`). It shows its side toward the middle of the room, and turns itself when moved across the middle.

## 4. Walking

- **Tap or click the floor:** the avatar walks there along the shortest path around the pieces (A* on the grid, written by us, a few dozen lines).
- **Tap a piece:** the avatar walks to the cell in front of it and the piece does its thing (§5).
- **Arrow keys or WASD:** one cell per press. Enter or Space uses the piece you face.
- **Speed and motion:** about 4 cells a second. The walk animates `transform` only. Under `prefers-reduced-motion` the avatar moves straight to the cell, with no stepping.
- **On a phone:** the room pans like the square (`useStage`) and follows the avatar.
- **The companion** (your pet) follows one cell behind.

## 5. What the pieces do

| Piece | In your room | In a friend's room |
|---|---|---|
| Cupboard | Opens the wardrobe | Says it is theirs ("Their clothes. No peeking.") |
| Shelf (wall) | Opens your trophy wall | Shows their ranks and achievements (their card) |
| Desk, or the book on it | Opens your ledger | Nothing (the ledger is private) |
| Door | Back to the square | Back to your own house |
| Letterbox by the door | Opens the Fellowship: friends, gifts, codes | Nothing |
| Chair, bench, bed | Your avatar sits there (lying on the bed is for later, #447) | Your avatar sits there |
| Lantern, lamp | Turns its light on and off | The same, for you only |
| Anything else | A one-line description | The same |

- **A panel opens over the room** as a dialog, with its focus kept inside and given back (`useDialogFocus`). Closing it leaves you standing by the piece.
- **Today's addresses still work.** `/house` opens the room. A link to the wardrobe opens the room with the wardrobe open.
- **A plain list.** "In this room" lists every piece that does something, as buttons. It is for the keyboard, for screen readers, and for anyone who'd rather not walk. Using an entry walks there and opens it, so the room never has to be walked to be used.

## 6. Decorating

- **Decorate** (a button in the room, yours only) shows the grid and a tray of the pieces you own but haven't placed.
- **To place a piece,** tap it in the tray (or in the room), then tap a cell. Dragging works too, but is never needed ([XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)). On a keyboard, the arrows move the held piece and Enter sets it down.
- **Cells light green or red** under the piece as it moves, for the cells it would cover.
- **A piece faces the middle of the room** and turns itself as it crosses it. A Flip button, and four facings, would need more drawings of every piece, so they wait.
- **Rules,** checked in the browser as you place and again by the database when you save:
  - A piece covers its footprint, 1×1 to 3×4 cells (a rug up to 6×3), and every cell must be free floor.
  - **Every piece that does something must stay reachable from the door,** and so must the door itself. A placement that would block the way is refused with a reason ("That would block the way to the cupboard.").
  - At most **20 floor pieces** and **6 wall pieces**. Rugs lie under everything and don't block, but they count. The wallpaper and the floor are styles, not pieces, and don't count.
  - The cupboard, the shelf, the desk and the letterbox can be moved but not stored, so the four panels always have a home.
- **Done** saves. **Cancel** puts everything back as it was. Nothing is saved piece by piece.

## 7. Furniture in the economy

- **Furniture is a new kind of item** in `content/core/items.json`: `kind: "furniture"`, with `footprint`, `place` (`floor`, `wall` or `rug`) and what it does (`does`: `sit`, `light`, `look`, or one of the four panels).
- **Bought and won the same way as gear** ([ADR 0033](../decisions/0033-inventory-chests-and-market.md)):
  - The Market's daily stock gains one furniture slot.
  - Chests can drop a piece you don't own.
  - Prices follow gear: common 60, rare 180, epic 450.
  - Every payment is the database's ([ADR 0029](../decisions/0029-database-is-the-only-writer-of-rewards.md)).
- **The first set,** painted in the house's style:
  - the 7 starter pieces;
  - 4 for the panels (the cupboard, the shelf, a desk and a letterbox);
  - about 16 more to buy or find: chairs, a bench, a table, plants, a bookcase, a clock, two pictures, a banner per guild, a stove, a cushion, a second rug, a window seat;
  - 4 wallpapers and 4 floors.
  - *Painted in 7.4 ([#439](https://github.com/Adamzvulun/Liron/issues/439)):* a chair, a bench, a table, a plant, a bookcase, a cushion, a clock and a desert picture, with all 4 wallpapers (plaster, sea-wash, rose stripe, zellige) and 4 floors (planks, terracotta, flagstone, dark oak). The other pieces and the guild banners follow in v1.4.x.
- *Built in 7.8, first part ([#443](https://github.com/Adamzvulun/Liron/issues/443)):* the 8 painted pieces are items (`kind: "furniture"` in `items.json`; their shape stays in `home.json` and the `home_pieces` table, so it is written once). Common 60: the chair, the cushion and the plant. Rare 180: the bench, the table, the clock and the desert picture. Epic 450: the bookcase. The Market sets out one a day as a fifth ware, shown in a small picture of the room, and a chest's item roll can give one. *Second part:* 4 more pieces (common: the harbor picture; rare: the stove and the kilim; epic: the window seat) and a banner for each guild, the Signalers' (given at Listener) and the Crossing's (given at Guest), never sold. *Third part:* the wallpapers and floors are items of kind `style` (`wallpaper-<style>`, `floor-<style>`; names in `home.json` as `home-style`), sold in the Market's furniture slot and found in chests: common 60 the sea-wash wallpaper and the terracotta floor, rare 180 the rose-stripe wallpaper, the flagstone and the dark oak floors, epic 450 the zellige tiles. Decorate's Wallpaper and Floor pickers list the plain room's and the ones you own; the database saves only those.
- **Trophies:** a rank won can be hung as a guild banner. It is a wall piece, given by the rank like rank gear, and never sold.

## 8. Visiting

- **A friend's house is still `/house/visit/<id>`,** and still only for friends ("This door is closed." for anyone else).
- **You walk in through their door as yourself.** You see their room as they arranged it, and them standing by the window: their saved look, standing still.
- **What you can do:** walk, sit, light their lamps for yourself, look at their trophy shelf. You can't move anything or open their cupboard, ledger or letters.
- **What a visit sends:** nothing yet. "Dana stopped by" in the party feed is a later slice (§9). It needs its own privacy line in FRIENDS.md.
- **What the database gives a friend:**
  - the room layout: which pieces, where, which way they face, the wallpaper and the floor;
  - the card it already gives.
  - Nothing about what they own but haven't placed.
- *Built in 7.9 ([#444](https://github.com/Adamzvulun/Liron/issues/444)):* `FriendHouse` draws the friend's room from `home_of` (the starter room if they never decorated) with the same `Room` as your own, given a `host`: they stand still on the free cell nearest the window (`byTheWindow`), which you can't walk through; tapping them says they're glad you came by. The list "In this room" says "see their trophies" for the shelf, which opens their card as a panel; the cupboard, desk and letterbox only "look", with a line written for a visitor (`visit` in `home.json`, also on the bed, the bookcase and the banners, whose lines say "your"). No Decorate button, nothing saved. FRIENDS.md says what a friend sees.

## 9. Later, in order, not cut

1. **"Stopped by" in the party feed,** and a guestbook of one line per visit, friends only.
2. **Visiting together, live.** Both avatars walk in the same room, in real time, over Supabase Realtime presence, which the wire already uses. It waits on the same Realtime setting as the wire ([walkable-home.md §4](../research/walkable-home.md#4-visiting-together-live-later)).
3. **Four facings** for pieces that need them.
4. **A second room** (a study or a roof), bought with gems.
5. **A coziness rating** that only ever rises, never punishing an empty room.

## 10. Requirements (EARS)

- **R1** When the player opens Your House, the room shall show their saved layout, or the starter layout if none is saved, with their avatar standing inside the door.
- **R2** When the player taps a walkable cell, the avatar shall walk the shortest path to it around the pieces. If none exists, it shall not move, and a line shall say "Can't get there."
- **R3** When the player taps a piece that does something, the avatar shall walk to the cell in front of it and then do it (§5).
- **R4** The room shall be fully usable without a pointer: arrow keys walk, Enter uses, and the list "In this room" opens any piece.
- **R5** Where `prefers-reduced-motion: reduce` is set, the avatar shall move without stepping or easing.
- **R6** When the player places a piece, the room shall refuse a placement that overlaps, leaves the floor, goes over the caps, or cuts the door off from a piece that does something, and say why.
- **R7** When the player presses Done, the layout shall be saved through one database call that checks ownership, bounds, overlaps, caps and the path again, and keeps nothing if any check fails.
- **R8** When a friend visits, the room shall show the owner's layout and their avatar, let the visitor walk and sit, and give no way to change anything.
- **R9** When someone who isn't a friend opens a visit address, the database shall return nothing, and the page shall say "This door is closed."
- **R10** On a touch screen, the room's painting and each piece shall be drawn as pictures, with no live filters, and the phone filter test shall pass.
- **R11** The house's code shall add no engine or library. The house chunk shall stay within 60 kB gzipped more than today's, and the startup budget shall not change.

## 11. Acceptance, in the browser

- **A new player:**
  - **Given** a new account, **when** it opens Your House, **then** the room looks as today's painting does, with the avatar inside the door and four things that open something.
  - **Given** that room, **when** the player taps the cupboard, **then** the avatar walks to it and the wardrobe opens. **When** it closes, focus is back on the room.
- **Decorating:**
  - **Given** a chair bought at the Market, **when** the player places it and presses Done, **then** it is there after a reload, and on another device.
  - **Given** a layout where one more piece would wall off the shelf, **when** the player tries to set it there, **then** it is refused with the reason, and Done stays possible.
- **Visiting and safety:**
  - **Given** two friends, **when** one visits, **then** they walk in as themselves, see the other's layout, and find no Decorate button and nothing that changes it.
  - **Given** a stranger, **when** they open a visit address, **then** "This door is closed", and the database test shows they read no layout.
- **Phones and speed:** on a phone, the room pans, walking by tapping works, no live filter is drawn, and the frame budget holds while walking.

## 12. What could go wrong (pre-mortem)

- **It's slow on a phone.** The room has more moving parts than the square, and the square once crashed an iPhone.
  - *Guard:* pictures on touch screens, `transform`-only motion, and the frame and filter tests extended to the room. The engine is not the fix: it costs 178 kB.
- **The furniture art takes longer than the code.** The Market's 26 wares were E10's biggest art job.
  - *Guard:* ship the starter set and 8 pieces first (7.4), then more in v1.4.x.
- **Walking to the cupboard is slower than a panel was.**
  - *Guard:* tapping a piece opens it as the walk starts, if the walk is more than 2 seconds. The list opens anything at once.
- **Players wall themselves in.**
  - *Guard:* the path rule, checked twice (R6, R7).
- **A friend's room leaks something.**
  - *Guard:* the database gives the layout only through a friends-only function, with the same three-player test as the cards (ADR 0042).
