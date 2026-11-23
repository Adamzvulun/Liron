# Versions: what ships when

- **Written:** 2026-11-16, by Claude as manager, at Adam's request: "divide all the work into versions… so we can know which version to release, what it should contain, when it is considered done."
- **How this fits with [PLAN.md](PLAN.md):** the plan says *how* each task is done and when a task is finished. This file says **which release each task ships in, and in what order the releases come**. Where the two disagree about order, this file wins. The numbering rule is [ADR 0040](../decisions/0040-versions-on-a-map.md).

## How to read a version number

| Part | Means | Example |
|---|---|---|
| **X.0** | A new chapter of Waymark: something new in kind. | 1.0 the solo game · 2.0 friends · 3.0 the endings · 4.0 a third guild |
| **X.Y** | A planned release inside that chapter: a couple of features, useful on their own. | 1.1 the ledger |
| **X.Y.Z** | A fix to the live site. Not planned here; made when needed. | 1.0.1 |

## The map

| Version | Name | In one line | Plan tasks | Waits on Adam for |
|---|---|---|---|---|
| **1.0** | The Crossing | The solo game, released. A player is never lost and no screen is blue. | 1.1–1.5, 1.7–1.13 | His checklist walk; the Production keys; the merge |
| **1.1** | The Ledger | You can see what you've learned, and Adam can run the site without Claude. | 1.6, 4.7 | A 10-minute look |
| **1.2** | A Living City | The city has sound, small motion, and events that come with the calendar. | 4.6, 4.4 | A 10-minute look, with sound on |
| **2.0** | The Fellowship | A friend can join safely, be added by code, and be visited. | 2.1–2.4, 3.1, 3.2 | What friends without the deck may learn; a first friend |
| **2.1** | Word in the Square | Friends' milestones on the Notice Board, and friends standing in the square. | 3.3 | A look with a friend |
| **2.2** | The Arena | Friendly challenges, and the Arena opens. | 3.4 | A challenge played with a friend |
| **2.3** | Together | Shared weekly goals, and gifts. | 3.5 | A gift sent to a friend |
| **2.4** | Key to Key | Two friends key Morse to each other live. | 3.6 | A live try with a friend, two devices |
| **3.0** | Journey's End | Both stories end, the learner goals can be passed, and a finished player still has a day worth opening. | 4.2, 4.3, 4.1 | The usual checklist; see the note on reaching the endings |
| **4.0** | A Third Guild | The way to add a subject is written, and a third hall stands. Then the last sweep: Waymark is done. | 4.5, 5.1, 5.2 | The choice of subject |

That is ten releases. `v0.1.0` (the scaffold on the live site today) is the only release before them.

**Parked work has no number yet.** When Adam un-parks an item, it becomes the next free minor of whatever chapter is current (for example, the regulars' voices after a yes on Azure would ship as "The Regulars Speak", 1.3 or 2.5 depending on the day). The parked list is in PLAN.md.

## Why this order

- **1.x before 2.0:** the ledger, sound and events make every day better for the one player Waymark has now, and they are small. Friends then join a city that already feels alive.
- **The endings after the Fellowship:** nobody can reach them soon. The Long Road has 113 word chapters and each needs two days, so its ending is most of a year of daily play away. The Beacon's last rank asks for 30 words a minute. Friends are wanted sooner than that.
- **The third guild last:** it needs Adam's choice of subject, and it is the test of everything before it. If he picks early, the *guide* (the first half of task 4.5) can be written any time; the hall itself still ships as 4.0.
- **One change from the plan as first written:** the ledger (task 1.6) moved from 1.0 to 1.1. It is the one large Phase 1 task that nothing else in 1.0 depends on, and moving it brings the first real release closer. The road shows "step 14 of 75" from 1.0, so progress is visible from day one.

## Each version: what it contains and when it's done

A version is **done** when everything in its list is true *and* the release steps at the end of this file are finished.

### 1.0 — The Crossing

**1.0.0 now ships everything on `dev`, 1.1 to 3.0 included** ([ADR 0049](../decisions/0049-one-zero-ships-what-dev-holds.md), 2026-11-17). Adam hadn't walked 1.0 yet when the rest was built, and a cut at 1.0's last commit would have shipped code older than what he walks on the dev site. The sections for 1.1 to 3.0 below stay as the record of what each part had to do. Their gates that need a friend move from "before releasing" to "before inviting a friend".

**Already built and waiting on `dev` (it all ships here):** the city and its five places; the avatar, wardrobe, pets and the Market; XP, levels, gold, chests, the streak and its shields; daily contracts; ranks and achievements. The Signal Tower: 41 Koch lessons, five trials, Instant Recognition, sending, the Codebook, the callsign rush, three rank trials and the Radio Room with six operators. The Caravanserai: the script, the slate, the fountain, the storyteller, the echo well and shadowing, nine phrase sets, 113 word chapters each with a regular, a trial and a grammar card, and Sit and talk with the Coach.

**Added for this release:**
- The work in flight is landed (1.1).
- The Road and the compass: one linear story in each guild, the next step always on screen, five new Beacon chapters, a first page (1.2, 1.3, 1.4).
- No blue backgrounds (1.5).
- A speed budget (1.7), the "Services" line (1.8), the weekly keep-alive (1.9), release docs (1.10), a last review (1.11).

**Done when:** a new player on a phone follows the compass for ten minutes without help; no route shows the navy ground; Adam has walked the release checklist (1.12) and every problem he found is fixed or filed with his agreement; `Release v1.0.0` is merged and he has signed in on the live site (1.13).

### 1.1 — The Ledger

- The ledger in Your House: letters, words met and known, reviews due, characters, copy and sending speed, days practiced, and where you are on each road (1.6).
- The keeper's handbook, `RUNNING.md`, with a monthly reminder (4.7).
- Whatever Adam's first weeks on the live site turn up.

**Done when:** Your House shows honest numbers for a new player and an advanced one, each defined and tested; every procedure in the handbook has been followed once or is marked untested.

### 1.2 — A Living City

- Sound made in the browser, small motion that answers the player, and a switch for each (4.6).
- World events from a calendar file: the square dressed for a week, a themed contract set, an event chest (4.4).

**Done when:** every sound can be switched off and stays off; nothing plays before the first tap; reduced motion is respected; an event starts and ends by the clock with no deploy; the speed budget holds.

### 2.0 — The Fellowship

- What a friend without the deck may learn, and a road they can walk (2.1). **Adam's decision.**
- Fair shares of the free AI (2.2). Sign-in for someone who isn't Adam, with "Change your password" and `FRIENDS.md` (2.3). Two players, one database (2.4).
- Friend codes and the Fellowship list (3.1). Visiting a friend's house (3.2).

**Done when:** the tests of [fellowship-build.md](../game/fellowship-build.md) §6 pass, the three-player test among them; a non-licensee walks the Caravanserai with no dead end; Adam has created a friend's account from `FRIENDS.md`, and the two of them have linked by code and visited each other's house on the live site.

### 2.1 — Word in the Square

- The party feed on the Notice Board, written by the database, with a switch to stop sharing your own milestones. Friends' avatars in the square (3.3).

**Done when:** the feed shows friends' milestones and nothing private; the square stays inside the speed budget with five friends; a player with no friends sees nothing social.

### 2.2 — The Arena

- Challenges on a callsign rush and a word round, with no loser screen. The Arena is painted and opens (3.4).

**Done when:** a challenge can be sent, played, answered, declined and left to expire, each tested; scores are checked by the database; the "locked" sign is gone.

### 2.3 — Together

- Weekly co-op goals on the contract machinery. Gifts from the Market, paid in the giver's gold (3.5).

**Done when:** every member's real events count once; rewards are paid once; a gift can't make gold or duplicate an item.

### 2.4 — Key to Key

- The Supabase Realtime ADR, then live Morse between two friends in the Signal Tower (3.6).

**Done when:** two browser windows in one test key to each other and decode it; a dropped link says so and ends cleanly; only the two friends can join; **and Adam has tried it with a friend on two devices**, because Realtime itself can't be tested here. Before that try, Adam switches off "Allow public access" in Supabase's Realtime settings ([ADR 0046](../decisions/0046-the-wire.md), RUNNING.md).

### 3.0 — Journey's End

- Both finales, with their screens, titles and gear (4.2), written in [the-road.md](../game/the-road.md).
- The capstones, which are the finales' trials: a head-copied message and a keyed reply; a read page, a written name and a told story (4.3). The ledger shows the distance to each.
- The long evenings: harder contracts and personal bests for a finished player (4.1).

**Done when:** both roads have a tested last step; the judge's eval set is run and recorded; a finished player's compass names something worthwhile on 30 days running.

**Reaching the endings to check them:** Adam can't play a year in an afternoon. The release checklist for 3.0 uses a prepared test account on the dev site whose progress stands one step before each finale (made by a script that writes saved state, on the dev database only). The script is `scripts/endings.ts`: `node scripts/endings.ts <the account's email> > endings.sql`, then paste it into the dev project's SQL editor.

### 4.0 — A Third Guild

- `ADDING-A-SUBJECT.md`, and a third hall with one playable chapter built using only that guide (4.5). **Adam picks the subject.**
- The last sweep over everything (5.1) and `LATER.md`, the list of what stays open on purpose (5.2).

**Done when:** nothing in `src/core/` had to learn the new subject's name; STATUS says the project is done, with what lives where and how to run it.

## The release steps, the same every time

1. Every task of the version is merged into `dev`, with its issue closed and its box ticked in PLAN.md.
2. The full local checks pass on `dev` (HANDOFF lists them), and CI on `dev` is green with a job log that checks out.
3. `package.json` carries the version. `docs/process/releases/vX.Y.0.md` says what a player gets, in plain words. `tests/version.test.ts` fails until the version matches the newest notes.
4. **A release branch, `release/vX.Y.0`, is cut from `dev` at that commit**, and the release PR goes from it into `main`. This is new (ADR 0040). It lets work on the next version go on in `dev` while Adam takes his time, without that work slipping into the release.
5. **Adam's part:** for an X.0, the release checklist (about 45 minutes; extended for what's new). For an X.Y, a short list of the new things only (about 10 minutes). Then he merges the release PR, watches the DB migrate run on `main` go green, signs in on the live site, and creates the tag and its GitHub Release.
6. Problems he finds before merging are fixed on `dev` and brought to the release branch. Problems found after are X.Y.Z fixes: into `main` through a small PR, then merged back into `dev`.
7. STATUS, ROADMAP and this file's map are updated: the version is marked released, with its date.

**While a release waits for Adam, the builder starts the next version.** Never wait idle, and never merge into `main`.

## Where things stand

| Version | State |
|---|---|
| 0.1.0 | Replaced by 1.0.0 |
| 1.0 | **Live: v1.0.0** (merged 2026-11-17, #359; the database migrated 2026-11-18 through v1.0.1, #360), carrying 1.1 to 3.0 too (ADR 0049). Adam's checklist walk (1.12) was skipped at his word ("You do that") and can still be done on the live site |
| 1.1 | Built (the ledger, the handbook); ships in 1.0.0 (ADR 0049) |
| 1.2 | Built (sound, motion, world events); ships in 1.0.0 (ADR 0049) |
| 2.0 | Built; ships in 1.0.0 (ADR 0049). 2.1 is decided (friends get the deck, [ADR 0050](../decisions/0050-friends-learn-from-the-deck.md)) and its build is the next release, **v1.1.0** (below). Then Adam's part: a first friend |
| 2.1 | Built (the feed, friends in the square); ships in 1.0.0, shows once a friend is invited |
| 2.2 | Built (challenges, the Arena); ships in 1.0.0, shows once a friend is invited |
| 2.3 | Built (Fellowship quests, gifts); ships in 1.0.0, shows once a friend is invited |
| 2.4 | Built (the wire); ships in 1.0.0. Waits on Adam's Realtime setting (DEPLOY step 7) and a try on two devices |
| 3.0 | Built (both finales and capstones, the long evenings, the prepared account); ships in 1.0.0. Adam looks at one ending in the checklist (§6) |
| 4.0 | Partly built: the guide (4.5's first half), LATER.md (5.2) and the last sweep (5.1). **The third hall is parked** (Adam, 2026-11-18: "third subject won't come soon"); it is in LATER.md |

### Next: v1.1.0 — Open to Friends

The next release, per ADR 0049 §5 (a 1.Y after 1.0.0). It carries:

1. **Friends read the deck** (task 2.1, [ADR 0050](../decisions/0050-friends-learn-from-the-deck.md)): every account is a licensee, with tests; FRIENDS.md and SUPABASE.md updated; no dead end for an account without a licence.
2. **Everything for 3.7 (Release the Fellowship) that Claude can do:** the two lows from the [v1 review](reviews/2026-11-17-v1-review.md) left for 2.1, FRIENDS.md walked against the code, Adam's steps for the first friend written as one short list.
3. **Whatever Adam reports from the live site** (1.0.x fixes).

**Done when:** the above is merged into `dev` with green CI; the release PR `release/v1.1.0` → `main` is open with its notes; Adam merges it and makes a first friend's account.

**Built (2026-11-18):** all three, in `dev` ([release notes](releases/v1.1.0.md), HANDOFF item 114). **Released 2026-11-19** (#371), merged by Claude at Adam's word.

### After it: v1.1.1 — Fixes from the code reviews

Everything merged into `dev` since `release/v1.1.0` was cut: the 2026-11-19 reviews' fixes, the sign-in screens and axe on releases. Draft notes: [releases/v1.1.1.md](releases/v1.1.1.md). Released 2026-11-19 right after v1.1.0, merged by Claude at Adam's word ("Go ahead and merge both").

### v1.2.0 — Invite links

Adam sends a link from Settings; the friend makes their own account and is his friend at once ([ADR 0052](../decisions/0052-invite-links.md)). With the join page naming who sent it and a preview card for chat apps. Notes: [releases/v1.2.0.md](releases/v1.2.0.md). Released 2026-11-21 ([#395](https://github.com/Adamzvulun/Liron/pull/395)), merged by Claude at Adam's word.

### v1.2.1 — The square on an iPhone

Right after v1.2.0, Adam signed in on his iPhone and Safari crashed as the square opened ("A problem repeatedly occurred"); the Signal Tower opened fine. The fix drops the square's hover layers on touch screens. Notes: [releases/v1.2.1.md](releases/v1.2.1.md). Released 2026-11-21 ([#400](https://github.com/Adamzvulun/Liron/pull/400)). It only got halfway: the square then crashed a second after it showed.

### v1.2.2 — The square holds still on a touch screen

On a touch screen the square's pieces don't move, so Safari draws it as one picture. Notes: [releases/v1.2.2.md](releases/v1.2.2.md). Released 2026-11-21 ([#402](https://github.com/Adamzvulun/Liron/pull/402)). It still reloaded on the iPhone.

### v1.2.3 — The square as pictures on a touch screen

The painting's ~100 filtered shapes become a few SVG images on a touch screen, filtered once each. Notes: [releases/v1.2.3.md](releases/v1.2.3.md).

### v1.3.0 — Nour, the guide for new players

Phase 6 (epic #405, [ADR 0053](../decisions/0053-a-guide-for-new-players.md)): Nour the lamplighter welcomes a newcomer in three lines, introduces one place at a time, each place and station says what it's for on a first visit, and the Guidebook explains every place and number. Notes: [releases/v1.3.0.md](releases/v1.3.0.md). Released 2026-11-22 ([#421](https://github.com/Adamzvulun/Liron/pull/421)), merged by Claude at Adam's word ("Continue to your next tasks. Same as weve worked before"). His read of the words (#413) follows; changes go in a later release.


### v1.3.1 — Nour, out of the way

A fix release for v1.3.0's guide: Nour's card no longer hides the place Nour talks about (on a phone it sits under the top bar), and the eight fixes from a review of the guide's code. Notes: [releases/v1.3.1.md](releases/v1.3.1.md). Released 2026-11-22 ([#426](https://github.com/Adamzvulun/Liron/pull/426)), merged by Claude once its checks passed; the live bundle has the new card.

### v1.3.2 — In our own words

A fix release: the 60 English meanings that were the deck's own sentences are our own translations of their Arabic now (report §4el). Notes: [releases/v1.3.2.md](releases/v1.3.2.md). Released 2026-11-23 ([#434](https://github.com/Adamzvulun/Liron/pull/434)), once Vercel's daily deploy limit had passed (HANDOFF 157).

### v1.4.0 — A home of your own

Phase 7 (epic #435, [ADR 0055](../decisions/0055-a-walkable-home-drawn-in-the-page.md)): Your House becomes a room you walk in, sit in and decorate, with furniture, wallpapers and floors from the Market and chests, a banner for each guild's first rank, and visits to friends' rooms as they arranged them. New players start with an Arabic name. Notes: [releases/v1.4.0.md](releases/v1.4.0.md). Released 2026-11-23 ([#466](https://github.com/Adamzvulun/Liron/pull/466)); its five migrations applied to `waymark-prod`.

### v1.5.0 — The home lived in

Phase 8's first part (epic [#468](https://github.com/Adamzvulun/Liron/issues/468)): friends leave a note at your letterbox, a room's coziness only rises, and a chair turns four ways. Notes: [releases/v1.5.0.md](releases/v1.5.0.md).

### Next: v1.6.0 — The roof

A second room, the roof, opened with 150 gems (8.4, #472): its own layout, and friends can visit it too.
