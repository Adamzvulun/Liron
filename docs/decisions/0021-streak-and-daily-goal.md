# 0021 — Daily goal and streak: stored per day, paid by the database

- **Status:** Accepted (part of #20)
- **Date:** 2026-11-02
- **Builds on:** [0017](0017-player-data-schema.md) (streak derived from daily activity), [0020](0020-fast-levels-and-rewards.md) (rewards paid by the database)
- **Amends:** 0017. Each day now stores whether its goal was reached, instead of comparing its minutes with today's goal.

## Context
#20: practice minutes from any subject count towards a daily goal (default 15 minutes, adjustable). Reaching it grows the streak once that day, in Adam's time zone. A missed day resets it. The HUD shows the streak and today's progress. The economy promised a daily chest and a gem for each 7-day streak ([economy](../game/economy.md)).

ADR 0017 derived the streak from minutes and the profile's goal. But the goal can change: raising it from 15 to 30 would turn last week's 20-minute days into misses and wipe the streak.

## Options considered
1. **Compare each day's minutes with the current goal.** Rejected: changing the goal rewrites history.
2. **Store each day's goal minutes**, then compare. Works, but needs a second column and an extra rule for days with no goal stored.
3. **Store `goal_reached` per day**, set once when that day's minutes reach the goal in force at that moment. Chosen: one boolean, and history never changes.

## Decision
- Migration `20261102235000_streak_and_daily_goal.sql`:
  - adds `daily_activity.goal_reached`, and backfills it for days that already met the goal;
  - adds database functions (all run as the signed-in user, under row-level security):

| Function | Does |
|---|---|
| `player_today()` | Today in the profile's time zone (UTC if the zone name is unknown) |
| `current_streak()` | Consecutive goal days ending today, or yesterday while today is still open |
| `today_status()` | Today's minutes, goal, whether it's reached, and the streak |
| `check_daily_goal()` | Marks today reached once its minutes reach the goal and pays the daily chest. The row lock makes it pay once a day, even with two awards at once. |
| `set_daily_goal(minutes)` | Changes the goal (5–240), then checks it: lowering it below today's minutes reaches today at once |
| `set_time_zone(zone)` | Accepts only zone names Postgres knows |

- **`record_progress` calls `check_daily_goal()`** in the same transaction and returns today's status, so any subject's practice can reach the goal.
- **Daily chest:** 20 gold, plus 1 gem on every 7th day of a streak.
- **Time zone:** the app sends the browser's time zone when it opens. Your day is where you are; travelling shifts it, which is what you'd expect.
- **The same rules in TypeScript** (`streakFrom`, `dailyChest` in `economy.ts`) back the in-memory store used in tests. A test compares the streak query with `streakFrom` across patterns of goal days and gaps.
- **HUD:**
  - a streak chip (the flame lights up once today's goal is reached);
  - a daily-goal panel with a progress bar and a "Minutes a day" picker (5, 10, 15, 20, 30, 45, 60);
  - a "Daily goal reached" card showing the streak and the chest. It comes after any level-up card, one at a time.

## Consequences
- Streak protection (freezes) comes from the Market (E10). It will need a way to mark a missed day as protected, probably another per-day flag.
- Until the first activities (M2), only lowering the goal can reach it, so on the dev site the streak stays 0.
- The streak is computed with one indexed query per read. That's fine for one player's history; revisit if it ever shows up as slow.
