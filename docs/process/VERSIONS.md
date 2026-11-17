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

**Done when:** two browser windows in one test key to each other and decode it; a dropped link says so and ends cleanly; only the two friends can join; **and Adam has tried it with a friend on two devices**, because Realtime itself can't be tested here.

### 3.0 — Journey's End

- Both finales, with their screens, titles and gear (4.2), written in [the-road.md](../game/the-road.md).
- The capstones, which are the finales' trials: a head-copied message and a keyed reply; a read page, a written name and a told story (4.3). The ledger shows the distance to each.
- The long evenings: harder contracts and personal bests for a finished player (4.1).

**Done when:** both roads have a tested last step; the judge's eval set is run and recorded; a finished player's compass names something worthwhile on 30 days running.

**Reaching the endings to check them:** Adam can't play a year in an afternoon. The release checklist for 3.0 uses a prepared test account on the dev site whose progress stands one step before each finale (made by a script that writes saved state, on the dev database only).

### 4.0 — A Third Guild

- `ADDING-A-SUBJECT.md`, and a third hall with one playable chapter built using only that guide (4.5). **Adam picks the subject.**
- The last sweep over everything (5.1) and `LATER.md`, the list of what stays open on purpose (5.2).

**Done when:** nothing in `src/core/` had to learn the new subject's name; STATUS says the project is done, with what lives where and how to run it.

## The release steps, the same every time

1. Every task of the version is merged into `dev`, with its issue closed and its box ticked in PLAN.md.
2. The full local checks pass on `dev` (HANDOFF lists them), and CI on `dev` is green with a job log that checks out.
3. `package.json` carries the version. `docs/process/releases/vX.Y.0.md` says what a player gets, in plain words.
4. **A release branch, `release/vX.Y.0`, is cut from `dev` at that commit**, and the release PR goes from it into `main`. This is new (ADR 0040). It lets work on the next version go on in `dev` while Adam takes his time, without that work slipping into the release.
5. **Adam's part:** for an X.0, the release checklist (about 45 minutes; extended for what's new). For an X.Y, a short list of the new things only (about 10 minutes). Then he merges the release PR, watches the DB migrate run on `main` go green, signs in on the live site, and creates the tag and its GitHub Release.
6. Problems he finds before merging are fixed on `dev` and brought to the release branch. Problems found after are X.Y.Z fixes: into `main` through a small PR, then merged back into `dev`.
7. STATUS, ROADMAP and this file's map are updated: the version is marked released, with its date.

**While a release waits for Adam, the builder starts the next version.** Never wait idle, and never merge into `main`.

## Where things stand

| Version | State |
|---|---|
| 0.1.0 | Live (the scaffold) |
| 1.0 | In progress: tasks 1.1–1.5 and 1.7–1.11 are built; next is Adam's checklist (1.12) and the release PR (1.13) |
| 1.1 – 4.0 | Not started |
