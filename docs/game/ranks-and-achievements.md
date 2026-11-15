# Ranks, trials and achievements (E13)

- **Status:** design, written 2026-11-09 night while Adam slept (he said to make the calls he'd make). Every "my call" below is easy to change.
- **Epic:** [#151](https://github.com/Adamzvulun/Liron/issues/151). **Decision:** [ADR 0035](../decisions/0035-ranks-and-achievements.md).
- **Inputs:** the guild ranks in [world and lore §3](../discovery/04-world-and-lore.md#3-the-guilds), the quest types in §5, [quests and rewards](quests-and-rewards.md), and the [economy](economy.md) ("achievements and boss challenges paying gems — later epics").

## 1. What a rank is
A rank is a title in a guild that says what you can really do. Your level says how much you've practiced; your rank says what you've mastered. Each rank has:
- **conditions:** the mastery it stands for, checked against your saved progress;
- **a trial** that gates it: a boss fight that tests the rank's skill once more, as the Gatekeeper does;
- **rank gear:** one piece that can only be earned, never bought (§4).

Ranks are a ladder: you take them in order. A rank's conditions are shown before you have them, with your progress toward each one, so the next step is always clear.

## 2. The Signal Tower's ranks
| Rank | Conditions | Gate | Buildable now? |
|---|---|---|---|
| Initiate | Join | none | ✅ (built) |
| Listener | All 41 Koch characters (26 letters, 10 digits and the punctuation) | The Beacon's Answer, the Silent Beacon's chapter V trial (#147) | ✅ |
| Keyer | 20 sending drills, and a dit of 80 ms or shorter (15 wpm or faster) | **New trial: "The Lamp Signal"**. Send 10 common words with the straight key. The decoder must read at least 9 of them, at 15 wpm or faster | ✅ |
| Operator | Listener and Keyer, the prosigns, and a first QSO | **New trial: "The Far Station"**, a scripted QSO with the tower's distant station | Later in E13 (it needs the QSO trial) |
| Telegraphist | Head copy of common words at 20 wpm | **New trial: "The Night Watch"**: copy 20 common words at 20 wpm, at least 18 right | After Operator |
| Signal Master | A QSO at 25 wpm with no repeats | Log a Radio Room contact at 25 wpm (Dex) with no AGN, no QRS and no resend ([radio QSO](radio-qso.md) §5) | ✅ (E16, 2026-11-10) |
| Ghost of the Ether | 30+ wpm head copy (a call copied right at 30 wpm in the callsign rush) and sending (a drill with a dit of 40 ms or less) | — | ✅ (2026-11-15; Adam: open it now the Radio Room has live operators) |

- **Listener (my call):** the lore says "all 26 letters via Koch at ≥90%". In Koch order the last letter (X) is the 41st character, so the 26 letters finish with the whole course. The chapter V trial already tests all of them at 90%, so it is the gate, and no new trial is needed.
- **Operator's QSO (my call):** the lore asks for a first full QSO, a conversation with another operator. Real partners come in M5. Until then the gate is a **scripted QSO with "the Far Station"**, a character the Silent Beacon already names. It plays a short, real-format exchange (CQ, callsigns, RST, name, QTH, 73). You copy its parts and send your own answers. A first QSO with a real person becomes an achievement in M5. It isn't dropped.

## 3. The Caravanserai's ranks
| Rank | Conditions | Gate | Buildable now? |
|---|---|---|---|
| غريب Gharīb, Stranger | Join | none | ✅ (built) |
| ضيف Ḍēf, Guest | Read the whole script | The Painted Sign | ✅ (built) |
| مسافر Msāfer, Traveler | 300 words (word chapters 1–10 passed), every survival phrase set, and every letter written from memory on the slate | The Poet's Evening, the last regular's trial (#161) | ✅ |
| جار Jār, Neighbor | A first real chat at the inn: at least 3 of your lines | — | ✅ (2026-11-15) |
| صاحب Ṣāḥeb, Friend | 1,000 words met + 20 chats at the inn | — | ✅ (2026-11-15) |
| ابن البلد Local | 2,000 words met + a whole chat (all 8 of your lines) | — | ✅ (2026-11-15) |
| حكواتي Storyteller | An old friend (5 chats) of 5 regulars | — | ✅ (2026-11-15) |

- **The ranks after Traveler, at the inn (Adam, 2026-11-15, "map them to the inn"):** the partners these ranks waited for are the regulars (E17). The numbers live in `src/subjects/arabic/ranks.ts` and mirror the inn's: 3 lines earn a chat its XP, 8 is a whole chat, 5 chats make an old friend. Progress keeps `chat.best`, the most of your lines in one chat; chats before 2026-11-15 count as 0 there, so Neighbor needs one new chat. No rank gear for them yet (like Signal Master).

- **Traveler's gate (my call):** the regulars' trials (#161) end with Jamil the poet at chapter 10 = word 300. His trial is the natural boss fight for Traveler, so no new trial is needed.
- **Writing by hand:** the slate saves each passed letter in a new list in your progress (`written`), so the rank can count it. The slate's check is rough, so a letter counts the first time you pass it from memory; it is never taken away.

## 4. Rank gear
One piece for each rank you can reach now, painted like the other gear (`src/player/avatar/paint.ts`). It is never sold in the Market or dropped by chests:

| Rank | Gear (my call) | Slot |
|---|---|---|
| Listener | Brass ear-cups on a leather band | head |
| Keyer | The keyer's brass straight key, held on its wooden base | hand |
| Operator | The tower's blue operator coat, with a gold spark on the breast | torso |
| Telegraphist | Night-watch lantern | hand |
| Guest | The house's embroidered sash, knotted at the hip | torso |
| Traveler | A traveler's keffiyeh | head |

There is no waist slot, so the key is carried in the hand and the sash is worn on the torso (my call: a new slot would mean a new avatar layer for two pieces). The headset that Morse level 5 already gives stays as it is. Rank gear is a new kind of milestone (`rank`), so the database gives it the same way it gives the milestone items (ADR 0033).

## 5. Achievements and titles
Long-tail goals that sit beside the main path. Each achievement:
- is a row of data in `content/core/achievements.json`;
- is checked by the database from what it already records: streak days, contracts done, trials passed, chests opened, level, minutes and subject events. The browser can't award one;
- pays **gems**, 1 to 5, the economy's long-planned gem source;
- some unlock a **title**, which you can wear under your name in the HUD and choose in Your House.

The first set (my call; about 20 to start):

| Achievement | Condition | Gems | Title |
|---|---|---|---|
| First Light | Pass your first trial | 1 | |
| Week of Embers | A 7-day streak | 1 | |
| The Long Burn | A 30-day streak | 3 | the Steadfast |
| Hundred Days | A 100-day streak | 5 | the Unbroken |
| Contractor | 10 daily contracts | 1 | |
| Notice Board Regular | 100 daily contracts | 3 | the Reliable |
| Full Board | All 3 contracts in one day, 10 times | 2 | |
| Chest Hunter | Open 10 chests | 1 | |
| Two Guilds | Practice both subjects on one day | 1 | |
| Polyglot of the Crossing | Reach level 5 in both subjects | 2 | the Wayfarer |
| Beacon Relit | Pass all five Silent Beacon trials | 3 | Keeper of the Beacon |
| No AGN | A Codebook round with no AGN and all 10 right | 2 | |
| Overspeed | Copy a callsign at 30 wpm in the rush | 2 | the Quick-Eared |
| A Seat at the Table | Pass the first ten regulars' trials (II–XI) | 3 | Friend of the House |
| Night Owl / Early Bird | Practice after 22:00 / before 7:00 your time, 5 times | 1 each | |
| Thousand Minutes | 1,000 minutes of practice | 3 | the Diligent |
| Known at the Inn | Sit and talk with 10 different regulars (E17, ADR 0038) | 3 | the Well-Spoken |

- Achievements that need things not built yet ("first joke understood in Arabic", "first real QSO") come with those features. They aren't dropped.
- **Hidden ones (my call):** none at first. Every achievement shows its condition, so there are no surprises that read as unfair.

## 6. Skill rating beside the rank (ADR 0010, 0024)
The hall shows your **rating** in each skill next to your rank (Glicko-2, already recorded): "Listener · copy 1,240". A rank says what you've done; the rating says how well you do it now. It's read-only, so it needs no new data.

## 7. Where it shows
- **The hall:** the rank plaque (the Tower's lamp board, the Caravanserai's banner) shows the rank, the next rank, its conditions as a checklist, and the gate trial's door when the conditions are met.
- **The rank-up moment:** a full card when you take a rank: the title (in Arabic and English for the Caravanserai), the gear you've earned, and what the next rank asks.
- **The questline tracker (#47):** the rank line moves to the rank system.
- **Your House:** achievements as a wall of plaques (done and not yet done), and the title picker.

## 8. Tasks
1. Ranks as data and the rank ladder in both halls (Listener, Traveler, the `written` list, rank events). — [#174](https://github.com/Adamzvulun/Liron/issues/174). Built: `content/*/ranks.json`, `src/core/ranks/`, the rank-up card, and migration `20261115000000_rank_events.sql`. A rank waiting on a later feature carries a `later` line and can't be taken.
2. The Lamp Signal trial and the Keyer rank. — [#175](https://github.com/Adamzvulun/Liron/issues/175). Built: `src/subjects/morse/send/lampSignal.ts`, the trial in the sending station (`?open=lamp`), the `rankTrials` list and migration `20261116000000_lamp_signal.sql`. It opens once all 41 characters are learned; words are scored in order, so a split word costs only itself. A first pass gives 50 XP and `trial-lamp-signal` (no chest; the Keyer's gear comes with #176).
3. Rank gear: 6 painted pieces and the `rank` milestone. — [#176](https://github.com/Adamzvulun/Liron/issues/176). Built: the items `ear-cups`, `brass-key`, `operator-coat`, `night-lantern`, `house-sash` and `keffiyeh`, each rank's `gear` in `ranks.json`, the gear line on the rank-up card, and migration `20261117000000_rank_gear.sql` (`grant_milestones` gives them; `market_stock` and `open_chest` leave them out).
4. Achievements, gems and titles. — [#177](https://github.com/Adamzvulun/Liron/issues/177). Built: `content/core/achievements.json` (the 17 in §5), migration `20261118000000_achievements.sql` (`achievements`, `player_achievements`, `achievement_count`, `grant_achievements` called from `grant_milestones`, `my_achievements`, `set_title`, and the rush's new `rush-30` event), the wall of plaques and the title picker in Your House, and the worn title in the HUD. Each plaque shows its progress (e.g. 4 / 10 chests). Night Owl counts nights between 22:00 and 04:00, Early Bird days between 04:00 and 07:00, both in your time zone (my call: a night that runs past midnight counts once). A streak achievement, once earned, stays earned when the streak breaks. The old unused `profiles.title` default ('Traveller') becomes '' (none: the HUD then shows the level's title).
5. The Far Station (scripted QSO) and the Operator rank. — [#178](https://github.com/Adamzvulun/Liron/issues/178). Built: `src/subjects/morse/qso/` (rules and screen), the Radio Room door (`?open=far`), the `prosigns` list and migration `20261120000000_far_station.sql`. It opens once the Lamp Signal is passed. Five turns at 20 wpm: copy the CQ's call, key your answer, copy RST, name and QTH, key your thanks, and name the closing prosign (SK). One AGN per hearing; a keyed turn the station can't read gets one AGN?. A pass needs every part right: 60 XP and `trial-far-station` (no chest). Operator's other condition: all four prosigns copied right in the Codebook. Callsigns, names and towns are made up per contact.
6. The Night Watch trial and the Telegraphist rank. — [#179](https://github.com/Adamzvulun/Liron/issues/179). Built: `src/subjects/morse/words/nightWatch.ts`, the trial in the Codebook (`?open=watch`) and migration `20261119000000_night_watch.sql`. Twenty of the 100 commonest words at a full 20 wpm, each heard once with no AGN; 18 right passes. It opens once all 41 characters are learned. A first pass gives 60 XP and `trial-night-watch` (no chest). The Telegraphist rank itself still waits on Operator, because ranks are taken in order and Operator needs the Far Station (#178).
7. Skill rating beside the rank. — [#180](https://github.com/Adamzvulun/Liron/issues/180). Built: the tower already showed Receive and Send under the rank; the courtyard now shows Read and Listen on the banner and the standing card (a `?` marks a rating that is still provisional, under 30 results). Ratings read as "1,240".
