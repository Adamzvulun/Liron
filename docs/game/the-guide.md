# The guide: helping a newcomer find their way around

- **Status:** spec, 2026-11-22. Decided with Adam on 2026-11-22 ([ADR 0053](../decisions/0053-a-guide-for-new-players.md)). Built as Phase 6 of [PLAN](../process/PLAN.md) (epic in GitHub).
- **Research:** [new-player-guides.md](../research/new-player-guides.md).
- **Builds on:** the compass and the city errands ([the-road.md](the-road.md) §6–8), the first page, the subject contract ([ADR 0019](../decisions/0019-subject-contract.md)).

## 1. Overview

Waymark has grown into a big world: five places and the Arena on the square, two guild halls with a dozen stations each, six numbers in the top bar, quests, contracts, chests, ranks, a Market, a House and a Fellowship. A friend who arrives through an invite link sees all of it at once, on a phone, and only the compass tells them what to do next. The compass says *what* to do, never *what anything is*.

**The guide** is a new character who lives on the square, not in either guild. They meet the newcomer when they come back from their first lesson, and from then on introduce the city one piece at a time, when each piece becomes useful. A Guidebook holds everything, for whenever the player wants to look something up.

**Adam's decisions (2026-11-22):**

| Question | Answer |
|---|---|
| Form | A guide character plus short tips at the moment of need, plus a Guidebook. No up-front tour. |
| Gating | Nothing is locked. Places are introduced in order, as each becomes useful. |
| Audience | Invited friends first: assume no gaming experience, phone first, short and skippable. |
| Character | A new city character who belongs to the square, so the platform stays neutral between guilds. |

**Success looks like:** a friend who has never seen Waymark, given only the invite link, finishes a first lesson, comes back to the square and can say what the Notice Board, the Market and Your House are for, without asking anyone. Measured once on Adam's next invited friend (§9).

## 2. The character (a proposal; the name, look and voice are Adam's to approve)

- **Who:** the Lamplighter. Every evening they walk the square with a long pole and light the lamps, and they've seen every traveler arrive. They keep the compass in the middle of the square polished. That is why they know where everything is, and why they're always near the compass.
- **Why a lamplighter:** lamps already mean progress in Waymark (the Signal Tower's lamps, a lamp lighting when a step is done). It belongs to both guilds and to neither, and it gives the guide something to do in the painting: the guide is a figure with a pole by the compass, not a floating mascot.
- **Name: Nour** (نور, Arabic for "light"; used for girls and boys). Adam chose it on 2026-11-22 from three Claude offered (Siraj, "lamp"; Nour; Hesper, Greek for "evening star"). Players meet them as "Nour, the lamplighter". The look is Adam's: the blue robe (2026-11-22), and a lantern hung from a crook on a wooden staff, after the first pole read as "a long long candle".
- **Voice:** warm, brief, a little dry. One or two sentences at a time. Never system words ("unlock", "feature", "tap here to"). Says what a place is *for*, in the world's terms: "The Market sells gear for your traveler. Gold buys it; you've earned some." American English (CLAUDE.md).
- **Where they appear:** standing by the compass on the square, a little behind and beside the player (`NOUR_SPOT`). **As built (#406):** drawn like the friends in the square, with the avatar painter and no filters at all, so not part of the touch screen's pictures; that keeps them a button. Tapping Nour brings back the line they were quieted on, or with nothing new, the Guidebook (#412). Their lines appear in a speech card with their small portrait: at the bottom of the screen on a wide screen, and just under the HUD, over the sky, on a phone (2026-11-22: above the dock it hid the Notice Board on a small phone while Nour talked about it). The card never covers the compass line or the thing it talks about.

## 3. What the newcomer meets, in order

### 3.1 The first minutes (unchanged, on purpose)

1. **The first page** (exists): the story card, "Climb the Signal Tower", "Or sit down at the Caravanserai", "Look around the square first".
2. **The first lesson** (exists). The guide says nothing inside a lesson or before the first one: the research is clear that the fun comes first.

### 3.2 The welcome: three lines, back on the square

Shown once, the first time the player is on the square after finishing their first step, or after closing the first page with "Look around the square first". Each line points at one thing, and the thing glows softly while the line is showing:

1. **Who they are, and the compass line.** "Welcome to Waymark. I light the lamps here. This line under the top bar always says what to do next."
2. **The top bar.** "Up top: your level, your gold and gems, and your streak: days in a row you've met your daily goal."
3. **The places.** "Every building is a place you can go into. I'll show you each one when it's useful. And if you ever wonder what something is, ask me: tap me, by the compass." (On a phone, "the buttons at the bottom" too.)

Buttons: **Next** (then **Got it** on the last line) and **Skip**. Skip ends the welcome for good. It never comes back by itself, but the Guidebook has it.

### 3.3 Introductions, one at a time

After the welcome, the guide introduces one thing at a time, the first in this list whose **when** is true and which hasn't been introduced yet. An introduction is one line in the speech card on the square, and the place it names wears a small lamp mark (the **new** mark) on its plaque until the player goes in. **Only one place wears the mark at a time.** Going in introduces the place: its own first-visit card (§3.4) appears inside.

| # | Introduces | When (all known to the app today) | The guide's line (draft) |
|---|---|---|---|
| 1 | The Notice Board | the welcome is done | "The Notice Board has today's quests. Finish them for gold, and a chest now and then." |
| 2 | The Fellowship (in Your House) | the player has a friend (an invited friend has one from the start) | "Your friend is in town. Your House has a door to the Fellowship: see what they're up to." |
| 3 | The Market | gold ≥ the cheapest ware (the errand today) | "You've earned enough for something at the Market. Have a look." |
| 4 | Your House: the wardrobe | the first gear is owned | "New gear goes on in Your House, at the wardrobe." |
| 5 | The other guild hall | one road has 3 steps done and the other none | "The other hall's door is open too, whenever you're curious." |
| 6 | The Arena | the player has a friend and has done 5 steps | "Up at the Arena, friends challenge each other. Yours might be waiting." |
| 7 | The Ledger and trophies (Your House) | ten steps done across the roads (built #410: the square doesn't read ranks, and reading every guild's ranks there would slow it. A first rank can come at the very first step, too early for a ledger worth showing; ten steps is a chosen stand-in, for Adam to change in #413) | "Your House keeps a ledger of how far you've come, and your trophies." |
| 8 | Decorate (Your House) | something for the room is owned (built #445, a stand-in for "owned but not placed": the square doesn't read the room's layout, and what is bought, found or given for the room starts in the tray) | "You have something new for your room. In Your House, tap Decorate and set it wherever you like." |

- The three city errands of the-road.md §7 (chest waiting, gold for the Market, a wardrobe) **become introductions 1, 3 and 4.** The errand lines stop being separate, so the player never hears the same thing twice. A chest waiting after the Notice Board has been introduced is a compass line, as today.
- **As built (#410, 2026-11-22):** the line has one button, **Got it**, which quiets Nour until the player leaves the square; the mark stays until they go in. The welcome counts as Nour's word for its visit, so the first introduction comes on the next one. Going in counts for the introduction that was pending as the player arrived, so walking into Your House for the Fellowship doesn't also count the wardrobe. On a phone the mark is on the place's plaque and its dock button; the Arena's is on its sign.
- The guide waits for a calm moment: an introduction is shown only on the square, never in the same visit as a level-up, a goal-reached card or the first page, and at most one introduction per visit to the square.

### 3.4 First-visit cards, inside each place and station

The first time the player opens a place (the Notice Board, the Market, Your House, the Fellowship, the Arena) or a station in a guild hall, a short card at the top of the screen says what it is for, in two sentences or less, with **Got it**. It doesn't block the screen: the player can use the place with the card still showing, and the first action dismisses it.

- **The platform's places:** the words are core content (`content/core/guide.json`).
- **The guild halls and their stations:** the words belong to each subject (`content/<subject>/guide.json`), handed to the platform through the subject contract, so `src/core/` names no subject. The hall's own first card is said by the guild's character (the innkeeper, the tower's keeper), not by the Lamplighter: inside a hall, the hall speaks.
- **As built (#411, 2026-11-22):** the card sits low on the screen, not at the top, so it never covers the way back. Its first action is any click outside it. The platform's cards are the Notice Board, the Market, Your House (which names the Fellowship's door) and the Arena. The Signal Tower has a card for the hall and for Lessons, Instant Recognition, Sending, the Codebook and the Radio Room; the Caravanserai for the courtyard and its seven stations. Trials, the regulars' chats and the finales explain themselves. A subject passes its words (`content/<subject>/guide.json`, type `guide-card`) to the platform's `FirstVisit`, which remembers through `GuideContext`. The Caravanserai's cards are signed by the innkeeper; the tower has no keeper character yet, so its cards are unsigned (Adam's call, #413).
- **Top-bar items:** the first time the player taps the gold, gems, streak or minutes, the popover they open carries the explanation (most already do: the goal popover, the streak's shields). The Guidebook has the rest.

### 3.5 The Guidebook

- **Opened by:** tapping the Lamplighter on the square, or **Guidebook** in the Settings popover (always reachable, from any screen).
- **What's in it:** a page for each place, each currency and number in the top bar (XP and levels, gold, gems, streak and shields, the daily goal), quests and contracts, chests, ranks and achievements, the Fellowship, the Arena, invites, and a page per guild with its stations. Plus **"Show me around again"**, which replays the welcome.
- **Where the words live:** core pages in `content/core/guide.json`, guild pages in each subject's `guide.json`. Numbers (prices, the streak's 20 gold, shields' price) are read from the code that sets them (`economy.ts`), never typed into the text, so they can't drift.
- **Shape:** a book in the city's style (a ledger-like page on a table), a list of chapters on the left or, on a phone, a list that opens one page at a time. Each page: a title, two to five sentences, and a **Take me there** button when it's a place.
- **As built (#412, 2026-11-22):** at `/guidebook`, on the wood of the Notice Board and Your House. Thirteen pages: Finding your way, a page per guild (its hall, then each station's two sentences, so a new station gets its page with its card), the Notice Board (quests, contracts, chests), the Market, Your House, the Fellowship (invites too), the Arena, XP and levels, gold and gems, the streak and shields, the daily goal, and ranks and achievements. Numbers are written as `{names}` in `content/core/guide.json` and filled from `economy.ts`, the Market's items and the compass (`src/core/guide/numbers.ts`); an unknown name fails the unit test. Settings has a **Guidebook** row with an **Open** button; Settings lives on the square, so the book is a tap away there and one step back from anywhere else. A guild's chapter comes through `SubjectInfo.guidebook`, loaded only when the book opens.

## 4. Saving what has been seen

- **On the account, not the device** (Adam's friends use a phone and a laptop; a guide that greets them twice looks broken): a new `guide_seen text[]` on the player's profile (at most 300 ids), added to only through `guide_mark(ids)`, which appends without losing what another device added, listing the ids of what the guide has said (`welcome`, `intro:board`, `card:market`, `card:tower:listen`, …). The player can only change their own row (the profile's existing policies).
- **Derived where possible:** an introduction whose place the player has already used counts as seen without being saved (an owned item means the Market has been visited; a changed look means the wardrobe has been found). The release's migration saves `welcome` for every player who already has XP, so an *existing* player isn't welcomed; a new player's list starts empty. So **Adam and every current player** don't get a welcome at level 3. Only what can't be known otherwise is saved.
- **If saving fails** (offline, a hiccup), nothing breaks: the line may show once more next visit. Saving never blocks the screen.
- **Reset:** "Show me around again" in the Guidebook replays the welcome and nothing else. Clearing `guide_seen` is a dev-only tool, not a button.

## 5. Functional requirements (EARS)

**The welcome**

- **R1.** When a player who has completed at least one road step, and has no `welcome` in `guide_seen`, arrives on the square, the guide shall show the welcome's first line.
- **R2.** When a player closes the first page with "Look around the square first", the guide shall show the welcome on the square.
- **R3.** While the welcome is showing, the guide shall highlight the one thing its current line names, and nothing else.
- **R4.** When the player presses **Skip** or finishes the last line, the guide shall save `welcome` and not show the welcome again unless the player chooses "Show me around again".
- **R5.** The guide shall not show any line inside a lesson, trial, session, chat or round, or before the player's first road step unless they chose "Look around the square first".

**Introductions**

- **R6.** When the player is on the square and the welcome is done, the guide shall show the first introduction in §3.3 whose condition is true and which is not seen, at most one per visit to the square.
- **R7.** While an introduction is pending, the place it names shall wear the new mark, and no other place shall.
- **R8.** When the player enters a place whose introduction is pending, the guide shall mark that introduction seen and remove the new mark.
- **R9.** If a level-up, a goal-reached card, a chest opening or the first page is showing, then the guide shall wait and show nothing in that visit.
- **R10.** Where an introduction's place has already been used (derived from the player's state), the guide shall treat the introduction as seen without showing it.

**First-visit cards**

- **R11.** When a player opens a place or station for the first time (its card id not in `guide_seen`), the screen shall show its first-visit card.
- **R12.** When the player presses **Got it** or takes any action on the screen, the card shall close and its id shall be saved.
- **R13.** The platform shall get each guild's cards and Guidebook pages through the subject contract, and `src/core/` shall not name a subject.

**The Guidebook**

- **R14.** When the player taps the Lamplighter or chooses **Guidebook** in Settings, the Guidebook shall open on its contents.
- **R15.** The Guidebook shall have a page for every place in `PLACE_PATHS`, every station each subject registers, and every number in the top bar. A unit test shall fail if one is missing or a page names a place or station that doesn't exist.
- **R16.** Where a page shows a price or an amount, the Guidebook shall read it from the code that sets it.
- **R17.** When the player chooses **Take me there**, the app shall go to that place.

## 6. Non-functional requirements

- **Speed:** the guide adds nothing to the square's first paint. Its words load with the square only if a line is due (lazy, like the first page), and the load budget (`tests/e2e/load-budget.spec.ts`: drawn ≤ 3×, back ≤ 2.6×) holds.
- **Phone first:** every line and card fits a 375 px wide screen without scrolling; the speech card never covers the dock or the compass line; the welcome's highlight works when the square pans.
- **Memory on iPhone:** the Lamplighter is drawn without new filters or animated layers on touch screens (the v1.2.x crash, report §4dz–4ec).
- **Accessibility:** the speech card is a live region (`role="status"`), not a modal dialog, so it never traps focus; the welcome's Next/Skip are reachable by keyboard; the highlight doesn't rely on color alone; reduced motion shows no movement; axe passes on the release PR.
- **Privacy and security:** `guide_seen` holds only ids of lines shown, on the player's own profile row; no new data leaves the app; no new service, no cost.
- **Words:** American English, checked by `tests/spelling.test.ts` (it reads `content/`).

## 7. Acceptance criteria

1. **Given** a new invited friend on a phone who has finished the first lesson, **when** they return to the square, **then** the Lamplighter's welcome shows three lines, each highlighting the compass line, the top bar and the places in turn, and **Skip** ends it.
2. **Given** the welcome is done and the player has a friend, **when** they're next on the square, **then** one introduction shows (the Notice Board first), and only the Notice Board's plaque wears the new mark.
3. **Given** the Notice Board's introduction is pending, **when** the player opens the Notice Board, **then** its first-visit card shows at the top, the mark is gone from the square, and neither shows again on another device signed in to the same account.
4. **Given** a level-up card is showing on the square, **when** an introduction is due, **then** nothing from the guide shows until the next visit to the square.
5. **Given** Adam's existing account (level 3, gear owned, steps done), **when** he signs in after the release, **then** he sees no welcome, and no introduction for the Market or the wardrobe.
6. **Given** any screen, **when** the player opens Settings → Guidebook, **then** the contents list every place, both guilds and the top bar's numbers, and **Take me there** on the Market page opens the Market.
7. **Given** the shields' price changes in `economy.ts`, **when** the Guidebook's streak page is shown, **then** it shows the new price with no change to the text.
8. **Given** the profile save fails, **when** the player closes a card, **then** the screen carries on, and the card may show once more next visit.

## 8. Error handling

| Case | What happens |
|---|---|
| `guide_seen` can't be loaded | The guide stays silent this visit (silence is safer than repeating), the Guidebook still opens. |
| Saving `guide_seen` fails | Carry on; retry with the next save; at worst a line repeats once. |
| A content id in `guide_seen` no longer exists | Ignored. |
| A subject registers a station without a card or page | The unit test fails in CI (R15). At runtime the station simply has no card. |
| Storage refused (private browsing) | Irrelevant: nothing is kept in the browser. |
| The square is panned so the highlighted thing is off screen (phone) | The square pans to it first (the stage already pans to a start point). |

## 9. Measuring it

- **Before:** with Adam's next invited friend, or a fresh test account on the dev site, Adam notes where they get stuck or ask "what is this?".
- **After the release:** the same with the guide. The success line in §1 is met when they can name what the Notice Board, the Market and Your House are for, unprompted.
- Claude adds a browser test that walks a fresh account through §3.2–3.4 on the phone project.

## 10. Pre-mortem: how this fails, and what prevents it

Run with `the-fool` (failure modes) on 2026-11-22. Imagine it shipped and a friend still felt lost, or annoyed:

1. **Pop-up fatigue.** The friend sees the first page, then the welcome's three lines, then a hall card, then a station card: six things to close before they've heard a sound, so they close all of them unread. *Prevention:* nothing before the first lesson (R5); the welcome only after it; first-visit cards don't block and close on the first action (R12); at most one introduction per visit (R6).
2. **Everything says "new".** Five plaques and a dozen stations wear a mark on day one, and the mark means nothing, as the six "the road comes here" plaques did on 2026-11-16. *Prevention:* one mark at a time (R7).
3. **The guide talks over a celebration.** A level-up, a goal reached and an introduction stack on a phone, and focus traps fight. *Prevention:* the guide yields (R9), and it is a status card, never a modal (§6).
4. **The Guidebook lies.** A price or a rule changes and the page still says the old one. *Prevention:* numbers come from code (R16); a test checks that every place and station has a page and no page is orphaned (R15).
5. **Adam is greeted like a stranger.** The release ships and every existing player at level 3 gets the welcome and seven introductions. *Prevention:* derived seen-state (R10, acceptance 5).
6. **The iPhone crashes again.** The Lamplighter adds filtered shapes to the square. *Prevention:* drawn into the touch-screen pictures, no new layers (§6); the phone test that counts filters stays.

## 11. Implementation checklist (the issues, under epic #405)

1. **#406** Design the Lamplighter: name (Adam picks from three), look, where they stand; painted into the square; screenshots on phone and desktop.
2. **#407** `guide_seen` on the profile: migration, store, RLS and isolation tests, the derived seen-state.
3. **#408** One voice at a time: a small queue for the first page, level-up, goal reached, chests and the guide, so only one speaks at once.
4. **#409** The speech card and the welcome (§3.2), with the highlight and the square's pan.
5. **#410** Introductions and the new mark (§3.3), replacing the city errands.
6. **#411** First-visit cards (§3.4): core places, then the subject contract's cards for both halls and their stations.
7. **#412** The Guidebook (§3.5): pages, the completeness test, numbers from code, "Take me there", "Show me around again".
8. **#413** Words: every line in content, American English, reviewed by Adam.
9. **#414** Test with a newcomer and release (§9): the phone walk-through test, the speed budget, axe, release notes.
