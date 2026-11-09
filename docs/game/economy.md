# Economy: XP, levels, gold and gems

The numbers that make progress feel like a game. They're meant to be tuned: change them here, in [`src/core/progress/economy.ts`](../../src/core/progress/economy.ts), and in a new migration (the database applies the same rules; `supabase/tests/schema.test.ts` compares the curve, gold, streak and daily chest with this file, so changing one side alone fails). Decisions: [ADR 0020](../decisions/0020-fast-levels-and-rewards.md) (levels, gold, gems), [ADR 0021](../decisions/0021-streak-and-daily-goal.md) (daily goal, streak).

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
- **Daily chest:** 20 gold (below).
- **Daily contracts:** 10 to 20 gold each, about 45 a day for all 3 (below).
- Spent in the Market (E10).

## Gems (rare)
- **1 gem at every 5th level** (5, 10, 15, …). Early on that's about one a week.
- **1 gem in the daily chest on every 7th streak day.**

## Daily goal and streak
- **Daily goal:** 15 minutes by default; you pick 5, 10, 15, 20, 30, 45 or 60 in the HUD. Practice minutes from every subject count.
- **Your day** follows your browser's time zone, saved to your profile when you open Waymark. It can change at most once every 20 hours, so travelling can't make two "todays" in one real day ([ADR 0029](../decisions/0029-database-is-the-only-writer-of-rewards.md)).
- **At most 3,000 XP a day** across all subjects. Minutes still count after that. A normal day earns far less.
- **Streak:** consecutive days on which you reached the goal. Today counts once you reach it; until then the streak from yesterday stays alive. A missed day resets it to 0. Streak protection items come later, from the Market (E10).
- **Daily chest:** reaching the goal pays **20 gold**, once a day (the database records each chest, so it can't be paid twice). On every **7th day** of a streak (7, 14, 21, …) the chest also holds **1 gem**.
- Changing the goal never rewrites past days. Lowering it below what you've already done today reaches today's goal straight away.

## Daily contracts
Three a day on the Notice Board ([ADR 0032](../decisions/0032-subject-events-and-daily-contracts.md), #46): one habit, then one from each subject you've started (two from it if you've started only one). They're picked by the database once a day and don't change if you start a subject later. Each pays **gold only**, never XP, once, as soon as it's done. The templates are data in `content/core/contracts.json` and each subject's `contracts.json`.

| Contract | Target | Gold |
|---|---|---|
| Practice minutes today | 25 minutes | 10 |
| Finish sessions today | 3 sessions | 10 |
| Practice two subjects today (only once two are started) | 2 subjects | 15 |
| Morse: a Koch run at 90% · 3 Koch runs · 2 recognition rounds · a recognition best · a sending drill at 80% | 1 · 3 · 2 · 1 · 1 | 20 · 15 · 15 · 20 · 15 |
| Arabic: a letters session at 90% · 2 letters sessions · a slate page · a coffee corner visit | 1 · 2 · 1 · 1 | 20 · 15 · 15 · 15 |

## Coming later (not dropped)
| Reward | Where |
|---|---|
| Combo bonus inside activities | E10 (quests and rewards). It was planned for E6–E9 but not built there; the end-of-activity screens were. |
| Chests, and the contract chest for finishing all 3 | E10 (#48) |
| Streak protection items | E10 (Market) |
| Weekly league | M5 (friends) |
| Achievements and boss challenges paying gems | later epics |

## What other apps do (researched 2026-11-02)
- **Duolingo** hides levels; the profile shows total XP. The old level table still exists in the background: level 2 at 60 XP, level 10 at 2,250, level 25 at 30,000. Momentum comes from small rewards instead: 10–20 XP per lesson plus combo bonuses, three daily quests opening chests, finishing all three unlocking a short triple-XP boost, chests holding gems (about 4–15), streaks with freezes, weekly leagues. In Duolingo's A/B tests, the streak wager raised 14-day retention by 5%. These figures come from fan wikis and third-party write-ups ([Splaitor](https://splaitor.com/how-many-levels-are-in-duolingo), [Lingoly](https://lingoly.io/earn-gems-duolingo/), [Econsultancy](https://econsultancy.com/six-a-b-tests-used-by-duolingo-to-tap-into-habit-forming-behaviour/)); Duolingo's own pages refused automated reading.
- **Brilliant:** no levels. Weekly leagues of 30 learners in 10 tiers, reset every Monday; repeating the same lesson on the same day earns no XP ([XP](https://brilliant.org/help/features/what-is-xp), [leagues](https://help.brilliant.org/en/articles/6399120-leagues-faq)).
- **Busuu:** weekly leagues you join after 2 lessons; the top 10 move up, the bottom 5 move down (third-party summary; Busuu's help pages refused automated reading).
- **Habitica** front-loads levels. From its source ([statHelpers.js](https://raw.githubusercontent.com/HabitRPG/habitica/develop/website/common/script/statHelpers.js)), the XP to the next level is 25 × level up to level 4, 150 at level 5, then about level²/4 + 10 × level + 140.
- **Mobile-game onboarding guides** (practitioner blogs, not research): a first win within about 2 minutes; frequent rewards early that space out later; no grinding in the first day ([Keewano](https://keewano.com/blog/first-time-user-experience-ftue-mobile-games/), [Playio](https://blog.playio.co/mobile-game-onboarding-retention)).

Waymark's curve is faster than Habitica's at the start (level 2 at 20 XP) and keeps levels visible, because the city and the character are the point (ADR 0003).
