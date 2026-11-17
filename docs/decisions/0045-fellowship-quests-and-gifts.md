# 0045 — Fellowship quests and gifts

- **Status:** Accepted (Claude, 2026-11-17, task 3.5, #330; built to [fellowship-build.md](../game/fellowship-build.md) §5, under Adam's instruction to decide as he would)
- **Date:** 2026-11-17
- **Builds on:** [ADR 0029](0029-database-is-the-only-writer-of-rewards.md), [ADR 0032](0032-subject-events-and-daily-contracts.md), [ADR 0033](0033-inventory-chests-and-market.md), [ADR 0042](0042-the-fellowship-first-slice.md)

## Decision

1. **One quest a week, the same for everyone, picked by the week's Monday.** Quests are rows in `fellowship_quests` (migration `20270102000000_fellowship_quests_and_gifts.sql`), like contracts. There are four to begin with:

   | Quest | Target | Gold |
   |---|---|---|
   | Minutes together | 300 | 40 |
   | Hours together | 600 minutes | 60 |
   | Chats at the inn | 10 | 40 |
   | Callsign rushes | 10 | 40 |

   Half are minutes, so a friend on either road can always help.
2. **Progress is counted from rows the database already keeps:** `daily_activity` minutes, or `subject_events` counts, within the week. Each member's own rows count once. Nobody's browser bumps a counter.
3. **"Your Fellowship" is you and your accepted friends.** Friendships are pairs, not groups, so two friends of yours who aren't friends with each other see different totals. That is honest: each player's quest counts the people they chose.
4. **The gold is paid once per player per week** (`fellowship_quest_rewards`, keyed on player and week). It goes only to a player who helped (their part is at least 1), when they press **Collect**. A player whose friends finished without them is asked to lend a hand. A shared win shouldn't pay someone who did nothing, and that also stops a player from collecting from many idle friends.
5. **A gift is one of today's Market gear or colors, bought for a friend** (`give_item`), in one transaction:
   - It checks the friendship and today's stall.
   - It locks the giver's purse, then checks the daily limit, what the friend owns, and the gold.
   - It adds the item for the friend (`source 'gift'`), writes a `gifts` row, and takes the gold.

   Two gifts of the same ware at once give it once: the second hits the owned-items key, and the whole transaction is rolled back, gold included.
6. **What can't be given:**
   - shields (they're for yourself, and capped at two);
   - rank gear and finale gear (never on the stall);
   - more than 3 gifts a day.
7. **The friend learns of a gift in Your House:** "Basma sent you the Red tarboosh · Today. It's in your wardrobe." It is not in the party feed, which holds milestones as codes only (ADR 0043). This differs from fellowship-build.md §5's "write a feed row": a gift is between two people, not news for everyone.

## Consequences

- The quest needs no new event kinds and no browser changes in the subjects.
- The isolation test lists the new tables (`fellowship_quest_rewards` and `gifts` are player tables; `fellowship_quests` is shared) and the five new functions.
- Gold still only moves inside the database (ADR 0029). The app shows the purse the database returns, through `player.purse()`, so a slow answer never overwrites a newer purse.
