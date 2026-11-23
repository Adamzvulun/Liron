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
- *Built in 7.10 ([#445](https://github.com/Adamzvulun/Liron/issues/445)), the guide:* Nour's eighth introduction points at Your House once the player owns something for the room ("You have something new for your room. In Your House, tap Decorate and set it wherever you like."). The Guidebook's "Your House" page covers walking, the four pieces, Decorate, the caps (`{floorPieces}` and `{wallPieces}`, read from `home.json`) and visits; the Market and Fellowship pages mention the room. All in `guide-words.md` for Adam's read (#413).
- *Built in 7.9 ([#444](https://github.com/Adamzvulun/Liron/issues/444)):* `FriendHouse` draws the friend's room from `home_of` (the starter room if they never decorated) with the same `Room` as your own, given a `host`: they stand still on the free cell nearest the window (`byTheWindow`), which you can't walk through; tapping them says they're glad you came by. The list "In this room" says "see their trophies" for the shelf, which opens their card as a panel; the cupboard, desk and letterbox only "look", with a line written for a visitor (`visit` in `home.json`, also on the bed, the bookcase and the banners, whose lines say "your"). No Decorate button, nothing saved. FRIENDS.md says what a friend sees.

## 9. Later, in order, not cut

1. **"Stopped by" in the party feed,** and a guestbook of one line per visit, friends only.
2. **Visiting together, live.** Both avatars walk in the same room, in real time, over Supabase Realtime, which the wire already uses ([walkable-home.md §4](../research/walkable-home.md#4-visiting-together-live-later)). *Built in task 9.1 (#482), §17.*
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

## 13. Notes at the letterbox (task 8.1, #469)

The first of §9's later items: "stopped by" and a guestbook, built as notes.

- **In a friend's room,** the letterbox says "leave a note". It opens the set: five of our own Arabic sentences (the tea is very hot, the house is clean, the weather's nice, see you tonight, okay bye), three Morse sign-offs the Codebook teaches (73, CUL, TNX) and two plain lines. Each Arabic note shows its script, its reading and its meaning, so a note is a little practice too.
- **One a day per friend.** Picking again the same day replaces the note. The letterbox says which note you left today.
- **No free text.** A note is a code from `content/core/home.json`, like the feed's rows (ADR 0043), so nothing anyone writes reaches a friend's screen. `home_note_ids()` in the database keeps the same list, and a test holds them equal. The Arabic notes are tested word for word against `own-sentences.json`, and the Morse ones against the Codebook.
- **Your letterbox** opens the Fellowship as before, with "Notes in your letterbox" at the top: who, which note, and the day.
- **The Notice Board** says "Basma stopped by your room and left a note: …". Only you see that line.
- **Privacy:** only the host and the writer read a note. A note from someone who is no longer a friend is hidden, and notes are deleted after 60 days, like the feed. A visit that leaves no note records nothing. FRIENDS.md says so.
- **Tests:** `supabase/tests/notes.test.ts` (strangers, yourself, outside the set, one a day, who can read, the feed, unfriending, 60 days); `src/core/home/notes.test.ts`; `tests/e2e/fellowship.spec.ts` (leave, replace, remember, read, the feed line).

## 14. Coziness (task 8.2, #470)

§9's coziness rating, which only ever rises.

- **What counts:** each different piece of furniture a room has ever held, and each wallpaper and floor that isn't the room's own. The starter pieces don't count, so a new room is at 0, and moving things around adds nothing.
- **It never falls.** The database keeps the list (`homes.held`). A trigger adds what each save holds, so storing a piece or going back to plaster and planks loses nothing. An empty room is never punished.
- **Its names** are in `content/core/home.json` (`home:coziness`): Just moved in (0), Settling in (1), Lived in (3), Snug (6), Cozy (10), Warm as fresh bread (15). There are 20 things to own, so the top can be reached.
- **Where it shows:** under your room, beside Decorate, with how many more new things the next name needs. After a Done that sets out something new, the line says "Your room is cozier: …", or "a little cozier" between names. A friend's shelf says "Their room: Snug". A friend sees the count's name, never the list. fellowship.md §3 and FRIENDS.md say so.
- **Tests:** `src/core/home/cozy.test.ts`; `supabase/tests/homes.test.ts`, where the database counts every fixture layout as `heldOf` does, the count only grows, and a friend's card carries the count; `tests/e2e/home.spec.ts` and `fellowship.spec.ts`.

## 15. Four facings (task 8.3, #471)

- **What turns:** the chair four ways (facing the room, right, the wall, left) and the window seat two (facing the room or the wall). The rest look the same from any side (the bench, the cushion, the stove) or stand against a wall (the bed, the desk, the bookcase), so they don't turn. Each piece's turns are data: `turns` in `content/core/home.json`.
- **In Decorate:** holding a piece that turns shows **Turn the chair**, and R does the same. The line says which way it now faces ("The chair, facing the wall."). A turned piece keeps its turn as it moves. Facing the room again, it faces the middle as before.
- **In a layout:** `facing` was `left` or `right`, set by where a piece stands, and both mean "facing the room". They keep that meaning, so no saved room changes and nothing is rewritten. The new values are `away`, `to-left` and `to-right` (migration `20270121000000_facings.sql`; `save_home` accepts the five).
- **Painted:** each turn is its own painting in `paintFurniture.ts`. A piece right of the middle is mirrored (projection.ts, moveFloor), so paintHome swaps the two side turns first and the chair still looks the way it was turned. The look was checked on both sides of the room.
- **Known:** someone sitting on a chair turned away is still drawn facing you.
- **Tests:** `decorate.test.ts` (the order, keeping a turn, what turns); `paintHome.test.ts` (four paintings, the mirror swap); the fixture's turned chair, which `save_home` takes (homes.test.ts); `home.spec.ts` (Turn, saved, no Turn for the chest).


## 16. The roof, a second room (task 8.4, #472)

- **What it is:** a flat roof above the house at dusk, opened once for **15 gems**. Two neighbors' walls stand at the back, with a string of little lights between them and the city's rooftops and the Signal Tower beyond a low wall. Low parapets run along both sides. You come up through a hatch at the door's cell, front left. Painted in `paintRoof.ts` on the same grid and projection as the house, so every piece stands and hangs there as it does indoors.
- **Why 15 gems:** gems are scarce. The 24 achievements pay 60 in all, and chests give one now and then. Nothing spent them before. 15 is a real goal that most players reach within a few weeks of play, not a wall.
- **Opening it:** under your room, **The roof…** says what it is, its price and how many gems you have. **Open the roof for 15 gems** is greyed out until you have enough, with how many more you need. Once it's open, **Up to the roof** and **Down to your room** take the stairs. `/house#roof` opens on the roof.
- **Its rules:** the same 12 × 5 grid, caps and wall slots as the house (the slots fall on the two walls). Only furniture goes up: the starter pieces stay in the house, so the roof needs none of the four panels. It keeps its own lime wash and slabs; bought wallpapers and floors are for indoors. **A piece stands in one room at a time:** the tray leaves out what's in the other room, and a save that would put a piece in both is refused ("The chair is up on the roof. Store it there first.").
- **Coziness** counts both rooms together, the roof's own lime and slabs as nothing new.
- **Friends** see your roof once it's open: **Up to their roof** in their house. You stand by the low wall, as you stand by the window indoors.
- **In the database** (migration `20270122000000_roof.sql`): a row of `homes` per room (`room` is `home` or `roof`). `open_roof()` takes the gems and gives the empty roof in one transaction, once. `save_home`, `my_home` and `home_of` take the room (the house by default, so an old tab still works). `home_refusal` checks either room, and save_home takes a per-player lock so two rooms saved at once can't both hold a piece. The roof's shape, starter and price are constants, kept equal to `content/core/home.json` by `homes.test.ts`.
- **Tests:** `layout.test.ts` and `layouts.fixture.ts` (the roof's cases, checked by both the browser and `save_home`); `homes.test.ts` (opening, the price, one room per piece, coziness, friends); `home.spec.ts` (the offer, the stairs, decorating the roof, a friend's roof); the axe suite.
- **Known:** the stairs are buttons, not a painted stair in the room.

## 17. Visiting together, live (task 9.1, #482)

The last of §9's later items, on the wire's Realtime ([ADR 0056](../decisions/0056-visiting-together-live.md), built on [ADR 0046](../decisions/0046-the-wire.md)).

- **What a player sees:** in a friend's house, when the friend is home too, they walk, sit and climb where they really are, instead of standing by the window. A line under the room says "Basma is home.", or "Basma is home, up on the roof." when they're in the other room. At home, a friend who comes by walks in your room, and a line says "Basma is here." (or "Basma is up on your roof."). Tapping a friend makes them wave. Nobody blocks anybody's way, and a friend on your cell stands half a step aside.
- **A friend who isn't home** stands by the window, as before.
- **How:** a private channel per friendship, `visit:<low id>:<high id>`. Only the two friends may join (`may_use_wire` takes the new name, migration `20270123000000_visiting_live.sql`). A guest opens the line to their host. At home, your house opens one to each friend (at most 40), so whoever comes by is seen.
- **What goes over it:** whose house you're in, which room, the cell and the seat. You say it every 5 seconds and on every step to a friend in the same house, and "bye" when you leave. Silence for 16 seconds means they've gone. Nothing is stored, and nothing is said while you're out of a house.
- **What a friend learns:** that you're home, and where you stand, only while they're in a house too. FRIENDS.md says so.
- **Known:** two guests in one house see the host but not each other. Decorating hides everyone but the room.
- **Tests:** `liveLink.test.ts` (what is said and heard, who is in the house, the lines), `fellowship.test.ts` (who may join a `visit:` line), `visiting-live.spec.ts` (two pages over the fake Realtime: walking, the roof, leaving, a host who isn't home).
