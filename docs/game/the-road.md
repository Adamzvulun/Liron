# The Road: one linear story for each guild

- **Status:** design, decided (2026-11-16). Written by Claude as manager for [PLAN](../process/PLAN.md) task 1.2 (#310). It is the spec for tasks 1.3 (#311) and 1.4 (#312), and it fixes the story for 4.1 (#333) and 4.2 (#334). Nothing here is built yet.
- **Adam's ask (2026-11-16):** "a complete storyline, so the user always knows where to go. There is always pointers to what to do next, and the user doesn't feel lost… the story is progressional and linear."
- **Checked against the code, not the docs:** `content/*/questline.json`, `content/*/ranks.json`, `src/subjects/*/ranks.ts`, both halls' station lists, and every unlock function (`wordsOpen`, `rushOpen`, `lampOpen`, `watchOpen`, `farOpen`, `roomOpen`, `regularsToTalkTo`).

## 1. The idea in five rules

1. **A road is an ordered list of steps.** Each guild has one. Steps are grouped into chapters, so the player sees "Chapter 3 of 10 · step 4 of 11".
2. **A step is a fact about your saved progress, never a pointer.** Each step has a check, `done(progress)`, that reads what the game already saves ("at least one sending drill", "the Gatekeeper is passed"). **Where you are on the road is the first step whose check is false.** Nothing new is saved to mark the place.
3. **The compass shows one thing to do now.** It is the first step that is not done, is open by the game's own rules, and is not waiting. If the road is waiting (tomorrow's second pass, a spent allowance, a service that is off), the compass says so and names one thing to do meanwhile (§6).
4. **Nothing is locked that is open today.** The road orders; it doesn't forbid. A player who wanders into a station early simply finds that step already done when the road gets there.
5. **Every station, trial and rank is a step exactly once.** After its step a station stays open as practice, and the daily contracts keep pointing at it.

**Why rule 2 matters (don't change it):** a saved "current step" could disagree with real progress, would need a migration for every player, and would break whenever the road is edited. A list of checks can't go out of step, works for an existing player the day it ships, and makes "exactly one next step" true by construction. The cost is one constraint: **a check must never go from true back to false.** Use counters that only grow, lists that only gain, and ranks taken. Never use a value that can fall: the lesson streak, the last drill's speed (`sending.ditMs`; use `sending.fastest`), a rating.

## 2. What exists today

### The Signal Tower

| Thing | Opens when (code) | Recorded as |
|---|---|---|
| Koch lessons, 41 characters in 5 chapters | from the start, K and M first | `unlocked`, `runs` |
| Five chapter trials (Gatekeeper, Warden, Keeper of the Lens, Storm Front, Beacon's Answer) | the chapter's lamps are all lit | `trials` |
| Instant Recognition | from the start | `recognition.rounds`, `.best` |
| Sending drills | from the start | `sending.drills`, `.fastest` |
| Codebook (whole words) | Gatekeeper passed (`wordsOpen`) | `words.rounds`, `.best` |
| The four prosigns, in the Codebook | with the Codebook | `prosigns` |
| Callsign rush, in the Codebook | the first digit, 5, is unlocked (`rushOpen`) | `rush.runs`, `.topWpm` |
| The Lamp Signal (sending trial) | all 41 characters (`lampOpen`) | `rankTrials` |
| The Night Watch (head-copy trial) | all 41 characters (`watchOpen`) | `rankTrials` |
| The Far Station (first contact, a trial) | Lamp Signal passed (`farOpen`) | `rankTrials` |
| The Radio Room (six operators, opening at 0, 0, 0, 3, 6 and 10 contacts) | Far Station passed (`roomOpen`) | `radio.contacts`, `.cleanFast` |
| Ranks: Initiate, Listener, Keyer, Operator, Telegraphist, Signal Master, Ghost of the Ether | each rank's conditions, in ladder order | `ranks` |

### The Caravanserai

| Thing | Opens when (code) | Recorded as |
|---|---|---|
| Script lessons 1–8 at the scribe's table (pass: 90% twice, the second on a later day) | from the start | `lesson`, `done`, `sessions` |
| The fountain (listen only) | from the start | **nothing** (break 5) |
| The storyteller (read only) | from the start | **nothing** (break 5) |
| The slate (write letters) | from the start | `written` |
| Coffee corner, 9 phrase sets in order | from the start | `phraseSet`, `phrasesMet` |
| The echo well, 8 sound pairs in order | from the start | `echo.heard`, `.rounds` |
| Shadowing, at the echo well | from the start | `echo.shadowed` |
| The Painted Sign (trial) | all 8 lessons passed | `guest` |
| The innkeeper's table: 113 word chapters, 30 words each (same pass rule) | guest (`wordsOpen`) | `words.chapter`, `.met`, `.sessions` |
| 113 regulars' trials | that word chapter passed | `words.trials` |
| Sit and talk | guest; with your road's regular and every regular whose trial you passed | `chat.chats`, `.best`, `.met` |
| Ranks: Stranger, Guest, Traveler, Neighbor, Friend, Local, Storyteller | each rank's conditions, in ladder order | `ranks` |

## 3. The breaks, and the fix for each

| # | Break | Fix (decided) |
|---|---|---|
| 1 | **The Beacon's story stops at chapter 5, but half the guild comes after it.** The chapter 5 outro says "The radio room door swings open", yet the Radio Room is locked until two more trials, and five ranks have no story at all. | Write chapters 6–10 of The Silent Beacon (§4). They carry sending, the Far Station, the Night Watch, the Radio Room and the last two ranks. No rule changes. The outro stays as written: chapter 6 opens in that open doorway. |
| 2 | **Keyer asks for 20 sending drills, and nothing asks for one before that.** A player who followed only the story would meet a wall of 20 drills at once. | One sending step in each of chapters 1–5, with a growing total: 1, 4, 8, 12, 16. Chapter 6 asks for the last four. |
| 3 | The Lamp Signal and the Night Watch open at the same moment; the ladder puts two ranks between them. | The road orders them (Lamp Signal in chapter 6, Night Watch in chapter 8). Neither is locked. A trial the road hasn't reached says "The road comes here at step N". |
| 4 | Signal Master needs a contact at 25 wpm. Only one operator sends that fast, and they open at 10 contacts. | Chapter 9 has steps at 3, 6 and 10 contacts before the 25 wpm step. |
| 5 | **The fountain and the storyteller leave no record**, so a first visit can't be a step. | Add two counters to the Arabic state, `only.listen` and `only.read` (sessions finished in each mode; default 0). This is the only new saved data in this design. |
| 6 | **A script lesson or word chapter can't be passed in one day.** If the first step were "pass lesson 1", a new player would end day one with nothing ticked. | The first step of each is "your first session". The pass is its own step, and on the day it can't be finished the road is *waiting* (§6). |
| 7 | **Chat steps need the AI service**, which may be off on a site or spent for the day. | Each step may name what it `needs` (`partner`, `deck`). A step whose need isn't available is *waiting*, with an honest reason, and the compass moves on (§6). The same rule serves friends without the deck (task 2.1). |
| 8 | **Chapters 13–114 of the Long Road are two steps each**, with a forced day between them. | On that day the compass's "meanwhile" is a talk with that chapter's regular (§6). Rank steps mark the long stretch at chapters 35, 68 and 100. "Chapter N of 115" is always visible. |
| 9 | Neither story ends. | A finale chapter for each (§4, §5), built in Phase 4. Until then the last step's beat says the road goes on. |
| 10 | The city's own places (Notice Board, Market, Your House) are on no road. | Three city errands (§7): prompts, not steps. |
| 11 | Stations say "Locked · pass the Gatekeeper". | They say which step opens them: "Opens at step 10 · The Gatekeeper". |

## 4. The Silent Beacon (Signal Tower): 10 chapters, 75 steps

Reading the table: **Where** is the hall door the compass opens. **Done when** is the check. Lamp steps are named for their character; their beats are the lamp texts already in `questline.json`. Texts marked *new* are written below the table.

### Chapter 1: Embers

| # | Step | Where | Done when |
|---|---|---|---|
| 1 | The First Two Sounds | Lessons | `runs ≥ 1` |
| 2 | Lamp U | Lessons | `unlocked ≥ 3` |
| 3 | Lamp R | Lessons | `unlocked ≥ 4` |
| 4 | The Warm Key *(new)* | Sending | `sending.drills ≥ 1` |
| 5 | Lamp E | Lessons | `unlocked ≥ 5` |
| 6 | Before the Lamp Fades *(new)* | Instant Recognition | `recognition.rounds ≥ 1` |
| 7–9 | Lamps S, N, A | Lessons | `unlocked ≥ 6, 7, 8` |
| 10 | Trial: The Gatekeeper | Trial | `trials` has 1 |

### Chapter 2: The Upper Stair

| # | Step | Where | Done when |
|---|---|---|---|
| 11 | The Logbook's Words *(new)* | Codebook | `words.rounds ≥ 1` |
| 12–15 | Lamps P, T, L, W | Lessons | `unlocked ≥ 9 … 12` |
| 16 | A Steadier Hand *(new)* | Sending | `sending.drills ≥ 4` |
| 17–20 | Lamps I, full stop, J, Z | Lessons | `unlocked ≥ 13 … 16` |
| 21 | Trial: The Warden of the Stair | Trial | `trials` has 2 |

### Chapter 3: The Lantern Room

| # | Step | Where | Done when |
|---|---|---|---|
| 22–25 | Lamps =, F, O, Y | Lessons | `unlocked ≥ 17 … 20` |
| 26 | The Operator's Chair *(new)* | Sending | `sending.drills ≥ 8` |
| 27–30 | Lamps comma, V, G, 5 | Lessons | `unlocked ≥ 21 … 24` |
| 31 | The List of Stations *(new)* | Codebook, callsign rush | `rush.runs ≥ 1` |
| 32 | Trial: The Keeper of the Lens | Trial | `trials` has 3 |

### Chapter 4: The Far Voice

| # | Step | Where | Done when |
|---|---|---|---|
| 33–36 | Lamps /, Q, 9, 2 | Lessons | `unlocked ≥ 25 … 28` |
| 37 | Nine Minutes Past *(new)* | Sending | `sending.drills ≥ 12` |
| 38–41 | Lamps H, 3, 8, B | Lessons | `unlocked ≥ 29 … 32` |
| 42 | Trial: The Storm Front | Trial | `trials` has 4 |

### Chapter 5: The Beacon Speaks

| # | Step | Where | Done when |
|---|---|---|---|
| 43–46 | Lamps ?, 4, 7, C | Lessons | `unlocked ≥ 33 … 36` |
| 47 | One More Night *(new)* | Sending | `sending.drills ≥ 16` |
| 48–52 | Lamps 1, D, 6, 0, X | Lessons | `unlocked ≥ 37 … 41` |
| 53 | Trial: The Beacon's Answer | Trial | `trials` has 5 |
| 54 | Rank: Listener *(new line)* | the hall | `ranks` has `listener` |

### Chapter 6: A Hand for the Key *(new chapter)*

| # | Step | Where | Done when |
|---|---|---|---|
| 55 | Twenty Messages | Sending | `sending.drills ≥ 20` |
| 56 | Fifteen Words a Minute | Sending | `sending.fastest ≤ 80` ms |
| 57 | Trial: The Lamp Signal | Sending | `rankTrials` has `lamp-signal` |
| 58 | Rank: Keyer | the hall | `ranks` has `keyer` |

### Chapter 7: The Far Station *(new chapter)*

| # | Step | Where | Done when |
|---|---|---|---|
| 59 | The Four Signs | Codebook | every prosign in `prosigns` |
| 60 | Trial: The Far Station | Radio Room | `rankTrials` has `far-station` |
| 61 | Rank: Operator | the hall | `ranks` has `operator` |
| 62 | A Call of Your Own | Radio Room | your station is set up (`stationOf(radio)`) |
| 63 | First on the Air | Radio Room | `radio.contacts ≥ 1` |

### Chapter 8: The Night Watch *(new chapter)*

| # | Step | Where | Done when |
|---|---|---|---|
| 64 | Words by Ear | Codebook | `words.rounds ≥ 10` |
| 65 | Trial: The Night Watch | Codebook | `rankTrials` has `night-watch` |
| 66 | Rank: Telegraphist | the hall | `ranks` has `telegraphist` |

### Chapter 9: On the Air *(new chapter)*

| # | Step | Where | Done when |
|---|---|---|---|
| 67 | Three in the Log | Radio Room | `radio.contacts ≥ 3` |
| 68 | Six in the Log | Radio Room | `radio.contacts ≥ 6` |
| 69 | Ten in the Log | Radio Room | `radio.contacts ≥ 10` |
| 70 | No Repeats | Radio Room | `radio.cleanFast` |
| 71 | Rank: Signal Master | the hall | `ranks` has `signal-master` |

### Chapter 10: Ghost of the Ether *(new chapter)*

| # | Step | Where | Done when |
|---|---|---|---|
| 72 | Thirty by Ear | Codebook, callsign rush | `rush.topWpm ≥ 30` |
| 73 | Thirty by Hand | Sending | `sending.fastest ≤ 40` ms |
| 74 | Rank: Ghost of the Ether | the hall | `ranks` has `ghost` |
| 75 | Finale: Forty Winters *(Phase 4, tasks 4.2 and 4.3)* | Radio Room | the capstone is passed |

### The new text for The Silent Beacon

The story the existing lamps already tell, and that these chapters finish: **the Guildmaster was the tower's last operator.** On the night the beacon failed she wrote "I will answer tomorrow" in the logbook and never did. The far voice is the keeper of the station across the water, who has called at nine minutes past every night for forty winters. The two letters it sends are her initials. The clues are already in the lamps: the key on the sill "warm, as if someone had only just set it down" (lamp R), "the Guildmaster climbs up to see for herself, and stays longer than she meant to" (lamp G), the two cups of tea (lamp 6). She can hear it. She has never been able to make herself answer. The player answers first; in the finale, she does.

**Steps in chapters 1–5.** Each has an *invite* (what the compass says) and a *beat* (shown when it's done).

| Step | Invite | Beat |
|---|---|---|
| 1 The First Two Sounds | Hear your first two sounds, K and M. | *(the chapter intro, as now)* |
| 4 The Warm Key | Key your first letters on the brass key. | The brass key is warm under your fingers. You press, and far below a relay clicks in answer. The Guildmaster, passing with her ledger, stops for the length of one letter. |
| 6 Before the Lamp Fades | Name each letter before its lamp fades. | A lamp flares, you name it, and it holds a moment longer. “Good,” says the Guildmaster. “Don’t count the sounds. Know them.” |
| 11 The Logbook’s Words | Copy whole words in the Codebook. | Past the gate stands a shelf of codebooks, swollen with damp. The first page you open is a list of short words, each ticked in the last operator’s hand. You tick the first one yourself. |
| 16 A Steadier Hand | Key 4 sending drills in all. | Your dits have stopped tripping over your dahs. The relay below keeps time with you now. |
| 26 The Operator’s Chair | Key 8 sending drills in all. | You sit in the last operator’s chair to key. This time it doesn’t creak. |
| 31 The List of Stations | Copy callsigns in the callsign rush. | You read the crossed-out list aloud, call by call, as fast as you can copy them. One call near the bottom was never crossed out. |
| 37 Nine Minutes Past | Key 12 sending drills in all. | At nine minutes past you key the tower’s call into the dark, though nothing is connected yet. The Guildmaster pretends not to hear. |
| 47 One More Night | Key 16 sending drills in all. | Sixteen messages keyed. Under the logbook’s last entry, you write tonight’s date in your own hand. |
| 54 Rank: Listener | Take your rank in the hall. | The Guildmaster hangs a pair of ear cups on your peg. “Listener. You hear what the tower hears.” |

**Chapter 6: A Hand for the Key.**
- *Intro:* The radio room stands open, and the far voice is clear in the headset: a callsign, a question mark, a pause. It is waiting for an answer. The Guildmaster stands in the doorway and doesn’t come in. “You can hear it. So could I. Hearing was never the hard part.” She nods at the brass key. “Show me your hand first.”
- *55 Twenty Messages* · Key 20 sending drills in all. · Twenty messages keyed. Your hand has stopped thinking about it.
- *56 Fifteen Words a Minute* · Key a drill at 15 wpm or faster. · Fifteen words a minute, and clean. The relay below sounds like rain on a tin roof.
- *57 The Lamp Signal* · the trial's text, as now.
- *58 Rank: Keyer* · The Guildmaster sets the brass key in your palm and closes your fingers over it. “Keyer. It was mine once. It’s better off working.”
- *Outro:* From the lantern room the lamp spells your signal across the water, and the square below reads it letter by letter.

**Chapter 7: The Far Station.**
- *Intro:* Every night at nine minutes past, the far voice calls. An answer on the air has its manners: who is calling, who is answering, when a thought ends, when the talk is over. The codebook keeps four signs for that. “Learn them,” says the Guildmaster, “and then answer it. Somebody should.”
- *59 The Four Signs* · Copy all four prosigns in the Codebook. · Four signs: a message ends, a contact ends, a breath, an invitation. Now you can hold a door open on the air, and close it.
- *60 The Far Station* · the trial's text, as now. · *Beat:* The far voice gives its report, its name and its town as if no time had passed at all. You send your thanks and 73. It signs off, and for the first time in forty winters the logbook has a finished entry.
- *61 Rank: Operator* · The Guildmaster reads your entry twice, then holds the coat out by its shoulders. “Operator. It asked for the tower and it got you. That’ll do.”
- *62 A Call of Your Own* · Set up your station in the Radio Room. · Your own call goes up on the wall, under a row of calls nobody has used in years.
- *63 First on the Air* · Answer a call in the Radio Room. · A stranger answers you, gives you a report and a name, and wishes you 73. The band is full of people. It always was.
- *Outro:* The Guildmaster stayed in the doorway through the whole contact. When the far voice signed off she said, mostly to herself, “It still sends the old way.”

**Chapter 8: The Night Watch.**
- *Intro:* Operators on the night watch don’t write. They listen with their hands in their pockets and know what was said. The Guildmaster stood the watch once. “I wrote everything down, that last night,” she says. “Every letter. I was so busy writing that I never answered.”
- *64 Words by Ear* · Copy 10 Codebook rounds in all. · The words have stopped arriving as letters. They arrive whole, like faces.
- *65 The Night Watch* · the trial's text, as now.
- *66 Rank: Telegraphist* · She lights the night lantern and hands it to you. “Telegraphist. The watch is yours. I’m going to sleep through one, for once.”
- *Outro:* You stand the watch with your hands in your pockets. At nine minutes past, the far voice sends its two letters, and this time you know them without thinking. They are the Guildmaster’s initials.

**Chapter 9: On the Air.**
- *Intro:* The band is busy at night. Operators on three coasts have heard that the tower is back, and each wants it in their log. The far voice is among them, patient, and faster than the rest. To hold a contact at its speed, you’ll have to keep up with everyone else first.
- *67 Three in the Log* · Log 3 contacts in all. · Three contacts. A new station has heard about you and starts calling.
- *68 Six in the Log* · Log 6 contacts in all. · Six contacts. An operator who sends like a metronome puts out a call for the tower by name.
- *69 Ten in the Log* · Log 10 contacts in all. · Ten contacts. Someone comes on at twenty-five words a minute and doesn’t slow down for anybody.
- *70 No Repeats* · Log a contact at 25 wpm with no AGN, no QRS and no resend. · Twenty-five words a minute from start to finish, and you asked for nothing twice. Before signing off, the other station adds two letters: FB. Fine business.
- *71 Rank: Signal Master* · The Guildmaster sets the cap on your head herself. “Signal Master. There were four of us when I was young. Now there’s you.”
- *Outro:* That night the far voice changes its call. It no longer asks for the tower. It asks for you.

**Chapter 10: Ghost of the Ether.**
- *Intro:* There is a speed past which code stops being sound and becomes meaning, the way a sentence in your own language does. The old operators called anyone who worked there a ghost: on the air they were only ever a rhythm, never seen. The far voice works at that speed when it thinks nobody is listening. The Guildmaster knows, because she used to work there with it.
- *72 Thirty by Ear* · Copy a call at 30 wpm in the callsign rush. · A callsign goes by at thirty words a minute, and you have it before it ends.
- *73 Thirty by Hand* · Key a drill at 30 wpm or faster. · Thirty words a minute off your own key. The relay below can’t keep up; it hums instead.
- *74 Rank: Ghost of the Ether* · No ceremony. One evening the cloak is on your peg, gray as static, with a note in the Guildmaster’s hand: “Ghost of the Ether. Don’t let it go to your head. Nobody can see you.”
- *Until the finale is built, step 74's beat ends:* “The far voice is still calling. One night soon, it won’t be for you.”

**Step 75, the finale: Forty Winters** (Phase 4).
- *The trial (this is the Morse capstone of task 4.3):* at nine minutes past, the far voice sends a message, not a report: plain words, sent once, at 20 wpm. The player copies it in their head (no typing while it plays) and then answers three questions about what it said. Then they key a reply of about 25 characters, and the decoder must read it cleanly at 15 wpm or faster. Write at least six messages as content, so a retry isn't a memory test. An example of the voice: `I KEPT THE HOUR FORTY WINTERS = THE LIGHT IS BACK ON MY SIDE TOO = IS SHE THERE ?` and the reply to key: `SHE IS HERE = WAIT`.
- *The finale screen:* the lantern room at night, two beacons answering each other across the water, the Guildmaster in the operator's chair with her hand on the key.
- *Epilogue:* She sends two letters, her own. The far voice answers with two of its own. Then both of them slow down, for your sake, and make room on the frequency. “Well?” she says, without turning around. “The band’s open. Somebody will be calling.”
- *Reward:* the title **Keeper of the Beacon** and a piece of gear earned no other way (a lens pendant, `beacon-lens`). The epilogue's last line is the door into the daily loop (§6): the Radio Room has someone calling every day.

## 5. The Long Road In (Caravanserai): 115 chapters, 275 steps

### Chapter 1: The Stranger at the Gate

Lesson letters, for the slate steps: lesson 1 ا ب ت ن ي · 2 ث ر ز و · 3 د ذ ل م · 4 س ش ك · 5 ج ح خ ه ة · 6 ع غ ف ق · 7 ص ض ط ظ · 8 ء ى (the slate teaches single letters only, `SLATE_IDS`).

| # | Step | Where | Done when |
|---|---|---|---|
| 1 | A Few Letters | Scribe's table | `sessions ≥ 1` |
| 2 | At the Door *(new)* | Coffee corner | `phraseSet > 1` |
| 3 | The Slate *(new)* | Slate | every lesson 1 letter in `written` |
| 4 | Milestone 1 | Scribe's table | lesson 1 passed (`lesson > 1` or `done`) |
| 5 | The Fountain *(new)* | Fountain | `only.listen ≥ 1` |
| 6 | Milestone 2 | Scribe's table | lesson 2 passed |
| 7 | Please and Thanks *(new)* | Coffee corner | `phraseSet > 2` |
| 8 | The Storyteller *(new)* | Storyteller | `only.read ≥ 1` |
| 9 | Milestone 3 | Scribe's table | lesson 3 passed |
| 10 | A Line of Letters *(new)* | Slate | every letter of lessons 1–3 in `written` |
| 11 | Milestone 4 | Scribe's table | lesson 4 passed |
| 12 | Counting *(new)* | Coffee corner | `phraseSet > 3` |
| 13 | Milestone 5 | Scribe's table | lesson 5 passed |
| 14 | The Echo Well *(new)* | Echo well | pair 1 (ḥ or h) in `echo.heard` |
| 15 | Milestone 6 | Scribe's table | lesson 6 passed |
| 16 | A Catch in the Throat *(new)* | Echo well | pair 2 (ʿayn) heard |
| 17 | Two Lines of Letters *(new)* | Slate | every letter of lessons 1–6 in `written` |
| 18 | Milestone 7 | Scribe's table | lesson 7 passed |
| 19 | Two Rough Sounds *(new)* | Echo well | pair 3 (kh or ḥ) heard |
| 20 | Milestone 8 | Scribe's table | `done` |
| 21 | The Whole Slate *(new)* | Slate | every `SLATE_IDS` letter in `written` |
| 22 | Deeper Still *(new)* | Echo well | pair 4 (gh or kh) heard |
| 23 | Trial: The Painted Sign | Trial | `guest` |
| 24 | Rank: Guest | the hall | `ranks` has `guest` |

Day one for a new player is steps 1–3: a first lesson, a first greeting, a first five letters in chalk. Step 4 then waits for tomorrow, which is the right place to stop.

### Chapters 2–12: the first eleven regulars

In every chapter the two core steps are **Pass “⟨word chapter title⟩”** at the innkeeper's table (`words.chapter >` that chapter, or `words.done`) and **Trial: ⟨the regular's trial⟩** (`words.trials` has the road chapter number). The table lists what each chapter adds, in order.

| Ch | Regular | Steps, in order |
|---|---|---|
| 2 | Salim | **The Innkeeper's Table** *(new; `words.sessions ≥ 1`)* · **Sit with Salim** *(new; `chat.chats ≥ 1`; needs `partner`)* · Pass · Trial |
| 3 | Umm Khalil | **Questions** *(coffee corner; `phraseSet > 4`)* · Pass · Trial |
| 4 | Yusuf | **At the Shop** *(`phraseSet > 5`)* · **The Heavy S** *(echo well; pair 5 heard)* · Pass · Trial |
| 5 | Rana | **Getting to Know You** *(`phraseSet > 6`)* · **The Heavy D** *(pair 6)* · Pass · Trial |
| 6 | Abu Fadi | **At the Coffee Corner** *(`phraseSet > 7`)* · **The Heavy T** *(pair 7)* · Pass · Trial |
| 7 | Nasser | **Which Way** *(`phraseSet > 8`)* · **Three Ways to Say It** *(pair 8, g or k)* · Pass · Trial |
| 8 | Leila | **Today and Tomorrow** *(`phraseSet > 9`)* · Pass · Trial |
| 9 | Hassan | **In Hassan's Voice** *(echo well, shadowing; `echo.shadowed ≥ 5`)* · Pass · Trial |
| 10 | Miss Huda | Pass · Trial |
| 11 | Jamil | Pass · Trial: The Poet's Evening · **Rank: Traveler** |
| 12 | Samira | **Three Lines** *(`chat.best ≥ 3`; needs `partner`)* · **Rank: Neighbor** · Pass · Trial |

By the end of chapter 11 every Traveler condition has been a step: ten word chapters, all nine phrase sets, the whole slate, the Poet's Evening.

### Chapters 13–114: the long road

Each chapter is **Pass** then **Trial**, as above. Three chapters carry more:

| After the trial of | Steps added | Done when |
|---|---|---|
| Chapter 35 (word chapter 34: 1,020 words) | **A Thousand Words** · **Twenty Evenings** *(needs `partner`)* · **Rank: Friend** | `words.met ≥ 1000` · `chat.chats ≥ 20` · rank |
| Chapter 68 (word chapter 67: 2,010 words) | **Two Thousand Words** · **A Whole Evening** *(needs `partner`)* · **Rank: Local** | `words.met ≥ 2000` · `chat.best ≥ 8` · rank |
| Chapter 100 | **Five Old Friends** *(needs `partner`)* · **Rank: Storyteller** | five regulars with 5 chats each · rank |

The chats those ranks count come from the meanwhile rule (§6): on the waiting day of every chapter, the compass offers a talk with that chapter's regular. A player who takes about two of every three offers has twenty chats by chapter 35.

### Chapter 115, the finale: The Stranger at the Gate (Phase 4)

It carries the first chapter's title on purpose.

- *Intro:* Dusk, and dust on someone’s boots. A stranger stands at the gate, looks up at the words painted over the arch, and can’t read them. The innkeeper has her hands in the dough. She looks at you.
- *The trial, “Your Story” (this is the Arabic capstone of task 4.3), in three parts:* read a page of the innkeeper's guest book in script (a short text built from words the player has met); write the stranger's name on the slate; then tell the table the story of your own road. The last part is a longer conversation at the inn, where the regulars ask and the player tells, judged against the written rubric of 4.3 (understood, answered, kept going). It needs `partner`. It can't judge pronunciation, and says so.
- *The finale screen:* the full table at night, every regular's keepsake in its place (Salim's cup, Nasser's map, Leila's portrait over the table), the stranger on the bench, the guest book open.
- *Epilogue:* You say what was said to you. “You can’t read the signs on the road? Then sit. Every traveler starts with a few letters.” The innkeeper opens her book to a clean page and, this time, hands you the pen.
- *Reward:* the title **Keeper of the Table** and gear earned no other way (the innkeeper's pen, `guest-book-pen`). The door into the daily loop: the table is never empty, and someone always wants to talk.
- *Until the finale is built, chapter 114's last beat ends:* “The innkeeper keeps one page of her book empty. She won’t say who it’s for.”

### The new text for The Long Road In

| Step | Invite | Beat |
|---|---|---|
| 1 A Few Letters | Sit at the scribe’s table for your first letters. | *(the chapter intro, as now)* |
| 2 At the Door | Learn the greetings at the coffee corner. | The innkeeper pours a cup you didn’t ask for. “Before letters, manners. Nobody walks past a door here without a word.” You say it back, badly. She pours anyway. |
| 3 The Slate | Write your first five letters on the slate. | The scribe wipes the slate with his sleeve and hands you the chalk. Your ب has its dot in the wrong place. He moves it with one finger and says nothing. |
| 5 The Fountain | Listen at the fountain: which letter did you hear? | The children by the fountain shout letters at each other like a game. You catch one, then another. They start shouting them at you. |
| 7 Please and Thanks | Learn please and thanks at the coffee corner. | The cook hands you a plate, and this time you have the word for it. She pretends to be shocked. |
| 8 The Storyteller | Read short words with the storyteller. | The storyteller holds up a card with one short word on it and waits. He has all evening. You read it. He holds up another. |
| 10 A Line of Letters | Write every letter of lessons 1 to 3 on the slate. | A whole line across the slate, with no help. The scribe turns it around to show the boy with the rice, who is not impressed. |
| 12 Counting | Learn to count at the coffee corner. | The innkeeper counts the cups on the tray out loud, slowly, for your benefit. You count them back. |
| 14 The Echo Well | Hear the difference at the echo well: ḥ or h. | The cook leans over the well and calls a word down it. It comes back twice, once from the throat and once from the chest. Now you can tell which is which. |
| 16 A Catch in the Throat | At the echo well: ʿayn, or only a catch? | ع is the letter that makes the well ring. You have stopped hearing it as a pause and started hearing it as a letter. |
| 17 Two Lines of Letters | Write every letter of lessons 1 to 6 on the slate. | Two lines now. The scribe has started saving you the good chalk. |
| 19 Two Rough Sounds | At the echo well: kh or ḥ. | One of them scrapes and one of them breathes. The old man by the fountain says both for you until you stop guessing. |
| 21 The Whole Slate | Write every letter on the slate. | Every letter of the script, from memory, in your own hand. The scribe doesn’t wipe it off. He leans the slate against the wall where people can see it. |
| 22 Deeper Still | At the echo well: gh or kh. | The last pair before the gate. The well gives them back one after the other, and you name each before the echo fades. |
| 24 Rank: Guest | Take your rank in the courtyard. | The house sash goes over your shoulder. ضيف: guest. People move over on the bench without being asked. |
| Ch 2 · The Innkeeper’s Table | Sit at the innkeeper’s table for your first words. | The innkeeper clears a place at her own table. “Letters are for signs,” she says. “Words are for people. Sit.” |
| Ch 2 · Sit with Salim | Sit and talk with Salim. | Salim asks where you’re from and waits for the answer, however long it takes. It takes a while. He has time, and tea. |
| Ch 3 · Questions | Learn to ask questions at the coffee corner. | Umm Khalil’s questions come faster than you can answer them. At the coffee corner you learn to ask a few of your own. |
| Ch 4 · At the Shop | Learn the shop’s phrases at the coffee corner. | Yusuf needs lamp oil before the shop closes. He sends you, with the right words and the exact coins. |
| Ch 4 · The Heavy S | At the echo well: heavy ṣ or s. | Yusuf taps two gears together. One rings and one thuds. “ص,” he says, of the thud. |
| Ch 5 · Getting to Know You | Learn to say who you are at the coffee corner. | Rana wants to know everything about you before the bread is out of the oven. |
| Ch 5 · The Heavy D | At the echo well: heavy ḍ or d. | Rana drops a full sack of flour and then an empty one. “Hear it? ض is the full one.” |
| Ch 6 · At the Coffee Corner | Learn to order at the coffee corner. | Abu Fadi takes his coffee without sugar and expects you to order it right. |
| Ch 6 · The Heavy T | At the echo well: heavy ṭ or t. | Abu Fadi knocks on plaster, then on stone. “ط,” he says, with his knuckles on the stone. |
| Ch 7 · Which Way | Learn to ask the way at the coffee corner. | Nasser won’t point. He makes you ask. |
| Ch 7 · Three Ways to Say It | At the echo well: g or k. | Nasser says ق three ways in one sentence, to show off. You catch all three. |
| Ch 8 · Today and Tomorrow | Learn today and tomorrow at the coffee corner. | Leila will finish the portrait tomorrow, she says. Or the day after. You learn the words for both. |
| Ch 9 · In Hassan’s Voice | Shadow 5 sentences at the echo well. | Hassan says a whole sentence and has you say it along with him, on top of him, the way he learned to sell. By the fifth one, the well can’t tell you apart. |
| Ch 11 · Rank: Traveler | Take your rank in the courtyard. | The innkeeper ties the keffiyeh herself. مسافر: traveler. “You could leave tomorrow and get by,” she says. “Don’t.” |
| Ch 12 · Three Lines | Say three lines to a regular at the inn. | You say three things to Samira in a row, and she answers each one as if it were ordinary. It is. |
| Ch 12 · Rank: Neighbor | Take your rank in the courtyard. | A sprig of olive for your collar. جار: neighbor. The night watchman stops asking who you are. |
| Ch 35 · A Thousand Words | Meet 1,000 words on the word path. | A thousand words. You stopped counting some time ago. The innkeeper didn’t. |
| Ch 35 · Twenty Evenings | Have 20 chats at the inn. | Twenty evenings of talk at this table. Somebody has started saving your seat. |
| Ch 35 · Rank: Friend | Take your rank in the courtyard. | The innkeeper sets a small brass coffee pot at your place. صاحب: friend. You pour for the others now. |
| Ch 68 · Two Thousand Words | Meet 2,000 words on the word path. | Two thousand words. The boy with the rice, who is not a boy anymore, asks you what one of them means. |
| Ch 68 · A Whole Evening | Talk a whole chat through: all 8 of your lines. | You talk a whole evening through and don’t notice until the lamp needs oil. |
| Ch 68 · Rank: Local | Take your rank in the courtyard. | The embroidered vest has been on someone’s needle since the week you came. ابن البلد: one of ours. |
| Ch 100 · Five Old Friends | Become an old friend of 5 regulars. | Five people at this table would notice if you missed an evening. Two of them would come looking. |
| Ch 100 · Rank: Storyteller | Take your rank in the courtyard. | The old storyteller takes off his cloak and puts it around your shoulders. حكواتي. “I’ve told all of mine,” he says. “Yours they haven’t heard.” |

Word-chapter steps use the text that exists: the regular's intro is the invite's story, the three milestones are the beats along the way, and the outro is the trial's beat.

## 6. The compass: what to do *now*

### Inside one guild

```
position(guild)  = the first step with done == false          (where you are; "step 14 of 75")
compass(guild)   = the first step with done == false,
                   open == true, and waiting == null          (what to do now)
```

- **open** is the game's own rule for that door today (`wordsOpen`, `farOpen` and the rest). The road never opens or closes anything itself.
- **waiting** is a reason and, when known, a time. There are exactly four reasons:

| Reason | True when | The compass says |
|---|---|---|
| Tomorrow | a lesson or word chapter has one good session today and needs its second on a later day (`streak ≥ 1` and `passDay` is today) | “The road goes on tomorrow: ⟨step⟩.” |
| Spent | the step needs `partner` and today's allowance is used up | “The regulars have talked enough for one day. Tomorrow: ⟨step⟩.” |
| Not on this site | the step needs a service the site has no key for (task 1.8's answer) | “Nobody is at the table on this site yet.” The road goes on past it. |
| Not for this player | the step needs `deck` and the player is not a licensee (task 2.1) | The step is left out of this player's road and its count. |

- If a step is waiting, the compass moves to the next step that is open and not waiting. In practice that happens only for chat steps, because everything after a lesson's second pass is closed until the pass. The waiting step stays visible above the compass as a quiet line, so the player knows the road hasn't forgotten it.
- **If no step qualifies** (the road is waiting, or finished), the compass shows the **meanwhile**. It is the first of these that exists:
  1. **Reviews due** in this guild (the count is already known) → the station that reviews them.
  2. **Sit with your regular** (Caravanserai only, when the road waits on a word chapter and `partner` is available and unspent) → Sit and talk, with that chapter's regular.
  3. **An unpaid contract** of this guild today → its station.
  4. **The station of the day**: one open practice station, chosen by the date so it is the same all day and different tomorrow (hash of the local date and the guild, over the list of open stations that have something to do; never the same station two days running).
- The meanwhile is always worded as time well spent, never as filler: “Tonight: sit with Samira while the words settle.” “Tonight: the fountain.”
- **A finished road uses the same meanwhile.** That is the whole daily loop of task 4.1: the function already exists by then, and 4.1 adds harder contracts and personal bests for it to point at.

### Across the city

The two roads stay independent ([ADR 0003](../decisions/0003-hub-of-independent-subjects.md)). The platform only asks each subject for its compass through the subject contract ([ADR 0019](../decisions/0019-subject-contract.md)) and never reads a road itself.

1. **A new player** (no step done on any road) sees the first page (§8) and then the first step of the first subject in the registry. The Signal Tower is first: its first step, two sounds, is finished in one sitting of three minutes.
2. **Otherwise the main line is the guild you practiced last** (the subject whose state was saved most recently). If that guild's compass is a real step, show it.
3. **If that guild is waiting or finished** and the other guild has a real step, the other guild's step becomes the main line, and the first guild's meanwhile is the second line.
4. **The second line is always the other guild.** If the player has never started it, it shows that guild's first step in a quieter voice (“Also in town: the Caravanserai, your first letters”).
5. With three or more subjects (task 4.5), the same rule holds: the last-practiced guild first, the others after it in order of last practice.

### Where the compass is shown

- **The square.** One line, visible without opening anything, on phone and desktop: the guild's color, the step's invite, and a tap that goes straight to the door (not to the hall). On desktop it is the first entry of the Quests panel, and it *replaces* the two main-questline lines there (don't show the same thing twice). On a phone it sits under the top bar, one line tall, and the second line is behind a small "2".
- **Each hall.** The station that holds the compass step is marked on the painting (the same flicker the next lamp has) and its card is first in the list below. The scroll shows "Chapter N of M · step x of y" and the step's invite. Tapping the count opens **the road so far**: every finished step of this guild with its beat, newest first, then the next three steps by title, then “and N more”. This is where the tale can be reread, and where a beat is found if its step was done early.
- **The end of every session, trial and round.** The first button is “Next: ⟨invite⟩” and goes to the compass step's door. If the session finished a step, the step's title and beat are shown above it. The second button is “Again”. A text link goes back to the hall. If the compass step is the screen the player is on (the next lamp, the next word session), the first button starts it.
- **The Notice Board.** The main-questline notes use the same words as the compass.
- **Stations not yet reached** say “Opens at step N · ⟨step title⟩”. Stations that are open but ahead of the road say “The road comes here at step N”.

### Words

- An invite is one imperative sentence a stranger would understand: “Key your first letters on the brass key.” Never a system word (“unlock”, “gate”, “node”).
- Lamp steps: title “Lamp U”, invite “Light the next lamp: learn U.”
- Word-chapter steps: invite “Pass “Hello, me and you” at the innkeeper’s table.” Trial steps: “Face the Carter’s Roll Call.”
- Rank steps are ceremonies. Their invite is “Take your rank in the hall.” The rank-up card that exists shows the rank's beat.

## 7. City errands

Three prompts introduce the city's own places. They are not road steps and never take the main line; each appears as the compass's last line while its condition holds, and never again once done.

| Errand | Shown when | Gone when |
|---|---|---|
| “A chest is waiting at the Notice Board.” | a chest is unopened (the HUD already knows) | no chest is waiting |
| “You have gold. The Market is open.” | gold ≥ the cheapest ware, and nothing was ever bought | the first purchase |
| “Your House has a wardrobe.” | the first gear is owned (a rank's gear or a purchase) and the avatar was never changed | the avatar is saved once |

## 8. The first page

Shown before the square to a player with no step done on any road. It closes for good with the first finished step, so it needs no saved flag. It can also be closed, and then it is not shown again on that device.

> **Waymark**
>
> A city grown up around a crossroads, where travelers come to learn the arts that carry a voice across distance.
>
> Two guild halls keep their doors open tonight. The Signal Tower’s beacon has been dark for forty winters, and its guild needs someone who can hear. At the Caravanserai, the road from the Levant ends at a table, and there is room on the bench.
>
> You came with nothing but time. The city asks for a little of it each day.

Buttons: **Climb the Signal Tower** (goes straight to step 1, the first lesson) and, quieter, **Or sit down at the Caravanserai**. The text is core content (`content/core/`), and the two buttons are built from the subjects' registry entries, so the platform still names no subject.

## 9. For the builder (task 1.3)

**Data.** One `content/<subject>/road.json` per guild: the ordered steps, each with an `id`, its chapter, a `kind` (`lesson`, `visit`, `practice`, `trial`, `rank`, `finale`), a title, an invite, a beat, the door it opens, and what it `needs`, if anything. Don't write 204 near-identical steps by hand: the Long Road's chapter steps and the Beacon's lamp steps are generated from `questline.json` by the loader, and `road.json` holds the chapters' extra steps and where each goes (before or after which core step). The new chapters 6–10 go into `content/morse/questline.json` in the shape chapters 1–5 have, with `letters` empty.

**Checks.** A table in each subject, `id → (progress) => boolean`, with patterns for the generated families (`lamp:<n>`, `pass:<chapter>`, `trial:<chapter>`). The checks are code; the words are content.

**The contract.** Each subject exposes `road(state, today, services)`, which returns its position, its compass (a step, or a meanwhile) and any waiting line. The platform's city rule (§6) works on those answers alone. `src/core/` must not learn a subject's name.

**Tests that must exist** (they are the "Done when" of 1.3, made exact):

1. *Every step has a check, and every check has a step.*
2. *The walk.* Starting from new progress, apply the smallest change that makes step 1 true, then step 2, to the end. At every point `position` is that step and exactly one step is the position.
3. *Never backwards.* For each recorded field a check reads, raising it never turns a done step into an undone one; and for a set of realistic saved states (new, mid-chapter, all lamps and no trials, everything done), every step before the position is done.
4. *Out of order.* A player who has done later things first (20 sending drills and no lamps) has position step 1 and those later steps already done.
5. *Each waiting reason* gives the wording in §6 and the right meanwhile, with a fixed date.
6. *The meanwhile is never empty* for a finished road on 30 consecutive dates, and never the same station twice running.
7. *Every door a step names exists* in the hall's door list.
8. *Counts.* The Silent Beacon has 75 steps in 10 chapters and The Long Road In has 275 in 115 (74 and 274 until the finales are built). If content changes the count, this test is updated on purpose, in the same commit.
9. *Browser:* a new account reaches its first lesson in two taps; every result screen's first button lands on the compass step's door; at 320 pixels the compass line doesn't wrap past two lines; it is reachable by keyboard and announced as a navigation landmark.

**What not to build:** no saved road position; no locking of anything open today; no per-step rewards (XP and gold stay where they are; a step is direction, not payment); no map screen beyond "the road so far".
