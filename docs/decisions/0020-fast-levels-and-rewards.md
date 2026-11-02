# 0020 — Fast, front-loaded levels; rewards paid by the database

- **Status:** Accepted (part of #19; Adam chose the pace: "faster", 2026-11-02)
- **Date:** 2026-11-02
- **Builds on:** [0017](0017-player-data-schema.md) (level derived from XP), [0019](0019-subject-contract.md) (subject contract)

## Context
#19 asks for XP, levels, gold and gems: the XP bar and level update when XP is awarded, level-ups are celebrated, and the rates are written down so they can be tuned. Adam wants the pace of today's learning apps, which reward early and often ([economy](../game/economy.md#what-other-apps-do-researched-2026-11-02)).

## Options considered
1. **A slow curve** (level 10 in a month). Rejected by Adam: too slow to feel motivating.
2. **A fast, front-loaded curve** (level 2 in minutes, level 10 in four days). Chosen.
3. **No levels, only leagues** (Brilliant), or hidden levels (Duolingo). Rejected: the character's level is part of the city (ADR 0003, vision).

And where the rewards are computed:
1. **In the browser**, which then writes gold and gems. Rejected: two tabs could both pay the same level-up, and it's easier to cheat once there are friends (M5).
2. **In the database**, in the same transaction that adds the XP. Chosen.

## Decision
- **Curve:** level *n* → *n*+1 costs 10*n* + 10 XP. Level 2 at 20 XP, 5 at 140, 10 at 540, 20 at 2,090. Titles change at levels 5, 10, 20, 35 and 50.
- **Gold:** 1 per 5 XP, plus 5 × *L* for reaching level *L*. **Gems:** 1 at every 5th level. All rates and their reasoning: [economy](../game/economy.md).
- **The database pays.** Migration `20261102230000_levels_and_rewards.sql` adds `xp_for_level` and `level_for_xp`. `record_progress` (ADR 0019) now:
  - locks the wallet row, so two awards at once can't both pay the same level-up;
  - adds the XP, gold and gems;
  - returns the new wallet, what was earned, and the level before and after.
- **The same rules in TypeScript** (`src/core/progress/economy.ts`) draw the XP bar and back the in-memory store used in tests. A test runs both and fails if they disagree.
- **The HUD** shows title, level, XP bar, gold and gems, after the city concept. **The level-up celebration** is a card over the page with the new level, any new title, and the gold and gems earned. Several level-ups before you dismiss it merge into one card.
- The platform passes `player.applyAward` to every subject's API, so any subject's award updates the HUD and triggers the celebration.

## Consequences
- **Retuning** means editing `economy.ts`, adding a migration that replaces the two functions, and updating [economy](../game/economy.md). Levels move for everyone at once, because they're never stored.
- Gold and gems already earned stay when rates change.
- Nothing awards XP until the first activities (M2), so on the dev site the HUD shows level 1 with no XP for now.
- Daily-goal chests and streak gems come with #20; quests with E10; leagues with M5 ([economy](../game/economy.md#coming-later-not-dropped)).
