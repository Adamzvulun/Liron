# 04 — World & lore (draft for Adam to react to)


> 📚 **Historical record.** The current truth is [`vision.md`](../vision.md) and the ADRs, including the simplification pass [0011](../decisions/0011-simplification-pass.md).

- **Status:** Draft
- **Date:** 2026-11-01
- **Direction from Adam:** less childish, more like an MMO RPG with quests. Friendly, not cut-throat competition.

## 1. Tone shift
| From (discovery 03) | To |
|---|---|
| Cute cozy town | **Adventurous crossroads city.** Stylized and bold (ADR 0006 still holds), but heroic rather than cute. Rich materials such as stone, brass, and lantern light. |
| Shops and buildings | **Guild halls**, each with a guildmaster, a quest board, ranks, and gear |
| Daily tasks | **Quests:** main storylines, contracts, trials, and world events |
| Friends list | **Party / Fellowship**, with co-op goals |

## 2. The frame
> You arrive at **a crossroads city where travelers come to master rare arts.** Each art has a guild. You join the guilds, take on their questlines, and rise through their ranks. The halls hold doors to the real world: the **Signal Tower's radio** reaches operators across the globe, and the **Caravanserai** is where people from the Levant come to sit, drink coffee, and talk.

This keeps the **game world** (quests, gear, ranks) and the **real people** (ADR 0007) cleanly separate.
- The world is the fantasy frame.
- The conversations are realistic and modern. They happen "through" the radio, or over coffee at the Caravanserai.

**Adam's answer: a mix.**
- The world blends fantasy with the modern: a timeless city where stone guild halls sit next to brass radios, lantern-lit cafés, and the occasional modern detail.
- The quests and the world use RPG language, and the people you talk to are fully modern.

### City name ideas (also candidates for the hub's real name, replacing "Liron")
1. **Meridian**: where all paths cross.
2. **Waymark**: a guidepost for travelers.
3. **Crossroads Keep**
4. **Lanternfall**: a city lit by the knowledge of its guilds.
5. **Babel's Gate**: a nod to languages, though it's more on-the-nose.

## 3. The guilds

### 📻 The Signal Tower: Guild of Signalers (Morse)
> Its beacon went dark long ago. The guild needs operators who can hear the voice in the static.

| Rank | Earned by (real mastery) |
|---|---|
| Initiate | Join, and hear your first two characters |
| Listener | All 26 letters via Koch at ≥90% |
| Keyer | Clean sending of all letters at 15+ wpm (timing score) |
| Operator | Letters, numbers, and prosigns, plus **first full QSO** |
| Telegraphist | Head copy of common words at 20 wpm |
| Signal Master | QSO at 25 wpm with no repeats asked |
| **Ghost of the Ether** *(legendary)* | 30+ wpm head copy and sending |

**Main questline: "The Silent Beacon."** Each Koch stage relights part of the tower. Your first QSO restores its voice. Later chapters are "The Storm Band" (copying through heavy noise) and "The Far Station" (a weak DX operator at the edge of propagation).

### ☕ The Caravanserai: House of the Crossing (Arabic)
> An old travelers' inn (خان) where traders, storytellers, and families pass through. Earn your place at the table.

Ranks use real Arabic words, so the title itself is a word you learn:

| Rank | Earned by |
|---|---|
| غريب *Gharīb* (Stranger) | Join |
| ضيف *Ḍēf* (Guest) | Read and write the whole script |
| مسافر *Msāfer* (Traveler) | 300 words + survival phrases |
| جار *Jār* (Neighbor) | First real conversation with a partner |
| صاحب *Ṣāḥeb* (Friend) | 1,000 words + 20 conversations |
| ابن البلد *Ibn il-Balad* (Local) | 2,000 words, 10-minute conversation without English |
| حكواتي *Ḥakawāti* (Storyteller) *(legendary)* | Tell a story to a partner and understand theirs |

**Main questline: "The Long Road In."** You arrive knowing nothing. Learning the script opens the inn's ledger. Each chapter of words introduces a new regular who takes a seat at your table. Reputation with each of them deepens your conversations.

### 🚧 Unbuilt guild halls
These are construction sites for future arts, with signs like "The Guild of ___ seeks founders."

## 4. Character (global)
- **Classless adventurer.** You get your character level from all XP.
- **Titles by level:** Wanderer → Adventurer → Pathfinder → Veteran → Champion → Legend.
- **Gear** shows where you've been, e.g. a Signaler's brass headset or a Caravanserai keffiyeh. Guild-rank gear can't be bought; it's earned.

## 5. Quest types
| Type | Example | Maps to |
|---|---|---|
| **Main questline** | "The Silent Beacon, Ch. 3: Relight the third lamp" | The curriculum path |
| **Daily contracts** (quest board) | "Review 20 cards", "Copy 3 callsigns above your speed" | Daily goal and spaced-repetition reviews |
| **NPC quests** | "Ask Umm Khalil about her olive harvest", "Work a station from Japan" | Partner conversations with a specific goal |
| **Trials** (boss fights) | "The Gatekeeper: copy 50 characters at 90%" | Checkpoint tests that gate ranks |
| **World events** | A Field Day weekend on the radio; Ramadan evenings at the Caravanserai with themed vocabulary | Seasonal content |
| **Fellowship quests** (v2) | "As a party, hold 10 conversations this week" | Co-op social |
| **Achievements** | "No AGN all week", "First joke understood in Arabic" | Long-tail goals that unlock titles |

**Reputation:** each partner has a friendship level that grows with conversations. Higher reputation unlocks deeper topics, personal stories, and occasionally a message from them first.

## 6. The cast (revised: adults, grounded, real)
Names are placeholders. Each partner gets a full persona bible later.

**Caravanserai (Arabic)**

| Who | Level | Texture |
|---|---|---|
| Coffee roaster in Jerusalem's Old City, 50s | ⭐ | Warm, patient, proud of his craft. Talks about coffee, the neighbourhood, his kids. |
| Mechanic in Haifa, 30s | ⭐⭐ | Direct, practical, sarcastic. Talks cars, football, prices. Mixes in Hebrew words. |
| Nurse from Nazareth, 20s | ⭐⭐ | Quick, social, busy shifts, plans for travel. Modern slang. |
| Grandmother in a Galilee village, 70s | ⭐⭐⭐ | Proverbs, heavier rural dialect, stories of the old days. |
| Market trader in Akko | ⭐⭐ | Scenario quests: bargaining, directions, prices. |

**Signal Tower (Morse operators, fictional callsigns)**

| Who | Texture |
|---|---|
| Retired ship's radio officer | Immaculate fist, long ragchews, sea stories |
| Contest operator | Fast and terse ("5NN TU"), no small talk |
| Mountaintop portable operator | Weak signal, QSB, battery running down |
| Fellow newcomer | Slow and error-prone. A confidence builder and future "rival". |

## 7. Social: friendly by design
- No leagues and no demotions.
- **Fellowship** (your friend group): shared quest goals, a party feed ("Adam reached Operator!"), visiting each other's halls, and gifting gear.
- **Challenges** are opt-in and score-based ("beat my callsign run"), with personal bests front and centre.
- **Live Morse QSO between friends** in the Signal Tower: practice with each other, not against each other.

## 8. Answers so far
- Frame: **a mix** of fantasy and modern (see §2).
- Arabic-word rank titles: ✅. Add a **skill rating** alongside the ranks (ADR 0010).
- Questline tone: ✅.

## 9. Original questions
1. **Frame:** fantasy crossroads city with doors to the real world (the radio and the Caravanserai), OK? Or should the whole world be modern-realistic?
2. **City and hub name:** do any of the five catch you?
3. **Ranks:** do you like using real Arabic words as Caravanserai rank titles?
4. **Questline names and tone:** right direction, or more serious, or more humorous?
