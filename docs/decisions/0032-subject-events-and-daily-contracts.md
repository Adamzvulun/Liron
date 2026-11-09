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
**Subject events**
- New contract call `reportEvent(kind, count = 1)`. A subject calls it at a moment that matters, e.g. Morse `run-passed`, `drill-passed`; Arabic `letter-learned`, `words-read`. The kind is a short id (`^[a-z][a-z0-9-]{1,31}$`).
- Events are **sent with the session save** (a new `p_events` array in `save_session`), so they are saved all or nothing with the session (ADR 0031). Up to 50 per session.
- They are stored per player, day and subject in `subject_events(user_id, day, subject_id, kind, count)`. The day is `player_today()`, the same day as the daily goal (ADR 0021).
- Each subject declares its kinds in `subject_event_kinds`. Unknown kinds are refused, so a subject can't fill the table with junk. Each kind has a daily cap (default 100).

**Contract templates are data**
- `content/core/contracts.json` lists templates: id, subject (or none for a habit contract), what is counted, the target and the gold. A habit counts minutes or subjects practiced today, from `daily_activity`; a subject contract counts one event kind.
- A migration copies them into `contract_templates`. A test compares the table with the JSON, the same way economy.md is checked against the database, so they can't drift apart.

**Picking 3 a day: `todays_contracts()`**
- 1 habit contract, then 1 from each subject the player has started (has a `subject_progress` row), or 2 from it when only one is started. Never one for a subject not opened yet.
- Picked in the database, seeded by the player's id and the day (`md5`), so it's the same on every device all day. It returns each contract with its progress, target, gold and whether it's paid.

**Paying: `claim_contracts()`**
- Runs at the end of `save_session` (and when the board opens). For each of today's contracts that is complete and not yet paid, it writes `contract_payouts(user_id, day, template_id)` and adds the gold. The primary key makes it pay once, like `daily_chests` (ADR 0021).
- When all 3 are paid, it grants the day's wooden contract chest (ADR 0033).
- Gold only, never XP: XP keeps meaning "learning time". About 15 gold a contract (habit 10, harder 20).

**Questline status (#47)**
- Optional `SubjectInfo.questStatus(state)`, resolving to `{ questline, chapter, done, total, unit, next? }`, or null before the questline is started. It's computed in the browser from the subject's own saved state. It shows progress and pays nothing, so it needn't be checked by the database.
- It's async so each subject loads its questline code only when asked (`tracker.ts`), keeping the square's first load small (#124). The platform adds the link from the subject's building, so subjects never learn the city's paths.
- A started questline's line replaces the subject's plain Notice Board line, e.g. "The Silent Beacon I: Embers · 6/8 lamps". It shows in the HUD on wide screens and behind the dock's Quests button on phones. It's read again each time you move, so coming back from a hall shows the lamp you just lit.

## Consequences
- A subject adds contracts by adding event kinds and templates. No new database functions per subject.
- **What this doesn't stop** (as ADR 0029): a player who writes their own requests can report fake events, up to the daily caps. Acceptable for a personal app; the caps bound the gold.
- `save_session` gets one more parameter. Old callers send no events and keep working.
- Templates live in two places (JSON and a migration). The test keeps them equal; changing one alone fails CI.
