# 0033 — Inventory, chests and the Market: owned in the database, rolled on the server

- **Status:** Accepted (E10, #48 and #49). Design approved by Adam on 2026-11-04 ([quests and rewards](../game/quests-and-rewards.md)).
- **Date:** 2026-11-09
- **Builds on:** [0020](0020-fast-levels-and-rewards.md) (gold and gems), [0029](0029-database-is-the-only-writer-of-rewards.md) (only the database writes rewards), [0032](0032-subject-events-and-daily-contracts.md) (contract chest)

## Context
E10 adds chests (#48) from trials, streak days 7, 30 and 100, and the 3-contract day, and a Market (#49) where gold buys gear, colors and the streak shield. Today the avatar's 4 locked items unlock from milestones computed in the browser, and nothing is "owned". `docs/game/avatar.md` already plans that "once E10 lets players earn items, unlocks should live in the database".

A chest whose contents are rolled in the browser can be rerolled by reloading. A purchase made in the browser can be faked. Both break ADR 0029.

## Options considered
1. **Roll and buy in the browser, save the result.** Rejected: rerolls, free items.
2. **Roll when the chest is granted.** Works, but the contents are then fixed before the drop table can change, and it does work for chests nobody opens.
3. **Roll in the database when the chest is opened, seeded by the chest's id.** Chosen: the same chest always gives the same thing, and opening twice pays once.

## Decision
**Ownership**
- New table `owned_items(user_id, item_id, source, acquired_at)`, readable by its owner, written only by database functions.
- New `wallets.streak_shields` (0–2): shields are a count, not an item (ADR 0034).
- The avatar shows an item as unlocked if it's owned **or** its old milestone is met. The milestone items keep working as they do.

**The catalogue is data**
- `content/core/items.json`: every item with its id, slot, kind (`gear`, `color`, `functional`), rarity and price. Prices: common 60, rare 180, epic 450, streak shield 120.
- `content/core/chests.json`: the drop table per chest kind (wooden, brass, jewelled): the gold range, and the chance of a gem, a gear item and a shield.
- Migrations copy both into `items` and `chest_drops`. A test compares the tables with the JSON.

**Chests**
- `chests(id, user_id, kind, source, source_key, granted_at, opened_at, contents)`. `unique (user_id, source, source_key)` makes each source give one chest: `contracts:<day>`, `trial:<subject>:<chapter>`, `streak:<start day>:<7|30|100>`.
- Granted only by database functions: `claim_contracts` (ADR 0032), a trial passing (sent with the session save as an event, then checked), and `check_daily_goal` on streak days 7, 30 and 100.
- `open_chest(id)` rolls from `chest_drops`, using a seed from `md5(chest id)`, writes `contents` and pays: gold and gems into the wallet, a gear item into `owned_items` (one not yet owned; if all are owned, its price in gold instead), a shield into `streak_shields` (if already at 2, gold instead). Opening an opened chest returns the same contents and pays nothing.

**Market**
- `market_today()`: 4 slots seeded by the day (2 gear, 1 color, 1 functional), the same for everyone, from `items`. It marks what the player owns and can afford.
- `buy_item(id)`: refuses an item that isn't in today's stock, one already owned (or a shield at 2) and too little gold. Otherwise it takes the gold and gives the item, in one transaction.

**No real money, no timers.** Gold and gems are only earned. No chest waits hours to open.

## Consequences
- Every reward in E10 is paid by the database. The browser only shows what it's told.
- About 18 more gear items need drawing (3 per slot) before the Market has enough to sell. That's E10's biggest art job.
- The catalogue lives in JSON and in migrations. Changing an item means a new migration; the test keeps them equal.
- The seed comes from the chest id, so the drop table at opening time decides the contents. A chest granted before a table change opens with the new table. That's fine.
