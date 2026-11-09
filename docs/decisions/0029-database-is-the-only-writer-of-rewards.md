# 0029 — The database is the only writer of rewards and progress

- **Status:** Accepted
- **Date:** 2026-11-04
- **Amends:** [0017](0017-player-data-schema.md), [0019](0019-subject-contract.md), [0020](0020-fast-levels-and-rewards.md), [0021](0021-streak-and-daily-goal.md), [0023](0023-content-format-and-private-pipeline.md)

## Context
The 2026-11-04 security review ([review](../process/reviews/2026-11-04-security.md)) found that a signed-in player could change their own wallet, daily activity and subject totals straight through Supabase's Data API, because row-level security let users insert and update their own rows. The database functions ran as the user, so they couldn't be the only path. The review showed four ways in:

1. **Direct writes** to `wallets`, `daily_activity`, `subject_progress` and the profile's time zone and goal.
2. **The daily chest could pay twice**: `check_daily_goal` paid whenever `goal_reached` turned true, and a player could set it back to false.
3. **No limits in `record_progress`**: any subject name, up to 10,000 XP a call, and a new time zone could make a second "today" in one real day.
4. **The licensed deck** (ADR 0011, 0023) was readable by *any* signed-in account, including an anonymous sign-in if that were ever switched on.

E10 (contracts, chests, the Market) assumes "the database pays", so this has to be true first.

## Decision
- **Only database functions write rewards and progress.** They become `security definer`, act only on `auth.uid()`'s rows, and the `authenticated` role loses insert and update on `wallets`, `daily_activity` and `subject_progress`. On `profiles` it may update only `display_name` and `avatar`.
- **The daily chest is a row** in `daily_chests (user_id, day)`. A chest is paid only when that row is first inserted, so it's paid once per day, whatever happens to `daily_activity`.
- **Known subjects only:** a `subjects` table lists `morse`, `arabic` and `example`. Adding a subject means adding a row in its migration.
- **At most 3,000 XP a day** across subjects. Above that, minutes still count but XP stops. A normal day is far below it (15 minutes at about 10 XP a minute is 150).
- **The time zone changes at most once every 20 hours.** Otherwise the call does nothing, so the app never shows an error for it.
- **The deck is read by licensees only:** `content_licensees` lists who may read `content_items`, `content_lessons` and the `private-media` bucket, and anonymous sessions are always refused. Existing accounts were added when the migration ran. **The first account ever created** is added too, so a fresh prod project gives Adam access. Anyone else is added by hand (see [SUPABASE](../process/SUPABASE.md#adding-a-licensee)).
- **Size limits:** an avatar is under 4 KB, a subject's state under 64 KB.

## Consequences
- **Direct client writes:** only the name and the look remain, and both are harmless.
- **What this doesn't stop:** the functions still trust what the app reports (e.g. "I earned 20 XP"). A player who writes their own requests can still report fake practice, up to the daily cap. That's acceptable for a personal app; E10's contracts must keep it in mind ([ADR 0032](0032-subject-events-and-daily-contracts.md)).
- Tests: `supabase/tests/schema.test.ts` checks every rule above on the real migrations in PGlite.
- No cost, no new technology.
