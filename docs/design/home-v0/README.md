# The home, concept v0 (task 7.1, #436)

Renders of the walkable home, drawn by the code that will draw it (`src/core/home/paintHome.ts`), for Adam to approve ([the-home.md](../../game/the-home.md) §3, [ADR 0055](../../decisions/0055-a-walkable-home-drawn-in-the-page.md)).

| Render | What it shows |
| --- | --- |
| [1-starter.jpg](1-starter.jpg) | The starter room, drawn from its pieces, with the avatar by the door. It is today's painting with two new pieces: the writing desk under the shelf (the ledger) and the letterbox by the window (the fellowship). |
| [2-decorate.jpg](2-decorate.jpg) | Decorate: the 12 × 5 floor grid and the six wall slots show, and the chest is held over the middle of the room, smaller because it is farther back. |
| [3-scale.jpg](3-scale.jpg) | The scale check: the avatar in the back row and in the front row. |
| [4-furnished.jpg](4-furnished.jpg) | Task 7.4: a furnished room with a table, chair, plant, cushion and the clock where the picture was, in sea-wash walls over terracotta tiles. Adam approved 1–3 on 2026-11-22 ("Looks good. Continue painting."). |
| [5-rose-flagstone.jpg](5-rose-flagstone.jpg) | The starter room in rose-striped wallpaper over flagstones. |
| [6-zellige-oak.jpg](6-zellige-oak.jpg) | A tiled zellige dado under a wooden rail, over dark oak. |

`renders.mts` writes the HTML for all three. The JPEGs are 1280 × 720 copies of the 1920 × 1080 screenshots.

## Known limits

- **Pieces are carried, not redrawn.** A moved piece is scaled toward the vanishing point and slid along the floor. Its side faces are as painted, so a piece far from where it was painted looks slightly off. Pieces show their side toward the middle of the room and turn themselves when moved across it.
- **The cupboard is painted against the right wall.** Moved into the room, it would still lean along that wall. It needs a free-standing drawing before Decorate ships (task 7.4).
