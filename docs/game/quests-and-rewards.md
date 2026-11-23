# E10 quests and rewards (#46–#49)

Drafted on 2026-11-04. **Adam approved the draft and its Notice Board concept on 2026-11-04** ("yes to all"). It is E10's design; the ADRs in section 5 come first, then the build, one PR per issue.

**Concept:** [the Notice Board](../design/e10/notice-board-concept.html) (screenshots: [phone](../design/e10/notice-board-phone.png), [desktop](../design/e10/notice-board-desktop.png)). It shows the day's 3 contracts as pinned notes (stamped DONE when finished), the contract chest with one seal per contract, a lamp strip per questline, and the Market stall with 4 wares, what you can't afford yet and what you already own.

## The short version
- **Contracts (#46):** every day the Notice Board offers 3 contracts. One is a habit contract (minutes), and the others come from the subjects you've started. They pay **gold** (not XP: XP stays for learning, about 10 a minute). Finishing all 3 opens the day's **contract chest**.
- **Questline tracker (#47):** each subject tells the platform where its main questline stands. The HUD shows one line per questline ("The Silent Beacon · Embers · 6/8 lamps") that links into its hall.
- **Chests (#48):** come from trials, streak milestones and the 3-contract day. What's inside is rolled **on the server** from drop tables that are data. Reloading the page can't reroll a chest.
- **Market (#49):** 4 items a day, rotating by date, bought with gold. They land in your house and wardrobe. The first functional item is the **streak shield**.
- **No real money anywhere** (the vision, #48). Gold and gems are earned only.

## 1. Daily contracts (#46)
- **Where they come from:** each subject offers contract *templates* as data, e.g. Morse: "pass a Koch run at 90%", "beat your Instant Recognition best", "key a sending drill at 80%"; Arabic: "learn a new letter", "review 15 letters", "read 10 words". The platform adds habit templates: "practise 15 minutes", "practise two subjects today".
- **Picking 3 a day:** seeded by your id and the date, so the board is the same all day on every device. There's always 1 habit contract, then 1 from each subject you've started (two if you have only one subject). Never a contract for a subject you haven't opened.
- **How a contract knows it's done:** subjects already report minutes, XP, reviews and ratings. Subject-specific moments (a run passed, a letter unlocked, a trial passed) need one new call in the subject contract: `api.reportEvent(kind, data)`, stored per day. Morse already has these moments in code (`reportRun`, `reportRound`, `reportDrill`), so it's a few lines per subject.
- **Paying out:** a database function checks the day's events and pays once, the same way the daily chest is paid today (ADR 0021). That keeps payouts honest without trusting the browser.
- **Rewards:** about **15 gold** per contract (habit 10, harder ones 20), so 3 contracts roughly double a day's gold (about 30 from XP now). All 3 open the contract chest.
- **Celebration:** a short stamp on the board ("Done") and the gold flying to the HUD purse. No modal.

## 2. Questline tracker (#47)
- **One optional method in the subject contract:** `questStatus(state)` returns `{ questline, chapter, step, done, total, href }`. Morse already computes this (`questStatus(unlocked)` in the hall), so it only needs exposing; Arabic gets it with "The Long Road In".
- **The HUD** shows one slim line per started questline. On phones it folds into the Notice Board.
- **Story data stays in each subject's content pack** (`questline.json`). The platform only shows status. It doesn't learn each subject's story.

## 3. Chests (#48)
- **Sources:** each trial passed (one per chapter), streak days 7, 30 and 100, and the 3-contract day.
- **Kinds:** wooden (contracts), brass (trials), and a jeweled chest for long streaks (days 7 brass, 30 and 100 jeweled). Better chests give better odds; they don't hold more things.
- **Contents (built as drafted, as data in `content/core/chests.json`):**

  | Chest | Gold | Gem | Gear | Streak shield |
  |---|---|---|---|---|
  | Wooden | 15–40 (always) | 5% | 10% | 5% |
  | Brass | 40–80 (always) | 25% | 40% | 15% |
  | Jeweled | 80–150 (always) | 100% (1–2) | 60% | 40% |

  Gear comes from the gear in `content/core/items.json`. If you own it all, you get the item's price in gold instead; a shield when you hold 2 becomes 120 gold.
- **Rolling:** the server rolls when the chest is opened, seeded by the chest's id, so opening the same chest twice gives the same thing.
- **Opening:** chests wait on the Notice Board's shelf, each with what earned it; today's contract chest sits there locked, a seal lit per contract done. Opening one lifts the lid and the contents rise one by one (under 2 seconds, at once with reduced motion). Collect (or Escape) closes it at any time. The HUD says how many chests wait.

## 4. Market (#49)
- **Stock:** 5 slots a day, seeded by the date: 2 gear, 1 color or look option, 1 functional item, 1 piece of furniture (#443). Prices are data:

  | Rarity | Gold | At ~60 gold a day |
  |---|---|---|
  | Common | 60 | a day |
  | Rare | 180 | 3 days |
  | Epic | 450 | about a week |
  | Streak shield | 120 | 2 days |

- **As built (#49):** the stall is the Market building's screen, not a panel on the Notice Board. Each ware shows your traveler wearing it; what you can't afford says how much more gold you need; what you own says "Yours".
- **Owning things:** a new `owned_items` table. The avatar then reads unlocks from the database, which `docs/game/avatar.md` already plans ("once E10 lets players earn items, unlocks should live in the database").
- **Streak shield:** you can hold 2. On a missed day, one is used up and the streak survives. This changes the streak rule in ADR 0021, so it needs its own ADR.

## 5. Decisions this needs (ADRs, at E10's start)
Written on 2026-11-09: [0032](../decisions/0032-subject-events-and-daily-contracts.md), [0033](../decisions/0033-inventory-chests-and-market.md), [0034](../decisions/0034-streak-shields.md).

1. Subject events and contracts: `reportEvent` in the contract, a day's events table, payouts in the database.
2. Inventory, chests and the Market: `owned_items`, server-side rolls, drop tables as data.
3. Streak shields: how a missed day uses one up (amends ADR 0021).

## 6. My picks, for Adam to change
1. **3 contracts a day,** one habit plus one per subject.
2. **Contracts pay gold, not XP,** so XP keeps meaning "minutes of learning".
3. **Chests are rolled on the server and can't be rerolled.**
4. **The streak shield is the first functional item,** 120 gold, and you can hold 2.
5. **No timers or "come back in 4 hours" chests.** Rewards follow learning, never waiting (the anti-grind rule in economy.md).

## What it reuses
- The gold and daily-chest machinery (economy.md, ADR 0020/0021): contract payouts copy the daily chest's pay-once pattern.
- The subject contract (ADR 0019): two additions, `reportEvent` and the optional `questStatus`. (2026-11-16: `questStatus` is replaced by `road`, see [the-road.md](the-road.md).)
- The avatar's items (`looks.ts`). There are only 4 locked items today (each earned by a milestone, e.g. a 7-day streak), so chests and the Market need **more gear drawn**: about 3 more per slot, about 18 items, as part of E10. That's the sprint's biggest art job.
