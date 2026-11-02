# Economy: XP, levels, gold and gems

The numbers that make progress feel like a game. They're meant to be tuned: change them here, in [`src/core/progress/economy.ts`](../../src/core/progress/economy.ts), and in a new migration (the database applies the same rules; a test fails if the two disagree). Decision: [ADR 0020](../decisions/0020-fast-levels-and-rewards.md).

**Pace (Adam, 2026-11-02: "faster"):** level 2 in the first couple of minutes, level 5 on day one, level 10 by day four. Then each level gets a little longer, but never a grind.

## XP
- Subjects award it (ADR 0019). **Guideline: about 10 XP per minute of real learning.** New material and hard reviews earn more; replaying something easy earns little (game-layer notes, [03](../discovery/03-game-layer-and-partners.md)).
- A 15-minute day (the default daily goal) is about **150 XP**.
- At most 10,000 XP per award, 240 minutes per practice report (sanity limits).

## Levels
Going from level *n* to *n*+1 costs **10n + 10 XP**: 20, 30, 40, … So reaching level *L* takes 5(*L*−1)(*L*+2) XP in total.

| Level | Total XP | At ~150 XP a day |
|---|---|---|
| 2 | 20 | first 2 minutes |
| 3 | 50 | first 5 minutes |
| 5 | 140 | day 1 |
| 10 | 540 | day 4 |
| 20 | 2,090 | 2 weeks |
| 30 | 4,640 | 1 month |
| 50 | 12,740 | 3 months |
| 100 | 50,490 | about 11 months |

The level is computed from XP, never stored (ADR 0017), so retuning the curve moves everyone's level at once.

**Titles** by level, from the [world lore](../discovery/04-world-and-lore.md): Wanderer (1), Adventurer (5), Pathfinder (10), Veteran (20), Champion (35), Legend (50).

## Gold
- **1 gold per 5 XP**, counted on your XP total so nothing is lost to rounding. About 30 gold on a 15-minute day.
- **Reaching level *L* pays 5 × *L* gold.** For example, level 5 pays 25 gold.
- Spent in the Market (E10).

## Gems (rare)
- **1 gem at every 5th level** (5, 10, 15, …). Early on that's about one a week.

## Coming later (not dropped)
| Reward | Where |
|---|---|
| Daily-goal chest: gold, sometimes a gem | #20 (daily goal) |
| 1 gem for each 7-day streak | #20 (streak) |
| Combo bonus inside activities, end-of-activity screen | each subject's activities (E6–E9), through the contract |
| Daily quests and chests, quest gold | E10 (quests and rewards) |
| Weekly league | M5 (friends) |
| Achievements and boss challenges paying gems | later epics |

## What other apps do (researched 2026-11-02)
- **Duolingo** hides levels; the profile shows total XP. The old level table still exists in the background: level 2 at 60 XP, level 10 at 2,250, level 25 at 30,000. Momentum comes from small rewards instead: 10–20 XP per lesson plus combo bonuses, three daily quests opening chests, finishing all three unlocking a short triple-XP boost, chests holding gems (about 4–15), streaks with freezes, weekly leagues. In Duolingo's A/B tests, the streak wager raised 14-day retention by 5%. These figures come from fan wikis and third-party write-ups ([Splaitor](https://splaitor.com/how-many-levels-are-in-duolingo), [Lingoly](https://lingoly.io/earn-gems-duolingo/), [Econsultancy](https://econsultancy.com/six-a-b-tests-used-by-duolingo-to-tap-into-habit-forming-behaviour/)); Duolingo's own pages refused automated reading.
- **Brilliant:** no levels. Weekly leagues of 30 learners in 10 tiers, reset every Monday; repeating the same lesson on the same day earns no XP ([XP](https://brilliant.org/help/features/what-is-xp), [leagues](https://help.brilliant.org/en/articles/6399120-leagues-faq)).
- **Busuu:** weekly leagues you join after 2 lessons; the top 10 move up, the bottom 5 move down (third-party summary; Busuu's help pages refused automated reading).
- **Habitica** front-loads levels. From its source ([statHelpers.js](https://raw.githubusercontent.com/HabitRPG/habitica/develop/website/common/script/statHelpers.js)), the XP to the next level is 25 × level up to level 4, 150 at level 5, then about level²/4 + 10 × level + 140.
- **Mobile-game onboarding guides** (practitioner blogs, not research): a first win within about 2 minutes; frequent rewards early that space out later; no grinding in the first day ([Keewano](https://keewano.com/blog/first-time-user-experience-ftue-mobile-games/), [Playio](https://blog.playio.co/mobile-game-onboarding-retention)).

Waymark's curve is faster than Habitica's at the start (level 2 at 20 XP) and keeps levels visible, because the city and the character are the point (ADR 0003).
