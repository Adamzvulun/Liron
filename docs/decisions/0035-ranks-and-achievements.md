# 0035 — Ranks are read from progress and recorded as events; achievements are checked by the database

- **Status:** Accepted by Claude on 2026-11-09 night, while Adam slept, under his instruction to make the calls he'd make. Open to his review ([design](../game/ranks-and-achievements.md)).
- **Date:** 2026-11-09
- **Builds on:** [0029](0029-database-is-the-only-writer-of-rewards.md) (only the database writes rewards), [0032](0032-subject-events-and-daily-contracts.md) (subject events), [0033](0033-inventory-chests-and-market.md) (milestone gear), [0024](0024-glicko2-skill-ratings.md) (ratings)

## Context
E13 (#151) adds guild ranks with earned-only gear, trials that gate them, and achievements that pay gems and give titles. Today each hall works out its rank in the browser from the subject's saved state (`rankOf` in the Caravanserai and the Tower), and nothing records it.

A rank's conditions live in subject state that only the subject understands: Koch characters, the slate's letters, word chapters. Trials already work this way. The browser decides a trial is passed, and the save sends the event `trial-<n>`. From that event the database gives the trial's chest and its milestone gear.

## Options considered
1. **Compute ranks in the database from the saved state.** Rejected: the database would have to understand every subject's state shape. ADR 0019 keeps subjects out of the core.
2. **Compute ranks in the browser and save them in the state only.** Rejected: rank gear is a reward, and only the database writes rewards (ADR 0029).
3. **Compute ranks in the browser and send `rank-<id>` as a subject event, once, when the rank is taken; the database gives rank gear for the event.** Chosen. This is the same trust model as trials. Each rank's event kind is registered by a migration with a daily cap of 1, so an event can't be repeated for gain, and the gear is owned once.

For achievements:
1. **Browser-checked.** Rejected: they pay gems.
2. **Database-checked from what it already records** (streak, contracts, trials, chests, levels, minutes, subject events). Chosen. The catalogue is data (`content/core/achievements.json`, copied into an `achievements` table by a migration, with a schema test that keeps the two equal, as for items and chests). A `grant_achievements(uid)` runs where `grant_milestones` runs, and pays each achievement's gems once.

## Decision
- **Ranks** are data per subject (`content/<subject>/ranks.json`): id, names, conditions (as text for the checklist), the gate trial, and gear. The rules that check the conditions stay in the subject's code.
- When a save finds a new rank, it sends `rank-<id>` (e.g. `rank-listener`), once per save until it's recorded. Each kind is registered for its subject with a daily cap of 1.
- **Rank gear** is a new milestone kind: `{ "kind": "rank", "subject": "morse", "rank": "listener" }`. It is met when that subject event exists. It has no price and is never stocked in the Market or dropped by chests. `market_stock` and the chest roll exclude items whose milestone kind is `rank`.
- **Achievements:** a new table `achievements(id, condition jsonb, gems, title)` and `player_achievements(user_id, achievement_id, earned_at)`. Both are readable by their owner and written only by `grant_achievements`. The chosen title is `profiles.title`, which may only name a title you've earned (a check in its update function).

## Consequences
- **Amended 2026-11-15 (Adam):** the house's ranks after Traveler (Neighbor, Friend, Local, Storyteller) are earned at the inn's table with the regulars (E17) instead of waiting for M5 partners; conditions in `docs/game/ranks-and-achievements.md`.
- A player who edits their own saved state could claim a rank, as they could claim a trial today. The gain is cosmetic gear and is limited to themselves. This is the trade-off ADR 0032 already accepted for subject events.
- Ranks that need features not built yet (QSO, partners) stay unreachable and are shown as "comes later", never hidden.
- Each new rank or achievement condition kind needs a migration; adding a row of an existing kind doesn't (beyond copying the data).
