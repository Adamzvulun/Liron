# 0032 — Subject events and daily contracts: picked, checked and paid by the database

- **Status:** Accepted (E10, #46 and #47). Design approved by Adam on 2026-11-04 ([quests and rewards](../game/quests-and-rewards.md)).
- **Date:** 2026-11-09
- **Builds on:** [0019](0019-subject-contract.md) (the subject contract), [0021](0021-streak-and-daily-goal.md) (pay once a day), [0029](0029-database-is-the-only-writer-of-rewards.md) (only the database writes rewards), [0031](0031-one-save-per-session.md) (one save per session)
- **Amends:** 0019 (two additions to the contract: `reportEvent` and the optional `questStatus`)

## Context
E10 adds 3 daily contracts on the Notice Board (#46) and a questline tracker in the HUD (#47). A contract like "pass a Koch run at 90%" or "learn a new letter" needs moments only a subject knows about. Today a subject can only report XP, minutes, reviews and ratings.

ADR 0029 says the browser never writes rewards, and the database pays. ADR 0031 says a session is saved in one call, all or nothing. Contracts have to fit both. They also have to keep ADR 0003's rule: the platform doesn't learn each subject's internals.

## Options considered
1. **The browser decides a contract is done and asks for the gold.** Rejected: breaks ADR 0029. Anyone could claim every contract.
2. **Each subject gets its own contract table and payout function.** Rejected: the platform would grow a function per subject, and adding a subject would touch the database rules.
3. **Subjects report named events. Contracts are data that count events. The database picks, checks and pays.** Chosen.

## Decision
**Subject events** (built in #46, migration `20261109000000_daily_contracts.sql`)
- A session report (`saveSession`) takes `events`, e.g. `[{ kind: 'run' }, { kind: 'run-90' }]`. A subject adds them at moments that matter: Morse `run`, `run-90`, `recognition-round`, `recognition-best`, `drill`, `drill-80`; Arabic `letters-session`, `letters-90`, `slate`, `coffee`. A kind is a short id (`^[a-z][a-z0-9-]{1,31}$`); `count` is 1 to 100.
- Events are **sent with the session save** (a new `p_events` array in `save_session`), so they are saved all or nothing with the session (ADR 0031). Up to 50 per session. (The first draft had a separate `reportEvent` call; riding on the save is simpler and can't half-fail.)
- They are stored per player, day and subject in `subject_events(user_id, day, subject_id, kind, count)`. The day is `player_today()`, the same day as the daily goal (ADR 0021). Every save also counts the platform's own `session` event.
- The kinds a subject may report are the ones its contract templates count (`subject_event_kinds`), each capped at 100 a day. **Other kinds are ignored**, not refused: a subject can't fill the table with junk, and a typo never loses a session.

**Contract templates are data**
- `content/core/contracts.json` (habits) and each subject's `content/<subject>/contracts.json` list templates: id, what is counted (`event` with its kind, or the habits' `minutes`, `sessions`, `subjects`), the target, the gold and the text.
- The migration copies them into `contract_templates`. A schema test compares the table with the JSON files, so they can't drift apart; changing a template means a new migration.

**Picking 3 a day**
- 1 habit contract, then 1 from each subject the player has started (has a `subject_progress` row; up to 2 subjects, chosen by the seed), or 2 from it when only one is started. Never one for a subject not opened yet, and "practice two subjects" only once two are started.
- Picked in the database, seeded by the player's id and the day (`md5`), and **stored** in `daily_contracts` the first time the day's board is asked for. Starting a subject later that day doesn't reshuffle it.

**Paying**
- `claim_contracts` runs at the end of `save_session` and in `todays_contracts()` (the board). For each of today's contracts that is complete and unpaid, it sets `daily_contracts.paid_gold` and adds the gold. The update only takes unpaid rows, so it pays once, even with two saves at once.
- `save_session` returns the contracts paid and the wallet's new gold in its award; `todays_contracts()` returns the board, the contracts paid just now and the gold.
- Gold only, never XP: XP keeps meaning "learning time". Habits 10–15 gold, subject contracts 15 or 20, so a full day is about 45.
- **The contract chest** for finishing all 3 arrives with chests (#48, ADR 0033). Until then the board promises only the gold.

**Where they show**
- The Notice Board lists each contract (its giver, text, progress and gold; finished ones read "Done"). The HUD has one line: "1 of 3 done today · 30 gold left to earn". The app asks for the board when the square opens and again on each move, so a session in a hall shows up on return.

**Questline status (#47)**
- Optional `SubjectInfo.questStatus(state)`, resolving to `{ questline, chapter, done, total, unit, next? }`, or null before the questline is started. It's computed in the browser from the subject's own saved state. It shows progress and pays nothing, so it needn't be checked by the database.
- It's async so each subject loads its questline code only when asked (`tracker.ts`), keeping the square's first load small (#124). The platform adds the link from the subject's building, so subjects never learn the city's paths.
- A started questline's line replaces the subject's plain Notice Board line, e.g. "The Silent Beacon I: Embers · 6/8 lamps". It shows in the HUD on wide screens and behind the dock's Quests button on phones. It's read again each time you move, so coming back from a hall shows the lamp you just lit.

## Consequences
- A subject adds contracts by adding event kinds and templates. No new database functions per subject.
- **What this doesn't stop** (as ADR 0029): a player who writes their own requests can report fake events, up to the daily caps. Acceptable for a personal app; the caps bound the gold.
- `save_session` gets one more parameter (`p_events`, default none). Old callers send no events and keep working.
- Templates live in two places (JSON and a migration). The test keeps them equal; changing one alone fails CI.
