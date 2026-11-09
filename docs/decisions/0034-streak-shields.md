# 0034 — Streak shields: a missed day is covered, not counted

- **Status:** Accepted (E10, #49)
- **Date:** 2026-11-09
- **Amends:** [0021](0021-streak-and-daily-goal.md) (a missed day no longer always resets the streak)
- **Builds on:** [0033](0033-inventory-chests-and-market.md) (shields come from chests and the Market)

## Context
ADR 0021: the streak is the number of consecutive days the goal was reached, and a missed day resets it. Its consequences already said streak protection would come from the Market, and would need a per-day flag. The approved design makes the streak shield the first functional item: 120 gold, hold up to 2, one used up per missed day.

## Options considered
1. **The player uses a shield by hand after missing a day.** Rejected: you'd have to remember, and the streak would look broken until you did.
2. **A shield is used up at midnight.** Rejected: nothing runs at midnight. We have no scheduled jobs and don't want any.
3. **A shield is used up the next time the streak is checked**, for each missed day since the last goal day. Chosen.

## Decision
- New column `daily_activity.shielded` (boolean). A shielded day keeps the streak alive but **doesn't add to it**: 5 days, a shielded day, then 1 more day is a streak of 6.
- New function `use_streak_shields()`, run by `today_status()` and `check_daily_goal()` before they count the streak. It looks at the missed days between the last goal (or shielded) day and yesterday:
  - If the player holds **at least as many shields as missed days**, each missed day gets a `shielded` row and one shield is used up per day.
  - If not, **no shields are used**: the streak breaks, and the shields are kept for next time. A shield never covers part of a gap that would break anyway.
  - A streak of 0 needs no shield.
- `current_streak()` treats a shielded day as a kept day that isn't counted. The TypeScript `streakFrom` (tests' in-memory store) does the same, and the existing test that compares the two covers shielded days.
- The HUD says when a shield was used ("A streak shield saved your 12-day streak").
- Streak chests (days 7, 30, 100; ADR 0033) count only goal days, so a shield never earns one by itself.

## Consequences
- Shields are a count on the wallet, not owned items, because you hold several and use them up.
- Changing the goal still never rewrites history (ADR 0021): shielded rows are set once, like `goal_reached`.
- A player away for 3 days with 2 shields loses the streak and keeps the shields. That's the rule's point: shields cover a slip, not a break.
