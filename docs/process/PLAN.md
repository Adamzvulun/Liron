# The plan to "done"

- **Written:** 2026-11-16, by Claude as manager, at Adam's request; revised the same day after his notes. **This file is the work order.** Whoever builds next (Claude as engineer) works through it top to bottom and ticks tasks off here. Each task is also a GitHub issue (the number is beside its title).
- **"Done" has two levels** (Adam, 2026-11-16):
  - **v1.0.0** is Phase 1 without the ledger: a solo player is never lost, every screen is painted, and Adam has walked the checklist.
  - **100% done** is v4.0: ten releases in all, mapped in [VERSIONS.md](VERSIONS.md) (Adam, 2026-11-16: "divide all the work into versions").
- **Adam's answers that shape it (2026-11-16):** the scope is everything including the Fellowship; the live site gets a **fresh start** (no copy of dev progress); a **weekly keep-alive ping** is approved; no in-app export; **the regulars' voices are parked** until Adam has looked at Azure himself; **no blue backgrounds anywhere**; **the player must never feel lost: one linear, progressing story with a pointer to the next step at all times.**

## How to work this plan

1. **Order.** [VERSIONS.md](VERSIONS.md) decides the order: work the versions in turn (1.0, 1.1, 1.2, 2.0 … 4.0), and inside a version take its tasks in the order that file lists them. Each task's heading here carries its version. The phases below group tasks by theme; they are no longer the order.
2. **Gates.** A 🚧 gate is a point where only Adam can act. At a gate: do everything up to it, write the question or the checklist where the task says, tell Adam once, and **keep working on the next task that doesn't depend on the gate**. Never wait idle, and never act for Adam (no merge into `main`, no spending, no new data sharing).
3. **Rules that still hold** (CLAUDE.md, HANDOFF, next-session-prompt): research before suggesting; ask Adam about cost, data or lock-in; no technology without an ADR; content is data; American English; deck text never in the bundle or commits; screenshot visual work and look at it; bundle small tasks into one PR into `dev`; full local checks before a PR; never push during a CI run; check the job log before merging; only Adam merges into `main`.
4. **Definition of done for every task:** its "Done when" list is true; tests cover the new behavior and fail without it; tsc, eslint, prettier, vitest (also `TZ=UTC`) and the whole Playwright suite pass; docs are updated in the same PR (STATUS, HANDOFF, the report); the PR is merged into `dev`; the task's box is ticked here and its issue is closed.
5. **Design before building.** Tasks marked ✏️ change what the player sees or how the story runs. For those: write the design in `docs/game/`, draw the concept, screenshot it, look at it, and show Adam in the report. Don't wait for his answer unless the task is a gate; he has said to make the call he would make.
6. **Verify before building.** If something a task asks for already exists and meets its "Done when" list, tick the task and write one line saying where it lives.
7. **If a task turns out wrong or impossible,** don't drop it quietly. Write what you found under the task and on its issue, propose the change, and move on.
8. **The designs are already decided.** Three documents were written with this plan so that the hardest calls aren't made mid-build: [the Road](../game/the-road.md) (tasks 1.2–1.4, 4.1, 4.2 and the capstones' story), [Grounds](../design/grounds.md) (task 1.5) and [the Fellowship build](../game/fellowship-build.md) (tasks 2.4 and 3.1–3.6). Build to them. Where one is wrong against the code, fix the document in the same PR and say so in the report; don't quietly build something else.
9. **Keep the place.** After every merged PR, tick the task (or write "slice b of 4 merged") here, so a new session can find where the work stands from this file alone.

## What the audit found (2026-11-16)

**Built and in good shape:** M0–M3, and M4's epics (the Radio Room, the operators' live news, Sit and talk with memory, the Coach and reputation). 113 word chapters, all with a grammar card and a regular. The city and five places are painted. Reviews of every area are fixed with tests. 855 unit tests and 278 browser tests pass. No known vulnerabilities in the dependencies.

**Gaps that matter for a finished project:**

| # | Gap | Task |
|---|---|---|
| 1 | Twelve commits sit on the work branch with no PR. One small fix (keeping "+100 XP" on one line) was started and put back. | 1.1 |
| 2 | **The player can get lost.** Checked on 2026-11-16 with a new account: the desktop square shows a Quests panel, but the phone square shows no quest at all (they are behind the "Quests" button). There are two questlines side by side and no single "do this next". Most stations (the slate, the echo well, the coffee corner, Instant Recognition, sending, the Codebook) are not steps in any story: they open by a rule and sit there. The end of a session doesn't say what comes next. Nothing introduces the city. | 1.2, 1.3, 1.4 |
| 3 | **Blue backgrounds remain.** The login screens, the "Lost?" page, the loading and error states, and the space under and around the cards on a phone (below a hall's painting, around the Notice Board) are the old navy gradient. | 1.5 |
| 4 | **Nobody has measured learning.** Both retros say so. Your House promises "stats" in its own placeholder text and has none. | 1.6 |
| 5 | Speed issue #137 is open with no stated finish line. | 1.7 |
| 6 | **Nobody knows if the AI keys work on the dev or live site.** Claude can't reach those sites, and this has blocked "Sit and talk" for days. | 1.8 |
| 7 | The free database pauses after 7 idle days. | 1.9 |
| 8 | STATUS's "Last updated" line is one paragraph of about 10,000 characters. There are no retros for M2 or M4. `package.json` says version 0.0.0. | 1.10 |
| 9 | Tests run on Chromium only. iPhone Safari, real sound, the real microphone and real keying have only been tried by Adam in passing. Issues #9, #38, #39 still wait for his try. | 1.12 |
| 10 | **Friends can't learn Arabic words.** Only licensees may read the Lingualism deck (ADR 0011, 0029). A friend who opens the Caravanserai today sees "The deck's words haven't been loaded into Waymark yet." Decided 2026-11-18: friends get the deck ([ADR 0050](../decisions/0050-friends-learn-from-the-deck.md)); built in v1.1.0 | 2.1 |
| 11 | The AI allowances were set for one player. With friends, everyone shares the same free quotas. | 2.2 |
| 12 | "Email me a link" on the login screen can't reach a friend (Supabase's built-in email only reaches Adam). | 2.3 |
| 13 | Supabase Realtime (live Morse) is a new technology with no ADR. | 3.6 |
| 14 | **Nothing says what happens when the content runs out.** A player who has passed every chapter and taken every rank has no story left and no reason to come back but the reviews. Neither questline has an ending. | 4.1, 4.2 |
| 15 | **The learner goals have no finish line.** The vision says "hold a conversation" and "send and receive without thinking". Nothing tests either. | 4.3 |
| 16 | The vision promises "room to grow" (empty plots for new subjects). Nobody has written down how a subject is added, and it has never been tried. | 4.5 |
| 17 | A few phrases the deck lacks (السلام عليكم, صباح النور, إن شاء الله, and the "to a woman" forms) have no free, licensed recording. | Parked |
| 18 | There is no Arabic voice for the regulars. | Parked 🚧 |

**Not gaps (checked, leave alone):** error monitoring (a third-party service would share data; the error boundary and save-failure messages are enough), offline use (a website, not a PWA), backups (Adam chose the keep-alive only).

## Where this plan is most likely to go wrong

A pre-mortem, written before the work starts. Each line is a way the run fails and what to do instead.

| # | How it fails | Guard |
|---|---|---|
| 1 | **The compass lands as one huge PR** that touches every result screen, and half the browser tests break at once. | Four PRs, in the order task 1.3 gives. Slice (a) changes nothing a player sees. |
| 2 | **A check that can go backwards** (a streak, the last drill's speed) makes a finished step come undone, and the player's place on the road jumps back. | The Road's rule 2, and its test 3. Review every check for this before merging slice (a). |
| 3 | **"Next" buttons point at a hall instead of a door**, so the player still has to find the station. | A step names a door. The browser test asserts the landing screen, not the address. |
| 4 | **The story is pasted in and never read.** Sixty new lines sit beside 150 old ones written weeks apart. | Task 1.4's read-through is real work: export each road as one text and read it top to bottom. |
| 5 | **Grounds get busy**, and text over cards becomes harder to read than on the old flat blue. | Grounds §6: halve the pattern's contrast if it shows through text. Screenshot at arm's length. |
| 6 | **A Fellowship view or policy quietly shows one player's data to another.** With one test player it looks fine. | Fellowship build §1 and §6. No slice of Phase 3 merges without the three-player test. |
| 7 | **Things that can't be tested here get called done:** Supabase Realtime, real keys, iPhone Safari, a real microphone, two real devices. | Say so in the task, mark it "untested", and put it on Adam's checklist (1.12, 3.7). A fake channel in the test backend proves our code, not Supabase's. |
| 8 | **The free AI quota is spent by tests or by the capstone judge's eval set.** | Evals run by hand from `scripts/`, never in CI, and record their results in the repo. |
| 9 | ~~**The Actions budget runs out**~~ It did, on 2026-11-22; the repo went public and runs are free since (ADR 0054). | If a job fails in seconds with no runner again, read its annotation and tell Adam the same hour. |
| 10 | **A session ends mid-task and the next one starts over or skips it.** | Rule 9 above: this file always says where the work stands. |
| 11 | **A gate is treated as a wall** and the run stops at 1.12, or a gate is treated as optional and something reaches `main` or costs money. | Rule 2: ask once, carry on with the next task that doesn't depend on it, and never act for Adam. |
| 12 | **The long middle of the Arabic road (chapters 13–114) feels like a treadmill** even with a compass. | It is honest about its length ("Chapter 40 of 115"), each chapter's waiting day offers a talk with its regular, and ranks mark chapters 35, 68 and 100. If Adam still finds it flat when he plays, world events (4.4) are the tool; don't invent filler steps. |

---

## Phase 1 — v1.0.0: never lost, fully painted, ready to release (epic #304)

**Goal:** a player who has never seen Waymark always knows what to do next, from the first minute to the last chapter, on a phone and on a desktop. No screen is a blue gradient. Adam walks a checklist in under an hour, says "release", and merges one PR.

### ☑ 1.1 (#309) · v1.0 · Land the work in flight
- **Landed (2026-11-16):** the commits in flight (dialog focus trap, lesson header contrast, the Arena tap area, the halls' peeking card, the chest shelf on a narrow phone), this plan, VERSIONS.md and the three designs are in `dev`.
- **Done (2026-11-16):** `<Xp>` keeps the number and its unit together with `white-space: nowrap`, so no test text changed. *The original brief:* every "+N XP" keeps the number and "XP" on one line (a non-breaking space) in `morse/lesson/Trial.tsx`, `words/WordDrill.tsx`, `words/Rush.tsx`, `recognition/Recognition.tsx`, and wherever else a result line can wrap. Several browser tests match "XP" after a normal space; update them to accept the non-breaking space. Bundle it with the next PR (slice (a) of 1.3).
- **Done when:** the PR is merged; at 320 pixels no result line breaks between a number and its unit.

### ☑ 1.2 (#310) · v1.0 · ✏️ The Road: one linear story for each guild, every step written down
- **Done (2026-11-16, by the manager):** the design is [docs/game/the-road.md](../game/the-road.md). The Silent Beacon is 75 steps in 10 chapters (five new chapters carry sending, the Far Station, the Night Watch, the Radio Room and the last ranks, and finish the Guildmaster's story). The Long Road In is 275 steps in 115 chapters. Eleven breaks were found and each has a decided fix. No ADR was needed: the subjects stay independent. *The original brief is kept below for the record.*
- **Why:** gap 2. Adam: "a complete storyline, so the user always knows where to go… progressional and linear."
- **What exists:** each guild has a main questline (The Silent Beacon: chapters of lamps and a trial each; The Long Road In: the script chapter, then a regular and a trial for every word chapter). Stations beside it open by rules of their own, and ranks have their own conditions. The pieces are good. They aren't one line.
- **Do, as a design in `docs/game/the-road.md`, before any code:**
  1. **List every thing a player can do in each guild**: every lesson kind, station, trial, rank, and the rule that opens it today (read `questline.json`, `ranks.json`, the halls' station lists and the unlock functions; don't trust the docs).
  2. **Put them in one order per guild**: a numbered list of steps from "your first lamp" to the last rank, where each step has a name in the world's voice, the screen it happens on, what finishes it (always something the game already records), and what it opens. Every station gets a **first visit that is a step in the story** (for example: after the first vowel marks, the scribe asks you to the slate; after lesson 8, the innkeeper sends you to the well). After its first visit a station stays open as practice, and the daily contracts keep pointing at it.
  3. **Find the breaks**: places where today's unlock rules would make the line fork, stall or skip (a station that opens before the story mentions it; a rank that needs something no step asked for; a trial with no chapter). Propose the smallest rule or copy change that mends each one. Changing when something opens is allowed; removing something isn't (ordering is not cutting).
  4. **The city's own first page**: who you are and why you came to Waymark, in three or four sentences, shown once. Then a first choice the story makes for you by default (the Signal Tower's first lamp), with the other guild one tap away. The vision keeps the two subjects independent, so a player may walk one road or both; the design must say how "next" is chosen when both are open (proposal: continue the road you last walked; the other road's next step is always shown second).
  5. **What "next" is when a road is waiting**: reviews due, a gate that needs a second day, a daily cap reached. The player must be told what to do meanwhile and when the road goes on.
  6. **An ADR** if the vision's wording needs to change (it is locked; changes need one).
- **Done when:** the doc has the complete numbered road for both guilds with no "to be decided"; every existing station, trial and rank appears in it exactly once as a step; every break found has a decided fix; the first page and the "which road is next" rule are written; Adam is shown the two roads in the report as plain lists.

### ☑ 1.3 (#311) · v1.0 · ✏️ The compass: the next step is always on screen
- **Depends on:** 1.2. **Spec:** [the-road.md](../game/the-road.md) §6–§9; its nine tests are this task's "Done when", made exact.
- **Build it in four PRs, in this order** (it is the largest task in the plan, and about 15 result screens change):
  - **(a) ☑ merged 2026-11-16. The road with no screen:** `road.json` for both guilds, the checks, `road(state, today, services)` on the subject contract, the two new counters (`only.listen`, `only.read`), the new chapters 6–10 in `content/morse/questline.json`, and tests 1–8. Nothing a player sees changes.
  - **(b) ☑ built 2026-11-16 (in its PR). The compass in the square and the halls,** the "Opens at step N" wording, and "the road so far". The old questline tracker (`questStatus`, `tracker.ts`, `questlines.ts`) is gone: the compass replaced it.
  - **(c) ☑ built 2026-11-16 (in its PR). Every result screen.** Before touching one, list every browser test that clicks a result screen's buttons. Add "Next" as a new first button and keep the existing buttons' names, so the 278 tests keep passing for the right reason.
  - **(d) ☑ built 2026-11-16 (in the same PR as (b) and (c)). The first page and the three city errands.**
- **Do:** build the road as **data** (`content/*/road.json`, one ordered list per guild) and one pure function, `nextStep(progress)`, that returns the single next step for a guild, plus the city-level pick from 1.2's rule. Then show it everywhere, in the world's look:
  - **The square, phone and desktop:** the next step is visible without opening anything, with one tap to go there. Concept it first (a signpost by the compass, a line under the top bar; screenshot both sizes and choose).
  - **Each hall:** the station that holds the next step is marked on the painting and in the cards below it. Stations not yet reached in the story say which step opens them, in one line, not "Locked".
  - **The end of every session, trial and round** (all of them: lessons, the slate, the well, shadowing, the coffee corner, word sessions, trials, chats, recognition, sending, the Codebook, the rush, the Radio Room, the Far Station): one clear button that goes to the next step, and a quieter one to do the same thing again. Never a dead end with only a way back.
  - **The Notice Board:** the main questline note shows the same step in the same words.
  - **The first page** from 1.2, once, then the first step.
- **Done when:**
  - A unit test walks a simulated player through every step of both roads in order and proves that at every point `nextStep` returns exactly one step, and that finishing it leads to the following one, to the end.
  - A browser test for a new account, on phone and desktop, reaches the first lesson in two taps from sign-in without opening a menu.
  - A browser test checks that every result screen has a "next" button that lands on the screen where the next step can be done.
  - No station anywhere says only "Locked".
  - Waiting states (reviews due, come back tomorrow, the daily cap) each have a test for what the compass says.
  - It fits 320 pixels, works by keyboard, and is announced to screen readers.

### ☑ 1.4 (#312) · v1.0 · ✏️ The story reads as one tale
- **Depends on:** 1.2, and can be built alongside 1.3.
- **Already written:** every missing line (the invites and beats of 60 new steps, five new Beacon chapters, both finales, the first page) is in [the-road.md](../game/the-road.md) §4, §5 and §8. This task puts them into `content/`, reads both roads through from start to end as a reader, and mends what still jars.
- **Do:** with the road fixed, read both questlines start to finish as a reader would: every chapter's beat, every regular's story, every trial's text, every rank's line. Fix what breaks the thread: a chapter that doesn't follow from the last, a character who appears unannounced, a station whose first visit has no line of story, a trial that doesn't say what's at stake, a rank that arrives with no word from the guild. Write the missing lines (short, in the voice already there). Give every chapter a visible "Chapter N of M" and the road a visible length, so progress is felt.
- **Done when:** each road can be read as a continuous text in the design doc (export it there); no step lacks a line of story; a test checks every road step has a title and a beat; the spelling and curly-quote tests pass on the new text.

### ☑ 1.5 (#313) · v1.0 · ✏️ No blue backgrounds
- **Why:** gap 3. Adam: "design everything so there are no blue backgrounds."
- **Art direction:** [docs/design/grounds.md](../design/grounds.md): four materials (wood, stone, earth, cobble), a painted city gate for sign-in, a waymark post for "Lost?", and the exact pixel test.
- **Do:** list every screen and state where the navy gradient shows, by screenshot at 320, 412 and 1280 pixels: sign-in, "Choose a password", "Opening the gates…", "Not set up yet", "Lost?", the error screens, the space under a hall's painting on a phone and in a short window, the Notice Board's surround, Your House and the Market around their panels, every station screen at its edges, the gaps between cards on long pages. Then give each a painted or textured ground that belongs to its place (ADR 0006, ADR 0025: painted in the browser, no image files): the city gate at dusk for sign-in, a road out of town for "Lost?", wood, stone or plaster continuing a hall's painting below it. The `body` gradient itself goes, so nothing can fall through to it.
- **Done when:** a browser test visits every route and state in the list at three sizes and fails if the navy gradient's colors are visible anywhere (sample the screenshot's pixels at the edges and between cards); each new ground is screenshotted and looked at; text on them meets 4.5:1; the speed budget from 1.7 still holds.
- **Done (2026-11-16):** built as [grounds.md](../design/grounds.md) §7 records, with three deviations noted there. `tests/e2e/grounds.spec.ts` is the pixel test; `tests/grounds.test.ts` reads the style sheets.

### ☑ 1.6 (#314) · v1.1 · ✏️ The ledger: learning you can see (stats in Your House)
- **Why:** gap 4.
- **Do:** design first, in `docs/game/ledger.md` (short). Use **only data already saved**: reviews and their due dates (FSRS), skill ratings (Glicko-2), subject state, the daily minutes and streak. Don't add tracking. Proposed contents, to adjust after reading the tables:
  - Arabic: letters known; words met, and words "known" (define it: for example an FSRS interval of 21 days or more); reviews due today; chapters passed; chats held.
  - Morse: characters learned; copy speed; sending speed; recognition best; contacts logged.
  - Habit: days practiced in the last 30, minutes this week, longest streak.
  - Where you are on each road ("step 14 of 96"), from 1.3.
  - One line a subject that says the trend in words ("12 more words known than a week ago").
  Build it as a panel in Your House, with the house's look. Replace the placeholder sentence in `PLACE_SOON.house`.
- **Done when:** Your House shows the ledger for a new player (honest zeros, no "NaN", no empty boxes) and for an advanced one; every number is defined in the design doc and unit-tested against that definition; it fits 320 pixels; no new data is collected.
- **Built (2026-11-17):** the design is [ledger.md](../game/ledger.md). The ledger is a panel in Your House, between the wardrobe and the achievements, and it reads only what was already saved. "Known" means an FSRS interval of 21 days or more. "Longest run" counts days with any minutes, so it is not the goal streak; the doc says so.

### ☑ 1.7 (#315) · v1.0 · Give speed (#137) a finish line, then close it
- **Do:** measure on the production build with the slowed-phone settings `tests/e2e/city-speed.spec.ts` already uses: first paint of the square, time until a place can be clicked, return to the square from a hall, and the gzipped startup script. Write a budget in `docs/process/CI.md` (today's numbers plus 15%, unless a number is plainly bad, in which case fix it first). Make the existing speed test fail above the budget. Do this **after 1.3 and 1.5**, since both add to the square.
- **Done when:** the budget is written and tested; the report shows the numbers in plain words; #137 is closed with a link, or labelled `needs:adam` with one sentence saying what he should try.
- **Done (2026-11-16):** the budget is in [CI.md](CI.md) and `tests/e2e/load-budget.spec.ts` enforces it. The time ceilings are wider than "plus 15%", and CI.md says why. #137 is labelled `needs:adam`: whether it *feels* fast is his to say.

### ☑ 1.8 (#316) · v1.0 · A "what's switched on" line in Settings
- **Why:** gap 6.
- **Do:** a tiny server function that answers, for a signed-in player only, which AI services the site has keys for: booleans only, never a key or part of one. Show it in Settings under "Services" in plain words ("Sit and talk: ready" / "not set up on this site"). Rate-limit it like the other functions. Add it to DEPLOY's table.
- **Done when:** on a site with no keys the line says so, with a browser test; unit tests prove the function leaks nothing and refuses anonymous callers.
- **Done (2026-11-16):** `api/services.ts`, shown under Settings → Services. **One deviation:** it has no daily counter of its own. It makes no AI call and spends nothing; a caller without a token Supabase knows is refused, and the browser keeps the answer for five minutes. A counter would need a new table for something that costs nothing.

### ☑ 1.9 (#317) · v1.0 · The weekly keep-alive (approved by Adam)
- **Do:** a scheduled GitHub Actions workflow, once a week, that runs one trivial read against `waymark-prod` and `waymark-dev` using the secrets that already exist. It must take seconds, print nothing secret, and fail loudly if a project is paused. Document it in SUPABASE.md, with what to do when it fails.
- **Done when:** the workflow exists, has run once by hand with a green log, and the doc explains it.
- **Built (2026-11-16), one line open:** the workflow and its section in SUPABASE.md exist. It runs Mondays and Thursdays, not once a week, so a late run never leaves a full week's gap. **Still to do:** the run by hand with a green log. GitHub can only start a workflow that is on `main`, so that happens right after the v1.0.0 release (it is on the release checklist, task 1.12). **Done:** Adam ran it by hand on 2026-11-18 and it was green (STATUS).

### ☑ 1.10 (#318) · v1.0 · Docs fit for a release
- **Do:** rewrite `STATUS.md` so its top is a short current state; move the history paragraph into `docs/process/HISTORY.md` unchanged. Write `retros/M2.md` and `retros/M4.md`. Set `package.json` to `1.0.0`. Draft `docs/process/releases/v1.0.0.md`: what a player gets, in plain words, grouped by place. Bring README, ROADMAP and the next-session prompt in line with this plan.
- **Done when:** a newcomer can read STATUS in two minutes and know the state; both retros exist; the notes are ready to paste into the release PR.

### ☑ 1.11 (#319) · v1.0 · One last review pass
- **Do:** with the `code-reviewer` and `secure-code-guardian` skills, review everything changed since the last review of each area (2026-11-15), plus `api/`, `vercel.json` headers and the migrations added since. Then a UX pass with fresh eyes over the whole road on a phone: play the first ten steps of each guild as a new player and write down every moment of doubt. Fix findings with tests.
- **Done when:** the review file exists in `docs/process/reviews/`; no open finding of medium or higher; no moment of doubt left unanswered.
- **Done (2026-11-17):** [reviews/2026-11-17-v1-review.md](reviews/2026-11-17-v1-review.md). Two mediums found and fixed (the phone's compass cut mid-word; a speed test that failed at random); two lows left for task 2.1, where they belong.

### ☐ 1.12 (#320) · v1.0 · Adam's release checklist 🚧
- **Do:** write `docs/process/release-checklist.md`, a walk of about 45 minutes, each line a checkbox with what to do and what "good" looks like. It must cover: starting as a new player and following the compass for ten minutes without help; iPhone Safari and desktop; sound with the silent switch on and off; the microphone prompt and "Say it"; keying with the tap pad (does the tone lag?); one Koch lesson; one script lesson (#38, #39); one word session; the coffee corner; Sit and talk and a Radio Room contact (after reading 1.8's line); buying something; opening a chest; changing the avatar; sign out and in. End with "anything that annoyed you, and any moment you didn't know what to do".
- **Then:** tell Adam it's ready. Fix what he reports, with tests. Close #9, #38 and #39 when he has ticked their lines.
- **Done when:** Adam has walked it; every problem he found is fixed or filed with his agreement.
- **Written (2026-11-17):** [release-checklist.md](release-checklist.md). Waiting for Adam's walk. **Grown the same day** to cover what 1.0.0 now carries (ADR 0049): the ledger, sound, one ending, and an optional friend.

### ☐ 1.13 (#321) · v1.0 · The release PR 🚧
- **Do:** follow DEPLOY's "The first real release, v1.0.0" and the release steps in VERSIONS.md (cut `release/v1.0.0` from `dev`'s head: since ADR 0049, 1.0.0 carries everything up to 3.0). Open the PR from that branch into `main` titled `Release v1.0.0` with the release notes. Tell Adam the steps that are his: the Production keys, merging, his account on the live database (a fresh start, as he chose), the tag.
- **Done when:** Adam has merged it, the DB migrate run on `main` is green, and he has signed in on the live site. **Don't wait for this to start Phase 2.**

---

## Phase 2 — Ready for friends (epic #305)

**Goal:** a second person can use Waymark safely and fairly before any social feature exists.

### ☑ 2.1 (#322) · v2.0 · What a friend may learn
- **Decided (Adam, 2026-11-18): every friend reads the deck** ([ADR 0050](../decisions/0050-friends-learn-from-the-deck.md)). Options (a) and (b) below are the record of the question. **To build:** every account becomes a licensee without a step from Adam (a migration, with tests), FRIENDS.md and SUPABASE.md updated, and the non-licensee path kept honest as a safety net (the "Done when" below).
- **Built (2026-11-18, v1.1.0):** migration `20270107000000_every_account_reads_the_deck.sql` (a trigger for new accounts and a backfill, tested in `supabase/tests/schema.test.ts`). The client asks the database `is_content_licensee()` once a page (`core/road/facts.ts`). **One change from the plan below:** a non-licensee keeps the whole road instead of losing the deck's steps. Leaving them out left 28 steps, every one of them at a door that reads the deck (the script lessons too), so it was itself a dead end. Now each such step *waits*, with "This account can't read the deck yet: ask whoever invited you.", the count stays true ("Step 1 of 275"), the slate and the inn's chats stay open when reached, and every deck door says the same instead of "haven't been loaded" (`NoDeck.tsx`). `tests/e2e/no-deck.spec.ts` follows the compass as such an account.
- **Why:** gap 10. This is a license question, so it's Adam's.
- **Do:** read the Lingualism deck's license terms as recorded in `sources/README.md` and on the seller's page, and write down exactly what they allow. Then put the options to Adam with a recommendation:
  - (a) A friend who buys their own deck is added as a licensee by Adam. Cost: the friend's, $25.
  - (b) Friends without the deck get everything that is ours: Morse in full, the Arabic letters and marks, the echo well's sounds, the grammar cards. The word path and phrases stay shut for them.
  - Both can hold at once (the recommendation, if the license reads the way ADR 0011 says).
- **Build, whatever he picks:** a non-licensee never sees "haven't been loaded". Their road (1.2) is the road they can actually walk: steps that need the deck are left out of it for them, with one friendly line saying what would open them.
- **Done when:** Adam has answered; a browser test signs in as a non-licensee and follows the compass through the Caravanserai with no dead end and no misleading message.
- **Asked (2026-11-17), waiting on Adam:**
  - **What we know of the license:** our record (`sources/arabic/lingualism-palestinian-vocabulary/README.md`) says "Copyrighted. Personal use." The seller's own pages couldn't be read from here: lingualism.com refused automated reads (404 and "too many requests"). Adam can check the terms in a browser.
  - **What a non-licensee can do today:** only the slate. The script lessons, the fountain, the storyteller, the coffee corner, the echo well, the word path and the inn's chats all read the deck. So option (b) "the letters for everyone" means building a reading practice from our own words (`own-sentences.json` is ours, but it has no recordings and no per-word glosses).
  - **Recommendation:** (a) now, since it needs no building, and (b) later as its own task if friends without the deck should learn the letters too.

### ☑ 2.2 (#323) · v2.0 · Fair shares of the free AI
- **Do:** list every allowance (inn lines, partner replies, speech checks) with the provider's current free limits, checked on their pages. Work out what five players at once would use. Change the per-player numbers, or add a site-wide daily ceiling in the database, so one player can't use up everyone's day. Say what a player sees when the site's day is spent.
- **Done when:** the sums are in an ADR; the ceilings are enforced in the database with tests; the messages are tested.
- **Done (2026-11-17):** [ADR 0041](../decisions/0041-fair-shares-of-the-free-ai.md). The inn is the tight one: Groq's 200,000 tokens a day cover about 200 lines, not five players' 300. Site-wide daily ceilings (speech 1,500, partner 500, inn 150) in `20261229000000_site_ceilings.sql`, tested in `schema.test.ts`; the `site-limit` messages are tested in the API tests and `inn-chat`/`inn-voice` e2e. **For Adam:** read the free numbers once on console.groq.com/settings/limits and aistudio.google.com/rate-limit (Groq's public page now shows the Developer plan's).

### ☑ 2.3 (#324) · v2.0 · Sign-in for someone who isn't Adam
- **Do:** "Change your password" in Settings. Rewrite the login screen's "Email me a link" so it doesn't promise what can't arrive: keep it working for Adam, and tell everyone else to ask whoever invited them. Write `docs/process/FRIENDS.md` for Adam: how to create a friend's account in the Supabase dashboard, hand over a password, reset one, add a licensee, and remove a friend and their data.
- **Done when:** a player can change their password, with tests; the login copy is honest; FRIENDS.md exists, with any step that couldn't be tried marked "untested" and added to Adam's checklist.
- **Done (2026-11-17):** Settings → **Change your password** (`src/core/auth/password.ts`, `Hud.tsx` `PasswordRows`; tests in `password.test.ts` and `tests/e2e/login.spec.ts`). The login screen no longer says "First time… Email me a link": it says "Forgot your password?", and its reply tells everyone but Adam to ask whoever invited them. [FRIENDS.md](FRIENDS.md) has every step, all marked untested, and they're on Adam's checklist in STATUS.md.

### ☑ 2.4 (#325) · v2.0 · Two players, one database
- **Spec:** [fellowship-build.md](../game/fellowship-build.md) §6, tests 1 and 2 (every table and every granted function, read from the database so nothing new can be forgotten).
- **Do:** a test pass with two fake players proving that neither can read or change anything of the other's: reviews, ratings, state, chats, memories, chests, purchases, allowances. Fix anything found. Check every server function for per-player limits.
- **Done when:** the tests exist and pass; findings are fixed; the review file lists what was checked.
- **Done (2026-11-17):** `supabase/tests/isolation.test.ts` (26 tests; every list read from the database), and the test stand-in now grants what Supabase grants by default, so a forgotten `revoke` fails. Review: [2026-11-17-two-players.md](reviews/2026-11-17-two-players.md). Nothing leaked.

---

## Phase 3 — The Fellowship (M5) (epic #306)

**Goal:** friends share the city, as written in [fellowship.md](../game/fellowship.md) and settled by ADR 0039. **Every slice ships on its own PR and is useful alone.**

**Build to [fellowship-build.md](../game/fellowship-build.md):** its five traps, tables, functions and nine tests. The database tests go in `supabase/tests/` beside `schema.test.ts`, which already runs the real migrations in PGlite and checks row-level security as each player.

Rules for the whole phase: what friends see is §3's list and nothing else, enforced by the database (a view plus row-level security), never by the screen. No leagues, no demotion, no public ranking. A player with no friends sees no empty social clutter. Each epic gets its design in `docs/game/` first (✏️). **The social features join the road**: meeting your first friend, your first visit and your first challenge are steps the compass can point to once a player has a friend, and never before.

### ☑ 3.1 (#326) · v2.0 · ✏️ E18 — Friend codes and the Fellowship list
- **Do:** the `friendships` table and the shared view. "Add a friend" by code: each player has a short code; typing a friend's code sends a request; they accept or decline; either can remove the other. The Fellowship list in Your House: each friend's avatar, name, level, ranks and titles, streak, pet.
- **Done when:** two test players can link and unlink; a non-friend can read nothing; requests can't be spammed (a limit, tested); the list fits 320 pixels and has a kind empty state that explains friend codes.
- **Done (2026-11-17):** [ADR 0042](../decisions/0042-the-fellowship-first-slice.md). Migration `20261230000000_fellowship.sql`; `supabase/tests/fellowship.test.ts` (tests 3–7 of fellowship-build.md §6, the three-player test among them); the list in Your House (`src/core/fellowship/`), tested in `tests/e2e/fellowship.spec.ts`, 320 pixels included. Test 8 (the feed switch) belongs to 3.3; test 9 holds today (no social thing shows without friends).

### ☑ 3.2 (#327) · v2.0 · ✏️ E19a — Visit a friend's house
- **Do:** from the list, walk into a friend's house: their room, avatar, gear and trophies, read-only.
- **Done when:** it shows only §3's fields (a test asserts the exact fields the view returns); there is a clear way home; no wardrobe controls appear.
- **Done (2026-11-17):** `/house/visit/<id>` (`FriendHouse.tsx`), painted from the card alone; the card's keys are asserted in `fellowship.test.ts`; "Back to your house" and "Back to the square"; no wardrobe and no buttons in the room (e2e). A non-friend finds the door closed.

### ☑ 3.3 (#328) · v2.1 · ✏️ E19b — The party feed and friends in the square
- **Do:** milestones as events friends can read (a rank taken, a chapter passed, a trial passed, a streak of 7/30/100, an achievement), written by the database when they happen, never by the browser. Show them on the Notice Board. Then draw friends' avatars standing in the square, inside 1.7's speed budget.
- **Done when:** the feed shows friends' milestones newest first and nothing private; a player can switch off sharing their own milestones in Settings; the square stays inside the speed budget with five friends.
- **Done (2026-11-17):** [ADR 0043](../decisions/0043-the-party-feed.md). Triggers write the feed (migration `20261231000000_fellowship_feed.sql`, tests in `fellowship.test.ts`, test 8 among them); "Word in the square" on the Notice Board; Settings' switch for a player with a friend; up to eight friends in the square, each a way to their house. `load-budget.spec.ts` now runs with five friends: 2.0×, 2.0×, 1.5×.

### ☑ 3.4 (#329) · v2.2 · ✏️ E19c — Challenges and the Arena (A7)
- **Do:** opt-in challenges built on scores that exist: a callsign rush and a word round. One friend sends a challenge with their score; the other plays the same kind of round when they like; both personal bests are shown; no loser screen. Paint the Arena and open it as the challenges' home; retire the "locked" sign.
- **Done when:** a challenge can be sent, played, answered and declined, with tests for each state and for expiry; scores are checked by the database; the Arena is painted, screenshotted and fits phone and desktop.
- **Done (2026-11-17):** [ADR 0044](../decisions/0044-challenges-and-the-arena.md). Migration `20270101000000_challenges.sql`, with tests in `fellowship.test.ts` (recording, sending, answering, declining, expiry, limits, who sees what). The offer sits under the rush's and the Codebook's results; the Arena at `/arena` is painted (`paintArena.ts`) and screenshotted at 320 pixels and on desktop; the square's sign opens it. `tests/e2e/challenges.spec.ts`.

### ☑ 3.5 (#330) · v2.3 · ✏️ E19d — Fellowship quests and gifts
- **Do:** co-op goals on the daily-contract machinery (ADR 0032): "together, 10 chats at the inn this week". Then gifting a Market ware to a friend, paid in the giver's gold, through the database's purchase path (ADR 0029, 0033).
- **Done when:** progress counts every member's real events once; rewards are paid by the database once each; a gift can't create gold or duplicate an item (tests for both).
- **Done (2026-11-17):** [ADR 0045](../decisions/0045-fellowship-quests-and-gifts.md). Migration `20270102000000_fellowship_quests_and_gifts.sql`, with tests in `fellowship.test.ts` (counting once, only your Fellowship, paid once and only to helpers, gifts to strangers, owned wares, gold never below zero, three a day). "Together this week" on the Notice Board, "Give to a friend" in the Market, "Gifts for you" in Your House; `tests/e2e/together.spec.ts`, screenshotted at 320 pixels and on desktop.

### ☑ 3.6 (#331) · v2.4 · ✏️ E20 — Live Morse between friends
- **Do:** first the ADR for Supabase Realtime (limits checked on Supabase's pages today; what is sent; what happens on a dropped connection). Then: two friends in the Signal Tower, each hearing the other's key as tones, with the timing sent as key-down and key-up events. Reuse the sidetone and the decoder. Nothing is stored.
- **Done when:** two browser contexts in one test can key to each other and decode it; a dropped link says so and recovers or ends cleanly; only friends can join a room (tested); it works with the phone tap pad.
- **Done (2026-11-17):** [ADR 0046](../decisions/0046-the-wire.md), with the Realtime limits read on Supabase's pages that day. Migration `20270103000000_the_wire.sql`: policies on `realtime.messages` that only the two friends pass, tested in `fellowship.test.ts` against a stand-in in the shim. The wire at `/signal-tower?open=wire`, reached from the sending table ("Key to a friend"); the friend's key plays 250 ms behind at 760 Hz. `tests/e2e/wire.spec.ts` keys K between two pages over a fake Realtime socket (`tests/e2e/fake-realtime.ts`), drops and recovers the line, refuses and retries it, and keys from the phone's brass key; screenshotted at 320 pixels and on desktop. **Untested against real Realtime:** Adam's try on two devices, after switching off "Allow public access" (RUNNING.md, Friends).

### ☐ 3.7 (#332) · v2.0–2.4 · Release the Fellowship 🚧
- **Since ADR 0049 (2026-11-17), the Fellowship ships inside 1.0.0**, hidden until a player has a friend. This task is now opening it to a first friend: 2.1's decision, the Realtime setting, and the try on two devices.
- **Do:** the M5 retro (the [final retro](retros/final.md) covers the build; add what the first friend teaches), and the two-accounts-on-two-devices lines, which are in the release checklist's §6 as optional.
- **Done when:** it's live and Adam has added a first friend using FRIENDS.md.

---

## Phase 4 — The whole vision (beyond the releases) (epic #307)

**Goal:** Waymark does everything the vision promises, and keeps being worth opening after the last chapter. This is what "100% done" adds once a solo player and their friends are served.

**What 100% looks like, measured against the vision:**

| The vision says | 100% means | Task |
|---|---|---|
| "Small daily lessons, a visible path, streaks" | A player who has finished both roads still has a reason to come every day | 4.1 |
| "Main questlines are the curriculum" | Both stories end. There is a last chapter, a finale and an epilogue | 4.2 |
| "Hold a conversation" · "send and receive without thinking" | Each goal has a capstone the player can pass, and the ledger says how far away it is | 4.3 |
| "World events" (M6) | The city changes with the calendar, without anyone having to deploy | 4.4 |
| "Room to grow: empty plots… adding a subject means building a new place" | The way to add a guild hall is written, and has been proven once | 4.5 |
| "Creatively stunning" | The city sounds alive and moves, within taste and the speed budget | 4.6 |
| It keeps running | Adam can look after it without Claude: updates, keys, friends, a paused database | 4.7 |

### ☑ 4.1 (#333) · v3.0 · ✏️ The long evenings: a daily loop for a player who has finished
- **Why:** gap 14. FSRS reviews thin out by design, so a finished player's day shrinks to almost nothing.
- **Already decided:** the rule is the compass's "meanwhile" ([the-road.md](../game/the-road.md) §6), built in 1.3. A finished road uses the same function. This task gives it more to point at.
- **Do:** design what a day looks like at the end of each road, using what exists: reviews due, the Radio Room's live operators, Sit and talk, the rush, the daily contracts and chests. Add what's missing so the compass always has something real to point at: for example a "today in Waymark" step that rotates among the open-ended stations, harder contract tiers for finished players, and personal-best chases. No new content sources; mastery still can't be bought.
- **Done when:** for a player with everything passed, the compass names a worthwhile step every day for 30 simulated days (a unit test over the rotation); the contracts scale; nothing says "you've finished, come back never".
- **Done (2026-11-17):** [ADR 0048](../decisions/0048-the-long-evenings.md). Master contracts (30–40 gold) open the day after a road's finale and take that road's place on the board (migration `20270106000000_the_long_evenings.sql`, tested over 30 days in `schema.test.ts`). The evening's lines name your bests ("Your best is 31: beat it"), tested over 30 simulated days in both roads' tests. The courtyard keeps chapter 115 on its scroll after the finale. For checking: `scripts/endings.ts` prints SQL that puts a dev account one step before each finale (`tests/endings.test.ts`).

### ☑ 4.2 (#334) · v3.0 · ✏️ Two endings
- **Already written:** both finales, with their trials, screens, epilogues, titles and gear: [the-road.md](../game/the-road.md) §4 ("Forty Winters") and §5 ("The Stranger at the Gate").
- **Do:** write and build the last chapter of The Silent Beacon and of The Long Road In: a final trial that uses the whole skill, a finale screen worth reaching (painted, with the guild's people in it), a title and a piece of gear that can be earned no other way, and an epilogue line that leads into 4.1's loop. The roads in `road.json` get their last steps.
- **Done when:** both roads have a final step and a tested path to it; the finale screens are painted, screenshotted and fit phone and desktop; the party feed (3.3) announces it.
- **Done (2026-11-17), with 4.3:** [ADR 0047](../decisions/0047-the-two-finales.md). Forty Winters is step 75 of the Silent Beacon (the lantern room, `paintBeacon.ts`); The Stranger at the Gate is step 275 of the Long Road In, in its own chapter 115 (the full table at night, `paintTable.ts`). Each opens at its road's last rank, is reached from its hall (the lantern room's door; the courtyard's gate) and by the compass, and ends on a door into the daily loop. Rewards come from the database: migrations `20270104000000_forty_winters.sql` and `20270105000000_stranger_at_the_gate.sql` (beacon lens and Keeper of the Hour; innkeeper's pen and Keeper of the Table; the feed announces both achievements). The Morse title changed from the doc's Keeper of the Beacon, which Beacon Relit already gives. Both screens screenshotted at phone and desktop; `tests/e2e/forty-winters.spec.ts` and `tests/e2e/stranger-at-the-gate.spec.ts` walk both, pass and miss.

### ☑ 4.3 (#335) · v3.0 · ✏️ The capstones: have the goals been met?
- **The capstones are the two finales' trials** ([the-road.md](../game/the-road.md) §4 and §5), so build 4.2 and 4.3 together.
- **Do:** define, in the design doc, a test for each learner goal that uses only what Waymark can honestly judge:
  - **Arabic:** a longer conversation at the inn on everyday topics, judged by the same model that plays the regulars against a written rubric (understood, answered, kept going), with an eval set proving the judge is consistent; reading a short text in script; writing a few words on the slate. Say plainly what it can't judge (pronunciation, ADR 0013).
  - **Morse:** head copy of plain text at 20 wpm, and a sent passage the decoder reads cleanly at 15 wpm or more.
  Show the distance to each capstone in the ledger (1.6).
- **Done when:** both capstones can be attempted and passed, with tests; the judge's eval set is in `scripts/` with its results recorded; the ledger shows progress toward each.
- **Done (2026-11-17):** the tests are written in [the-road.md](../game/the-road.md) §4 and §5 and [ADR 0047](../decisions/0047-the-two-finales.md). Morse: head copy at 20 wpm (three questions on a message heard once) and a reply the decoder reads at 15 wpm or more. Arabic: a guest-book page of our own sentences, the stranger's name from memory on the slate, and "Your Story" judged on the rubric; pronunciation isn't judged, and the intro says so. The eval set is `scripts/judge-eval.ts`: 30 of 30 runs right, no chat both passed and failed ([judge-eval.md](../research/judge-eval.md)). The ledger has a capstone line in each hall's block.

### ☑ 4.4 (#336) · v1.2 · ✏️ World events
- **Do:** a small calendar of events as **data** (`content/core/events.json`): a week when the square is dressed differently, a themed contract set, a chest that only that week gives. They start and end by date with no deploy. Begin with three or four across the year that fit the two cultures of the city. Art is painted in the browser like everything else.
- **Done when:** an event appears and ends by the clock (tested with a fixed date); a player who misses one loses nothing they had; the square stays inside the speed budget.
- **Built (2026-11-17):** [events.md](../game/events.md). There are four events, on fixed dates: World Radio Day, World Amateur Radio Day, the olive harvest, and World Arabic Language Day. Each one has bunting, a notice, a themed contract and its own chest. Lunar feasts are left out, because their dates move every year; events.md says why.

### ☐ 4.5 (#337) · v4.0 · The guild-hall kit, and the third hall 🚧
- **Do:** write `docs/process/ADDING-A-SUBJECT.md` from the subject contract (ADR 0019) and from how the two halls were actually built: the content packs, the road, the hall painting, the ranks, the contracts, the tests every subject must pass. Then prove it: ask Adam which subject fills the first empty plot, and build its smallest honest first chapter using only the kit. Fix the kit wherever the build had to step outside it.
- **Done when:** the guide exists; a third hall stands on a plot with one playable chapter on its own road; nothing in `src/core/` had to learn the new subject's name. **Gate:** the choice of subject is Adam's; until he picks, the guide alone is the deliverable.
- **Guide written (2026-11-17):** [ADDING-A-SUBJECT.md](ADDING-A-SUBJECT.md). Writing it found where `src/core/` still names the two halls (its last section): the third hall's build starts by fixing those, in one ADR. **Waiting on Adam:** which subject fills the first empty plot.

### ☑ 4.6 (#338) · v1.2 · ✏️ The city sounds and moves
- **Do:** sound made in the browser with Web Audio, like the Morse tones (no audio files, no licenses to clear): a soft click and chime language for buttons, rewards and level-ups, and an optional ambient bed per place. Small motion that answers the player: the avatar walking to a door, lamps lighting when a step is done. A sound switch in Settings, off respected everywhere, reduced motion respected everywhere.
- **Done when:** every sound can be switched off and stays off across reloads; nothing plays before the player's first tap; reduced motion shows none of the new movement; the speed budget holds.
- **Built (2026-11-17):** [sound.md](../design/sound.md). Two switches in Settings: clicks and chimes (on by default) and each place's bed of sound (off by default). The halls are quiet, because their sound is the lessons. The avatar walks toward a door, and a building lights up when its road moved on.

### ☐ 4.7 (#339) · v1.1 · The keeper's handbook
- **Do:** `docs/process/RUNNING.md` for Adam: what to do each month and each year (dependency updates and how to run the checks, rotating keys, what the keep-alive's failure means, the free tiers' limits and where to read your usage, adding and removing friends, restoring a paused project, releasing). A monthly reminder issue template.
- **Done when:** the handbook exists and each procedure in it has been followed once, or is marked "untested" with the reason.
- **Written (2026-11-17):** [RUNNING.md](RUNNING.md) and the **Monthly check** issue template. Every procedure is marked untested so far: each needs Adam's dashboards or the release. The ticks come as he follows them.

---

## Phase 5 — Closing (epic #308)

### ☑ 5.1 (#340) · v4.0 · The last sweep
- **Do:** repeat the phone-and-desktop sweep over everything built in Phases 2–4 (the method is in HANDOFF items 54–82), and the "moment of doubt" walk from 1.11 over the whole road, endings included. Bring every doc in line with what exists. Empty the "open questions" list or mark each as Adam's standing choice. Write the final retro.
- **Done when:** STATUS says the project is done, with what lives where and how to run it.
- **Done (2026-11-17), for everything that exists:** every Phase 2–4 screen at 320 pixels and on desktop. It found and fixed two things: the Notice Board's quiet quest line, unreadable on parchment, and a long friend's name broken mid-word (a narrow portrait now gives it room, and the wire's buttons fill their row). The doubt walk is the road tests: one open next step from the first step to each finale and 30 days past it. The open questions are emptied or marked as Adam's, the [final retro](retros/final.md) is written, and STATUS says what's done, what lives where and how to run it. **When the third hall is built (4.5), repeat this sweep over it.**

### ☑ 5.2 (#341) · v4.0 · What stays open on purpose
- **Do:** one file, `docs/process/LATER.md`, listing what is parked and why, each with what would un-park it. Per CLAUDE.md this is ordering, not cutting.
- **Done when:** the file exists and the roadmap points to it.
- **Done (2026-11-17):** [LATER.md](LATER.md), checked against the code that day; ROADMAP.md and economy.md point to it. Keep it current as items un-park.

---

## Phase 6 — The guide for new players (epic #405)

**Goal:** a friend who arrives by invite link, on a phone, finds their way around without anyone explaining it. Spec: [the-guide.md](../game/the-guide.md). Decision: [ADR 0053](../decisions/0053-a-guide-for-new-players.md). Research: [new-player-guides.md](../research/new-player-guides.md). Adam chose (2026-11-22) a guide character with tips at the moment of need and a Guidebook, everything open but introduced in order, friends first, and a new city character.

### ☑ 6.1 (#406) · v1.3 · Design the Lamplighter: name, look, where they stand 🚧
- **Gate:** Adam picks the name (from three) and approves the look. Drawn into the touch-screen pictures, no new filtered layers.

### ☑ 6.2 (#407) · v1.3 · Save what the guide has shown, on the account
- `guide_seen` on the profile; derived from state where possible, so existing players aren't greeted as strangers.

### ☑ 6.3 (#408) · v1.3 · One voice at a time
- The first page, celebrations and the guide take turns; the guide speaks only on the square.

### ☑ 6.4 (#409) · v1.3 · The speech card and the three-line welcome
- After the first step: the compass line, the top bar, the places. Skippable, replayable.

### ☑ 6.5 (#410) · v1.3 · Introductions in order, and the one "new" mark
- Seven introductions, one per visit, one mark at a time; the city errands fold into them.

### ☑ 6.6 (#411) · v1.3 · First-visit cards for every place and station
- Core places from `content/core/guide.json`; halls through the subject contract.

### ☑ 6.7 (#412) · v1.3 · The Guidebook
- A page for every place, number and system; numbers from code; a completeness test.

### ☑ 6.8 (#413) · v1.3 · The guide's words, reviewed by Adam 🚧
- **Gate:** Adam reads every line once.

### ☑ 6.9 (#414) · v1.3 · Try it on a newcomer, and release v1.3.0
- A newcomer walk-through on the phone, then the release.

**Done (2026-11-23):** Adam approved Nour's look and the guide's words, and found the newcomer walk-through fine. v1.3.0 went live on 2026-11-22.

**Order:** 6.1 and 6.2 first (6.1 waits on Adam, so 6.2–6.3 go ahead meanwhile), then 6.4, 6.5, 6.6, 6.7 in that order, with 6.8's words written alongside each and reviewed in one sitting before 6.9.

## Phase 7 — A home of your own (epic #435)

**Goal:** Your House becomes a room you walk in, decorate and invite friends into. A friend who visits walks into your room as themselves and finds you standing in it (Adam, 2026-11-22). Spec: [the-home.md](../game/the-home.md). Decision: [ADR 0055](../decisions/0055-a-walkable-home-drawn-in-the-page.md) (proposed). Research: [walkable-home.md](../research/walkable-home.md).

### ☑ 7.1 (#436) · v1.4 · Design the room: the floor grid and the starter pieces 🚧
- **Gate:** Adam approves the look. Today's painting split into a fixed room and seven movable pieces, with a 12 × 5 floor grid in its perspective.

### ☑ 7.2 (#437) · v1.4 · The room's rules: grid, footprints, caps and the path from the door
- Pure TypeScript with unit tests, and a fixture of good and bad layouts shared with 7.3.

### ☑ 7.3 (#438) · v1.4 · Homes in the database: `save_home` and `home_of`
- One layout per player, checked whole. Friends read placed pieces only.

### ☑ 7.4 (#439) · v1.4 · Paint the furniture: the panel pieces, 8 more, the wallpapers and floors
- Pictures on touch screens, with no live filters.

### ☑ 7.5 (#440) · v1.4 · Walk in the room
- Tap to walk, arrow keys, depth by row, the phone pan, and the frame budget.

### ☑ 7.6 (#441) · v1.4 · Pieces that do things, and the list "In this room"
- The cupboard, shelf, desk and letterbox open today's four panels. Old addresses keep working.

### ☑ 7.7 (#442) · v1.4 · Decorate: place, move, flip and store
- Tap, then tap. Dragging is never the only way. Done saves whole; Cancel puts it back.

### ☑ 7.8 (#443) · v1.4 · Furniture in the economy
- A new item kind, one Market slot a day, chest drops, and rank banners.

### ☑ 7.9 (#444) · v1.4 · Visit a friend's room
- You walk in as yourself, and can't touch anything. FRIENDS.md gets its line.

### ☑ 7.10 (#445) · v1.4 · The guide for the home
- The first-visit card, Nour's line about Decorate, and a Guidebook page. The words go in Adam's read (#413).

### ☑ 7.11 (#446) · v1.4 · Try it with a friend on a phone, and release v1.4.0
- **Adam's part:** a visit both ways with a friend.

**Order:** 7.1 and 7.2 together (7.2 needs no art), then 7.3. 7.5 can start on 7.1's pieces before Adam's yes, since the look can change under it. Then 7.6, 7.4, 7.7, 7.8, 7.9 and 7.10, then 7.11. After v1.4: #447 (stopped-by notes, visiting together live, more facings, a second room), ordered, not cut.

**Done (2026-11-23):** v1.4.0 went live (#466), and Adam visited a friend's room and had them visit his: "It works, everything's good."

## Phase 8 — The home lived in (epic #468)

**Goal:** the home keeps giving friends a reason to drop by. From #447 and [the-home.md](../game/the-home.md) §9, in its order. Visiting together live stays in #447: it waits on the same Realtime setting as the wire (VERSIONS 2.4).

### ☑ 8.1 (#469) · v1.5 · Notes at the letterbox
- A visiting friend leaves one note a day from a fixed set (our own Arabic sentences, Morse sign-offs, two plain lines). The host reads them at the letterbox, and the feed says who stopped by. Only the two of them see a note. Spec: [the-home.md](../game/the-home.md) §13.

### ☑ 8.2 (#470) · v1.5 · Coziness, a rating that only rises
- Each different piece of furniture, wallpaper and floor a room has ever held counts once; the list only grows. Six names, from Just moved in to Warm as fresh bread. Shown under your room and on a friend's shelf. Spec: [the-home.md](../game/the-home.md) §14.

### ☑ 8.3 (#471) · v1.5 · Four facings for the pieces that need them
- The chair turns four ways and the window seat two, with Turn (or R) in Decorate. `left` and `right` still mean facing the room, so no saved room changes. Spec: [the-home.md](../game/the-home.md) §15.

### ☑ 8.4 (#472) · v1.6 · A second room, bought with gems
- Claude's choice, at Adam's word (2026-11-23): the roof, opened for 15 gems, with its own layout that friends can visit too. Built: spec in [the-home.md](../game/the-home.md) §16.

### ☑ 8.5 (#473) · v1.5 · Release v1.5.0
- 8.1–8.3 went out as v1.5.0 (2026-11-23, #478); the roof follows as v1.6.0.

**Order:** 8.1, 8.2, 8.3, then 8.5 (v1.5.0), then 8.4 (v1.6.0).

**Done (2026-11-23):** v1.5.0 (#478) and v1.6.0 (#480) are live; the epic #468 is closed.

## Phase 9 — Visiting together, live (#482)

**Goal:** the last of #447. Friends in one house see each other walk, on the wire's Realtime ([ADR 0056](../decisions/0056-visiting-together-live.md)). Adam's Realtime setting was done on 2026-11-18 (HANDOFF 112).

### ☑ 9.1 (#482) · v1.7 · Visiting together, live
- A guest sees their host walk when the host is home. A host sees whoever comes by. Spec: [the-home.md](../game/the-home.md) §17. Merged ([#483](https://github.com/Adamzvulun/Liron/pull/483)).

### ☐ 9.2 · v1.7 · Release v1.7.0

### ☑ 9.3 (#487) · v1.7 · The last fade in reading Arabic: read it aloud
- From LATER ("no decision needed"). Long-known words have no choices: read it aloud, hear the speaker, say how it went. Spec: [arabic-script-lessons.md](../game/arabic-script-lessons.md) §5.

### ☑ 9.4 (#489) · v1.7 · Pattern badges: verbs shaped like a binyan
- From LATER ("no decision needed"). A taught verb whose shape matches a binyan says so, and opens to how and to its fellow verbs. Research: [verb-shapes.md](../research/verb-shapes.md).

### ☑ 9.5 (#491) · v1.7 · The regulars' tales
- From LATER ("no decision needed"): micro-stories made only of words you know. Passing a regular's trial earns their tale. Built for all 113 chapters. Spec: [arabic-core-words.md](../game/arabic-core-words.md).

## Phase 10 — Safe for friends (#495)

**Goal:** before friends arrive (#332), we hear when the game breaks, a friend can take their data and leave, and the dependencies and backlog are current. Planned 2026-11-23 from a gap audit ([next-work-2026-11-23.md](../research/next-work-2026-11-23.md)). Not started: planning only, at Adam's word.

### ☑ 10.1 (#499) · v1.8 · Our own error log
- The page's errors go to a capped table in our own database. They never hold what the player typed, and only Adam reads them, in the dashboard. [ADR 0058](../decisions/0058-our-own-error-log.md), accepted: Adam chose our own log (2026-11-23).

### ☑ 10.2 (#500) · v1.8 · Take your data, and leave
- Download my data (one JSON file, read under RLS). Leave Waymark, through an RPC, with the existing cascades removing the rest. Adam: yes, a friend may delete their own account, with the proper conventions: the password, a typed confirmation, and a download offered first (2026-11-23).

### ☑ 10.3 (#501) · v1.8 · Dependency refresh (minor versions)
- Vite, Vitest, Playwright, supabase-js and the lint tools. Not TypeScript 7 or `@types/node` 26.

### ☐ 10.4 (#498) · Tidy the backlog (Adam closes)
- #9, #38, #39, #447, #304–#308 and #320 are open, but their work is built.

### ☐ 10.5 (#502) · v1.8 · Release v1.8.0

**Order:** 10.3, then 10.1 and 10.2 in one PR (ADR 0057), then 10.4 and 10.5. The two tale errors the Part 2 check found (tales 33 and 41; see 13.1) were fixed on 2026-11-26, as the agent team’s test run.

## Phase 11 — Hearing the street: sentence listening (#496)

**Goal:** understand spoken Arabic, the vision's first goal. **Hear it** in the echo well: a native deck sentence with no text, then its meaning, then its words in order from a word bank. Spec: [arabic-listening.md](../game/arabic-listening.md). The deck has 536 recorded sentences of four words or more.

### ☐ 11.1 (#503) · v1.9 · The sentence pool and its reviews
### ☐ 11.2 (#504) · v1.9 · *Hear it* in the echo well
### ☐ 11.3 (#505) · v1.9 · Contract, events, the road and the Guidebook
### ☐ 11.4 (#506) · v1.9 · Release v1.9.0

**Order:** 11.1–11.3 in one PR, then 11.4.

## Phase 12 — Faster than thought: Morse past 20 wpm (#497)

**Goal:** keep ADR 0009's promise of 25+ wpm and a manual override. Today everything plays at a fixed 20 wpm. Spec: [morse-speed.md](../game/morse-speed.md), after CW Academy's Intermediate and Advanced curricula.

### ☑ 12.1 (#507) · v1.10 · Your speed: the model and the tower's speed dial
### ☐ 12.2 (#508) · v1.10 · The speed ladder (22 → 35 wpm)
### ☐ 12.3 (#509) · v1.10 · The Long Copy: head copy, then copy behind
### ☐ 12.4 (#510) · v1.10 · The operators follow your speed
### ☐ 12.5 (#511) · v1.10 · Release v1.10.0

**Order:** 12.1 first, then 12.2–12.4 in one PR, then 12.5. Ordered last on purpose: the faster speeds open only after 90% at 20 wpm with standard spacing (pre-mortem, research note).

## Phase 13 — True and lasting (#513)

**Goal:** check three things the game rests on but nothing checks: our own Arabic is right, the free database lasts, and the game shows learning toward the vision's goals. From [next-work-2026-11-23.md](../research/next-work-2026-11-23.md) Part 2 (the-fool, *expose my assumptions*).

### ☐ 13.1 (#515) · v1.11 · Our Arabic agrees with its Latin (a CI check)
### ☐ 13.2 (#516) · v1.11 · The data budget: measure, then a retention ADR
### ☐ 13.3 (#517) · v1.11 · The milestone check ([milestone-check.md](../game/milestone-check.md))
### ☐ 13.4 (#518) · v1.11 · Release v1.11.0

## Phase 14 — Writing words (#514)

**Goal:** the vision's "basic writing". *Spell it* at the slate, checked on the letters only, then the inn opens on the Arabic keyboard. Spec: [arabic-spelling.md](../game/arabic-spelling.md).

### ☐ 14.1 (#519) · v1.12 · *Spell it* at the slate
### ☐ 14.2 (#520) · v1.12 · The inn opens on the Arabic keyboard once you can spell
### ☐ 14.3 (#521) · v1.12 · Release v1.12.0

## Phase 15 — Songs: learn the words through music (#522)

**Goal:** paste a YouTube link, and that's all. The song is heard, written down, timed, translated and transliterated by itself, and laid out as karaoke. Gemini (paid, about $0.03 a listen) hears the public link (Google's own feature, no download), with LRCLIB's lyrics as a hint, and Claude (paid) explains each line. It plays in YouTube's own player. Songs are shared between friends, so each is heard once. Kept lines become review cards that play from the video. Spec: [song-karaoke.md](../game/song-karaoke.md). Research: [song-karaoke-2026-11-23.md](../research/song-karaoke-2026-11-23.md). [ADR 0059](../decisions/0059-songs-from-youtube.md), Accepted (Adam, 2026-11-23: link only, shared songs, after Phase 14, paid Gemini and Claude). Before 15.3, Adam sets up the songs' Google Cloud project with billing and the two keys in Vercel.

### ☐ 15.1 (#523) · v1.13 · CSP and privacy for YouTube's player, Gemini and LRCLIB
### ☐ 15.2 (#524) · v1.13 · The song engine: link, LRC, `MM:SS` times, timing, word marking
### ☐ 15.3 (#525) · v1.13 · `api/song.ts`: lookup, Gemini listens, explain, shared songbook, limits
### ☐ 15.4 (#526) · v1.13 · The singer's corner
### ☐ 15.5 (#527) · v1.13 · *Keep this line*: song review cards, events, contract
### ☐ 15.6 (#528) · v1.13 · Release v1.13.0

## Parked: ordered after everything above, each waiting on Adam

| Item | Why it waits | What un-parks it |
|---|---|---|
| **The regulars speak aloud** 🚧 (#342) | There is no free Arabic voice that meets the rules so far. Adam will look at Azure himself (2026-11-16); he ruled it out on 2026-11-02, so the choice is his to reopen. | Adam's answer on Azure. Then: a research note comparing Azure with whatever else qualifies that day (free tier, card needed or not, dialect, what happens to the text), sample lines from our own sentences, an ADR, and the build: a play button on each regular's line, fetched on press, with a daily allowance, in the pattern of `api/partner.ts`. |
| More Arabic word chapters | The deck is used up. Maknuune is CC BY-SA, so anything built from it must be shared alike. | Adam's call on Maknuune or another source. |
| Recordings for the phrases the deck lacks | No free, licensed source could be verified ([research](../research/phrase-audio-sources.md)). | A verified source, or the voice above. |
| Pronunciation scoring | No free service does it (ADR 0013). Azure's does. | The Azure answer above. |
| A domain and email invites | A yearly cost. | Adam, if handing out passwords proves annoying (ADR 0039). |
| Backups | Adam chose the keep-alive only. | Adam. |

## The gates, in one place (for Adam)

| Gate | What you do | Blocks |
|---|---|---|
| 1.12 | Walk the release checklist on your phone and desktop | The v1.0.0 release |
| 1.13 | Set the Production keys, merge `Release v1.0.0`, sign in, tag | Being live |
| 2.1 | Decide what friends without the deck may learn | Friends learning Arabic |
| 2.2 | Once: read the free numbers on console.groq.com/settings/limits and aistudio.google.com/rate-limit; if the inn's model allows under 200,000 tokens a day, tell Claude ([ADR 0041](../decisions/0041-fair-shares-of-the-free-ai.md)) | Nothing; the ceilings are set low to be safe |
| 2.3 | Try [FRIENDS.md](FRIENDS.md) once on `waymark-dev`: make an account, reset its password by SQL, delete it | Trusting the steps before the first real friend |
| 3.7 | Merge the Fellowship release and add a first friend | Friends on the live site |
| 4.5 | Pick the subject for the first empty plot | The third hall (the guide is written either way) |
| 6.1 | Pick the Lamplighter's name from three, and approve the look | The guide's figure and portrait (6.2–6.3 go ahead meanwhile) |
| 6.8 | Read the guide's words once | The v1.3.0 release |
| Parked | Look at Azure and say yes or no | The regulars' voices, and pronunciation scoring |
