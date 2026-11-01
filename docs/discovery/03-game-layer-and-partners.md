# 03 — The game layer & the partner cast

- **Status:** Open
- **Date:** 2026-11-01
- **Builds on:** ADR 0003 (hub), 0006 (art), 0007 (partners)

## 1. The lobby: a town with places

| Place | What it does | v1? |
|---|---|---|
| 📻 **Radio Tower** | The Morse subject: its lesson path, games, and the radio room where operators call CQ | ✅ |
| ☕ **The Café** | The Arabic subject: its lesson path, games, and the table where your Arabic friends sit | ✅ |
| 🏠 **Your House** | Wardrobe and avatar customization, trophy shelf, stats | ✅ |
| 🛒 **Market** | Spend gold on gear and items. Stock rotates daily. | ✅ |
| 📜 **Notice Board** | Daily goal, streak, and quests | ✅ |
| 🏟️ **Arena** | Leaderboards, friend challenges, duels | 🔒 v2 (social) |
| 🚧 **Empty plots** | Future subjects, shown as construction sites with signs | ✅ (decor) |

**Living details** make the town feel alive:
- The Radio Tower's light blinks when an operator is "calling CQ".
- Steam rises from the café when a friend has messaged you.
- The town changes over the day and the seasons.
- Your avatar idles, waves, and celebrates on level-up.

## 2. Progression model

Three layers:

**1. Subject mastery**: the real learning, measured honestly.
- **Morse:** characters unlocked, character speed and effective speed, copy accuracy, sending quality score.
- **Arabic:** letters mastered, words known (FSRS-mature), estimated coverage of everyday speech, conversations held.
- Each subject has **ranks** with flavour titles, e.g. Morse "Static Listener → … → Phantom Fist", Arabic "Tourist → … → Local". Ranks come from mastery, *not* grinding.

**2. Character level (global XP)**
- XP comes from any learning activity, so all subjects feed one character.
- Levels unlock cosmetics, market slots, and new partners.

**3. Habit**
- A daily goal (e.g. 15 min or N XP), a streak, and weekly quests.

### Anti-grind rule
XP and gold are weighted by **learning value**: new material, hard reviews, real conversations. Endlessly replaying an easy game earns very little. Mastery ranks can't be bought.

## 3. Economy (cosmetic + functional)

| Currency | Earned by | Spent on |
|---|---|---|
| 🪙 **Gold** | Lessons, quests, streak milestones | Gear in the Market, functional items |
| 💎 **Gems** (rare) | Rank-ups, perfect weeks, boss challenges | Rare/legendary cosmetics |

**Functional items** (they help a little and never skip learning):
- 🧊 **Streak freeze**: protects one missed day.
- 💡 **Hint token**: in Arabic, reveals the first letter or the transliteration. In Morse, replays a character slowly.
- 🎧 **QRS pass**: one-time "please send slower" without the operator getting impatient.
- ☕ **Coffee for a friend**: gift your Arabic partner a coffee to unlock a special conversation topic (story flavour).

**Cosmetics:**
- Gear for each slot, in themed sets: "Radio Operator", "Desert Traveler", "Café Regular"…
- Pets.
- House decorations and frames for the trophy shelf.
- Some gear is earned *only* through subject ranks (e.g. a golden headset for 25 wpm), so it's a true brag item when friends visit.

## 4. The partner cast (draft, for Adam to shape)

### Arabic: people at the Café
They're Arabic speakers from around Israel and the West Bank, with varied ages and personalities. Final names and details are Adam's call.

| Draft | Who | Difficulty | Flavour |
|---|---|---|---|
| A | Friendly café owner in his 50s | ⭐ Easy | Patient, talks about food, family, and football; loves teaching you new words *in conversation* |
| B | University student, mid-20s | ⭐⭐ | Fast, funny, slangy, mixes in Hebrew words; talks about exams and music |
| C | Grandmother from a village | ⭐⭐⭐ | Rich proverbs, heavier dialect, stories about the old days |
| D | Taxi driver / shopkeeper | ⭐⭐ | Practical scenarios: directions, prices, haggling |

### Morse: operators on the air
They use fictional callsigns (not real issued ones) from a mix of countries.

| Draft | Who | Flavour |
|---|---|---|
| 1 | Retired ship's radio officer | Perfect fist, old-school, sends long stories |
| 2 | Young contester | Fast and terse ("5NN TU"), impatient |
| 3 | Mountain-top portable operator (POTA/SOTA style) | Weak signal, fading, battery dying mid-QSO |
| 4 | Fellow beginner | Slow, makes mistakes too. A confidence builder. |

## 5. Daily loop (15–20 min)
```
Open app → lobby greets you (streak, today's quests)
  → Notice board suggests: "Café: 12 reviews due + new lesson" / "Radio: Koch level 7"
  → ~10 min core (lessons + reviews)  → ~5 min fun (game or partner chat)
  → Rewards chest → gold/XP → maybe a new item in the Market
```

## 6. Social (v2+) brainstorm
- **Visit a friend's house**: see their avatar, trophies, and ranks.
- **Weekly league** (XP-based, Duolingo style), with a mastery-based board alongside.
- **Async challenges**: "Beat my callsign rush score", "Same 20 words, who's faster?".
- **Live Morse duel**: two players exchange Morse in real time. The ultimate skill test.
- **Co-op quests**: "Together, hold 10 café conversations this week."

## 7. Open questions
1. **Partner cast:** do you like this mix? Anyone you specifically want to talk to (a role, region, or age)?
2. **Partner realism:** may partners occasionally message *you* first, e.g. a notification like "Abu Sami: كيفك؟ زمان ما شفتك"?
3. **Rank titles and town name:** want to brainstorm lore and naming together, or should Claude draft a set?
4. **Morse sending speed:** should the operator's speed follow your copy speed automatically, or should you set it?
5. **Leagues:** competitive weekly leagues (with demotions), or friendlier: personal bests and challenges only?
