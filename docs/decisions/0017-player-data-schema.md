# 0017 — Player data: four tables, your rows only, derived level and streak

- **Status:** Accepted (part of #17), amended by [0018](0018-automatic-db-migrations.md) (migrations apply automatically) and [0021](0021-streak-and-daily-goal.md) (each day stores whether its goal was reached)
- **Date:** 2026-11-02

## Context
Progress lives in Supabase (ADR 0005). #17 needs tables for profile, wallet, daily activity and per-subject progress. Subjects are independent modules (ADR 0003), and #19 (XP and levels) and #20 (streak, daily goal) build on these tables. The browser talks to Supabase with the public publishable key (ADR 0016), so the database itself must protect the data.

## Decision
Migration: [`supabase/migrations/20261102190000_profile_and_progress.sql`](../../supabase/migrations/20261102190000_profile_and_progress.sql).

| Table | Key | Holds |
|---|---|---|
| `profiles` | user | display name, title (default "Traveller"), avatar (`jsonb`, shape set by E5), daily goal in minutes (default 15, range 5–240), time zone (IANA name, set by the app) |
| `wallets` | user | XP, gold, gems (never negative) |
| `daily_activity` | user + local day | minutes practised and XP earned that day |
| `subject_progress` | user + subject id | XP and minutes per subject, plus `state` (`jsonb`) that belongs to the subject module |

- **Level is derived from XP, and the streak from daily activity.** Neither is stored, so they can't drift out of sync. When #19 tunes the level curve, every level updates by itself. The streak counts consecutive days whose minutes reach the goal, in the profile's time zone (#20).
- **Subjects own their `state`.** The platform reads only XP and minutes. That keeps subjects independent (ADR 0003) and avoids a migration for every subject feature.
- **Row-level security on every table:**
  - A signed-in user can read, create and update only their own rows.
  - Logged-out visitors get nothing.
  - Nobody can delete rows through the API; rows go with the account (`on delete cascade`).
- **New accounts get a profile and an empty wallet automatically** (a trigger on `auth.users`). Accounts that existed before the migration get theirs from the migration itself.
- **Tested** with the real migration in PGlite (Postgres compiled to WebAssembly, run inside Vitest): `supabase/tests/schema.test.ts`. A test-only stand-in supplies Supabase's `auth.users` and `auth.uid()`. I checked that the tests fail when row-level security or the ownership check is removed.
- ~~Applied by hand in the SQL editor.~~ **Applied automatically** on merge, by a GitHub Actions workflow ([ADR 0018](0018-automatic-db-migrations.md)).

## Consequences
- **The app can write its own XP and gold.** That's fine for one learner. Before friends and leaderboards (M5), awards should move to a server-side function, so nobody can give themselves XP. Revisit in E18.
- Adding a subject needs no migration: it just uses a new `subject_id`.
- Changing what a table holds means a new migration file, never editing an applied one.
