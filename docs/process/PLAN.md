# The plan to "done"

- **Written:** 2026-11-16, by Claude as manager, at Adam's request. **This file is the work order.** Whoever builds next (Claude as engineer) works through it top to bottom and ticks tasks off here.
- **"Done" means** (Adam, 2026-11-16): v1.0.0 is released, the regulars speak aloud, and the Fellowship (M5: friends, visits, challenges, live Morse, the Arena) is built and released. When every task below is ticked and the last gate is passed, the project is done.
- **Adam's answers that shape it (2026-11-16):** the scope is everything including the Fellowship; the live site gets a **fresh start** (no copy of dev progress); a **weekly keep-alive ping** is approved; no in-app export.

## How to work this plan

1. **Order.** Phases run in order: 1, 2, 3, 4, 5. Inside a phase, tasks run in the order listed unless a task says it can run alongside another.
2. **Gates.** A 🚧 gate is a point where only Adam can act. At a gate: do everything up to it, write the question or the checklist where the task says, tell Adam once, and **keep working on the next task that doesn't depend on the gate**. Never wait idle, and never act for Adam (no merge into `main`, no spending, no new data sharing).
3. **Rules that still hold** (CLAUDE.md, HANDOFF, next-session-prompt): research before suggesting; ask Adam about cost, data or lock-in; no technology without an ADR; content is data; American English; deck text never in the bundle or commits; screenshot visual work and look at it; bundle small tasks into one PR into `dev`; full local checks before a PR; never push during a CI run; check the job log before merging; only Adam merges into `main`.
4. **Definition of done for every task:** its "Done when" list is true; tests cover the new behavior and fail without it; tsc, eslint, prettier, vitest (also `TZ=UTC`) and the whole Playwright suite pass; docs are updated in the same PR (STATUS, HANDOFF, the report); the PR is merged into `dev`; the task's box is ticked here.
5. **Verify before building.** Several tasks start with "check whether this already exists". If it does and meets the "Done when" list, tick the task and write one line saying where it lives. Don't build a second one.
6. **If a task turns out wrong or impossible,** don't drop it quietly. Write what you found under the task, propose the change, and move on to the next task.
7. **GitHub issues.** Create one epic issue per phase and one issue per task (title = the task's title, body = its section here), with the existing labels. PRs reference them.

## What the audit found (2026-11-16)

**Built and in good shape:** M0–M3, and M4's epics (the Radio Room, the operators' live news, Sit and talk with memory, the Coach and reputation). 113 word chapters, all with a grammar card and a regular. The city and five places are painted. Reviews of every area are fixed with tests. 855 unit tests and 278 browser tests pass. No known vulnerabilities in the dependencies.

**Gaps that matter for a finished project:**

| # | Gap | Where it's handled |
|---|---|---|
| 1 | Twelve commits sit on the work branch with no PR. One small fix (keeping "+100 XP" on one line) was started and put back. | 1.1 |
| 2 | **Nobody has measured learning.** Both retros say so. Your House promises "stats" in its own placeholder text and has none. | 1.4 |
| 3 | A new player lands in the square with nothing telling them where to start. Adam knew; a friend won't. | 1.3 |
| 4 | **Nobody knows if the AI keys work on the dev or live site.** Claude can't reach those sites, and this has blocked "Sit and talk" for days. | 1.5 |
| 5 | The free database pauses after 7 idle days. | 1.6 |
| 6 | Tests run on Chromium only. iPhone Safari, real sound, the real microphone and real keying have only been tried by Adam in passing. | 1.8 (Adam's checklist) |
| 7 | Issues #9, #38, #39 are still open waiting for Adam's try; #137 (speed) is open with no stated finish line. | 1.2, 1.8 |
| 8 | STATUS's "Last updated" line is one paragraph of about 10,000 characters. There are no retros for M2 or M4. `package.json` says version 0.0.0. | 1.7 |
| 9 | A few phrases the deck lacks (السلام عليكم, صباح النور, إن شاء الله, and the "to a woman" forms) have no free, licensed recording. The only lead (Lingua Libre) can't be verified. | 5.2 |
| 10 | **Friends can't learn Arabic words.** Only licensees may read the Lingualism deck (ADR 0011, 0029). A friend who opens the Caravanserai today sees "The deck's words haven't been loaded into Waymark yet." | 3.1 🚧 |
| 11 | "Email me a link" on the login screen can't reach a friend (Supabase's built-in email only reaches Adam). | 3.3 |
| 12 | The AI allowances were set for one player. With friends, everyone shares the same free quotas at Groq and Gemini. | 3.2 |
| 13 | There is no free Arabic voice chosen for the regulars. Azure and on-device models are ruled out (Adam, 2026-11-02). | 2.1 🚧 |
| 14 | Supabase Realtime (live Morse) is a new technology with no ADR. | 4.6 |

**Not gaps (checked, leave alone):** error monitoring (a third-party service would share data; the error boundary and save-failure messages are enough for now), offline use (a website, not a PWA), backups (Adam chose the keep-alive only), more word chapters (the deck is used up; a new source is Adam's call, see 5.2).

---

## Phase 1 — Ready to release v1.0.0

**Goal:** Adam can open the dev site, walk a checklist in under an hour, say "release", and merge one PR.

### ☐ 1.1 Land the work in flight
- **Do:** run the full checks on the 12 local commits (dialog focus trap, lesson header contrast, the Arena tap area, the halls' peeking card, the chest shelf on a narrow phone, their docs). Then finish the started fix: every "+N XP" keeps the number and "XP" on one line (a non-breaking space) in `morse/lesson/Trial.tsx`, `words/WordDrill.tsx`, `words/Rush.tsx`, `recognition/Recognition.tsx`, and wherever else a result line can wrap. Several browser tests match "XP" after a normal space; update them to accept the non-breaking space. Open one PR.
- **Done when:** the PR is merged; at 320 pixels no result line breaks between a number and its unit; this plan and §4bz are in `dev`.

### ☐ 1.2 Give speed (#137) a finish line, then close it
- **Why:** the issue has been open since 2026-11-09 with many fixes and no definition of "fast enough".
- **Do:** measure on the production build with the slowed-phone settings `e2e/city-speed.spec.ts` already uses: first paint of the square, time until a place can be clicked, return to the square from a hall, and the gzipped startup script. Write a budget in `docs/process/CI.md` (use today's numbers plus 15% as the limit, unless a number is plainly bad, in which case fix it first). Make the existing speed test fail above the budget. Put the numbers in the report in plain words.
- **Done when:** the budget is written and tested; the report shows before/after; #137 is closed with a link, or labelled `needs:adam` with one sentence saying what he should try.

### ☐ 1.3 A first-day welcome
- **Why:** gap 3. A level-1 player with no progress sees a square and five doors.
- **Do:** first check what a brand-new account sees today (fake backend with empty state; screenshot phone and desktop). Then design the smallest thing that points the way, in the world's voice, not a tutorial overlay: for example a first quest pinned at the top of the quests ("Start here: the Signal Tower's first lamp" and "…the Caravanserai's first letters") and a one-time note from the city. Screenshot it, look at it, and keep it to one screen. It must never show again once either subject has progress.
- **Done when:** a new account is told in one glance where to go first, on phone and desktop; an account with progress never sees it; browser tests cover both; keyboard and screen-reader users can dismiss it.

### ☐ 1.4 The ledger: learning you can see (stats in Your House)
- **Why:** gap 2. The vision's test is "every lesson teaches something that actually matters", and nothing shows whether it does.
- **Do:** design first, in `docs/game/ledger.md` (short). Use **only data already saved**: reviews and their due dates (FSRS), skill ratings (Glicko-2), subject state (letters unlocked, chapters, trials, sending speed), the daily minutes and streak. Don't add tracking. Proposed contents, to adjust after reading the tables:
  - Arabic: letters known; words met, and words "known" (define it: for example an FSRS interval of 21 days or more); reviews due today; chapters passed; chats held.
  - Morse: characters learned; copy speed; sending speed; recognition best; contacts logged.
  - Habit: days practiced in the last 30, minutes this week, longest streak.
  - One line a subject that says the trend in words ("12 more words known than a week ago").
  Build it as a third panel in Your House, with the house's look. Replace the placeholder sentence in `PLACE_SOON.house`. If a number needs a new database read, add one function with row-level security and a test, the way `my_achievements()` was done.
- **Done when:** Your House shows the ledger for a new player (honest zeros, no "NaN", no empty boxes) and for an advanced one; every number is defined in the design doc and unit-tested against that definition; it fits 320 pixels; no new data is collected.

### ☐ 1.5 A "what's switched on" line in Settings
- **Why:** gap 4.
- **Do:** add a tiny server function (or extend an existing one) that answers, for a signed-in player only, which AI services the site has keys for: `{ groq: true|false, gemini: true|false }`. Booleans only; never a key, never part of one. Show it in Settings under a "Services" heading in plain words ("Sit and talk: ready" / "not set up on this site"). Rate-limit it like the other functions. Add it to DEPLOY's table.
- **Done when:** on a site with no keys the line says so, with a browser test; the function's unit tests prove it leaks nothing and refuses anonymous callers; Adam can read the state of the dev site from his phone.

### ☐ 1.6 The weekly keep-alive (approved by Adam)
- **Do:** a scheduled GitHub Actions workflow, once a week, that runs one trivial read against `waymark-prod` and `waymark-dev` using the secrets that already exist. It must take seconds, print nothing secret, and fail loudly if a project is paused. Document it in SUPABASE.md, with what to do when it fails.
- **Done when:** the workflow exists, has run once by hand (`workflow_dispatch`) with a green log, and the doc explains it. Note for Adam in the report: it uses a few seconds of Actions time a week.

### ☐ 1.7 Docs fit for a release
- **Do:**
  - Rewrite `STATUS.md` so its top is a short current state (phase, what's live, what's next, what waits on Adam). Move the history paragraph into `docs/process/HISTORY.md` unchanged. Keep every link working (`tests/doc-links.test.ts`).
  - Write the missing retros: `retros/M2.md` and `retros/M4.md`, in the shape of M1's and M3's.
  - Set `package.json` to `1.0.0`.
  - Draft the release notes in `docs/process/releases/v1.0.0.md`: what a player gets, in plain words, grouped by place. Not a commit list.
  - Bring README, ROADMAP and the next-session prompt in line with this plan.
- **Done when:** a newcomer can read STATUS in two minutes and know the state; both retros exist; the notes are ready to paste into the release PR.

### ☐ 1.8 Adam's release checklist 🚧
- **Why:** gaps 6 and 7. These are things only a person with a phone can check.
- **Do:** write `docs/process/release-checklist.md`, a walk of about 45 minutes, each line a checkbox with what to do and what "good" looks like. It must cover: iPhone Safari and desktop; sound with the silent switch on and off; the microphone prompt and "Say it"; keying with the tap pad (does the tone lag?); one Koch lesson; one script lesson (#38, #39); one word session; the coffee corner; Sit and talk and a Radio Room contact (after reading 1.5's line); buying something; opening a chest; changing the avatar; sign out and in; "Email me a link". End with "anything that annoyed you".
- **Then:** tell Adam it's ready. Fix what he reports, with tests. Close #9, #38 and #39 when he has ticked their lines.
- **Done when:** the checklist exists; Adam has walked it; every problem he found is fixed or filed with his agreement.

### ☐ 1.9 One last review pass
- **Do:** with the `code-reviewer` and `secure-code-guardian` skills, review everything changed since the last review of each area (2026-11-15), plus `api/`, `vercel.json` headers and the migrations added since. Run `npm audit`. Fix findings with tests. List what was reviewed in `docs/process/reviews/`.
- **Done when:** the review file exists; no open finding of medium or higher.

### ☐ 1.10 The release PR 🚧
- **Do:** follow DEPLOY's "The first real release, v1.0.0" (already written). Open the PR from `dev` into `main` titled `Release v1.0.0` with the release notes. Tell Adam the steps that are his: the Production keys, merging, his account on the live database (a fresh start, as he chose), the tag.
- **Done when:** Adam has merged it, the DB migrate run on `main` is green, and he has signed in on the live site. **Don't wait for this to start Phase 2.**

---

## Phase 2 — The regulars speak aloud

**Goal:** at the inn, a regular's line can be heard as well as read. Text first stays the default (ADR 0007).

### ☐ 2.1 Find a voice, then ask Adam 🚧
- **Constraints already decided:** free tier only; hosted (nothing runs on the device as a model); **not Azure**; the free AI must not need a card; say openly what is sent where.
- **Do:** a research note, `docs/research/arabic-voices.md`. Verify each candidate on its own documentation, today, not from memory: is there a free tier, what are its limits, does it speak Arabic, which dialect, what happens to the text sent, is a card needed. Start with the two providers Waymark already uses (Gemini's speech output, which the 2026-11 spike used once, and whatever Groq offers), then the browser's built-in speech (free, no data leaves the device, but quality and dialect vary by phone; check whether it counts as "running locally" in Adam's sense and say so). For each one that qualifies, make five sample lines from our own sentences (never deck text) and note how Palestinian they sound to the extent you can judge; say plainly that Adam's ear is the test.
- **Then:** write ADR 0040 with a recommendation and put the question to Adam in STATUS: which voice, or none. Attach or link the samples.
- **Done when:** the note, the samples and the ADR exist, and the question is asked. If no candidate qualifies, say so; the phase then ends here with the reason recorded, and that counts as done.

### ☐ 2.2 Build it (after Adam's answer)
- **Do:** a server function in the pattern of `api/partner.ts` (key on the server, signed-in callers only, a daily allowance in the database, an eval script). A small play button on each regular's line; the line's audio is fetched on press, never automatically. Keep the "said openly" note at the table truthful about the new service. Respect the phone's silent switch the way Morse audio does. No voice for the Coach.
- **Done when:** a line plays on phone and desktop; over the allowance it says so kindly and the text still works; without the key the button isn't shown; tests cover the function (caps, refusal, no key) and the button; DEPLOY's table and 1.5's Services line include it.

---

## Phase 3 — Ready for friends

**Goal:** a second person can use Waymark safely and fairly before any social feature exists. This phase is short, and it comes first because E18 builds on it.

### ☐ 3.1 What a friend may learn 🚧
- **Why:** gap 10. This is a licence question, so it's Adam's.
- **Do:** read the Lingualism deck's licence terms as recorded in `sources/README.md` and on the seller's page, and write down exactly what they allow. Then put the options to Adam with a recommendation:
  - (a) A friend who buys their own deck is added as a licensee by Adam (SUPABASE.md already has the step). Cost: the friend's, $25.
  - (b) Friends without the deck get everything that is ours: Morse in full, the Arabic letters and marks, the echo well's sounds, the grammar cards. The word path and phrases stay shut for them.
  - Both can hold at once (my recommendation, if the licence reads the way ADR 0011 says).
- **Build, whatever he picks:** a non-licensee never sees "haven't been loaded". Each shut station says why in one friendly line and what opens it. The courtyard's plaques and the quests don't point a non-licensee at shut stations.
- **Done when:** Adam has answered; a browser test signs in as a non-licensee and walks the Caravanserai with no dead end and no misleading message.

### ☐ 3.2 Fair shares of the free AI
- **Why:** gap 12.
- **Do:** list every allowance (inn lines, partner replies, speech checks, voices if built) with the provider's current free limits, checked on their pages. Work out what five players at once would use. Change the per-player numbers, or add a site-wide daily ceiling in the database, so one player can't use up everyone's day. Say what a player sees when the site's day is spent.
- **Done when:** the sums are in the ADR or the design doc; the ceilings are enforced in the database with tests; the messages are tested.

### ☐ 3.3 Sign-in for someone who isn't Adam
- **Why:** gap 11, and ADR 0039's option (a).
- **Do:** "Change your password" in Settings (one form, the current rules). Rewrite the login screen's "Email me a link" so it doesn't promise what can't arrive: keep it working for Adam, and tell everyone else to ask whoever invited them. Write `docs/process/FRIENDS.md` for Adam: how to create a friend's account in the Supabase dashboard, hand over a password, reset one, add a licensee, and remove a friend and their data. Try the account creation once on `waymark-dev` if the tools allow it; if not, mark the steps "untested" clearly and add them to Adam's checklist.
- **Done when:** a player can change their password, with tests; the login copy is honest; FRIENDS.md exists.

### ☐ 3.4 Two players, one database
- **Do:** a test pass with two fake players proving that neither can read or change anything of the other's: reviews, ratings, state, chats, memories, chests, purchases, allowances. Extend the existing database tests; fix anything found. Check every server function for per-player limits.
- **Done when:** the tests exist and pass; findings are fixed; the review file lists what was checked.

---

## Phase 4 — The Fellowship (M5)

**Goal:** friends share the city, as written in [fellowship.md](../game/fellowship.md) and settled by ADR 0039. Order: invites, visits, the feed, friends in the square, challenges and the Arena, co-op quests, gifts, live Morse. **Every slice ships on its own PR and is useful alone.**

Rules for the whole phase: what friends see is §3's list and nothing else, enforced by the database (a view plus row-level security), never by the screen. No leagues, no demotion, no public ranking. A player with no friends sees no empty social clutter. Write the design for each epic in `docs/game/` before building, with screenshots of the concept, as E10–E17 did.

### ☐ 4.1 E18 — Friend codes and the Fellowship list
- **Do:** the `friendships` table and the shared view (ADR 0039's consequences). "Add a friend" by code: each player has a short code; typing a friend's code sends a request; they accept or decline; either can remove the other. The Fellowship list in Your House: each friend's avatar, name, level, ranks and titles, streak, pet.
- **Done when:** two test players can link and unlink; a non-friend can read nothing; requests can't be spammed (a limit, tested); the list fits 320 pixels and has a kind empty state that explains friend codes.

### ☐ 4.2 E19a — Visit a friend's house
- **Do:** from the list, walk into a friend's house: their room, avatar, gear and trophies, read-only.
- **Done when:** it shows only §3's fields (a test asserts the exact fields the view returns); there is a clear way home; no wardrobe controls appear.

### ☐ 4.3 E19b — The party feed and friends in the square
- **Do:** milestones as events friends can read (a rank taken, a chapter passed, a trial passed, a streak of 7/30/100, an achievement), written by the database when they happen, never by the browser. Show them on the Notice Board. Then draw friends' avatars standing in the square (a few, without hurting 1.2's speed budget).
- **Done when:** the feed shows friends' milestones newest first and nothing private; a player can switch off sharing their own milestones in Settings; the square stays inside the speed budget with five friends.

### ☐ 4.4 E19c — Challenges and the Arena (A7)
- **Do:** opt-in challenges built on scores that exist: a callsign rush and a word round. One friend sends a challenge with their score; the other plays the same kind of round when they like; both personal bests are shown; no loser screen. Paint the Arena and open it as the challenges' home; retire the "locked" sign and its message.
- **Done when:** a challenge can be sent, played, answered and declined, with tests for each state and for expiry; scores are checked by the database, not trusted from the browser; the Arena is painted, screenshotted and fits phone and desktop.

### ☐ 4.5 E19d — Fellowship quests and gifts
- **Do:** co-op goals on the daily-contract machinery (ADR 0032): "together, 10 chats at the inn this week". Then gifting a Market ware to a friend, paid in the giver's gold, through the database's purchase path (ADR 0029, 0033).
- **Done when:** progress counts every member's real events once; rewards are paid by the database once each; a gift can't create gold or duplicate an item (tests for both).

### ☐ 4.6 E20 — Live Morse between friends
- **Do:** first the ADR for Supabase Realtime (limits checked on Supabase's pages today; what is sent; what happens on a dropped connection). Then: two friends in the Signal Tower, each hearing the other's key as tones, with the timing sent as key-down and key-up events. Reuse the sidetone and the decoder. Nothing is stored.
- **Done when:** two browser contexts in one test can key to each other and decode it; a dropped link says so and recovers or ends cleanly; only friends can join a room (tested); it works with the phone tap pad.

### ☐ 4.7 Release the Fellowship 🚧
- **Do:** the M5 retro, release notes, an addition to Adam's checklist for two accounts on two devices, and the release PR (the next major version, ADR 0027). Adam merges.
- **Done when:** it's live and Adam has added a first friend using FRIENDS.md.

---

## Phase 5 — Closing

### ☐ 5.1 The last sweep
- **Do:** repeat the phone-and-desktop sweep over everything built in phases 2–4 (the method is in HANDOFF items 54–82). Bring every doc in line with what exists. Empty the "open questions" list or mark each as Adam's standing choice.
- **Done when:** STATUS says the project is done, with what lives where and how to run it.

### ☐ 5.2 What stays open on purpose (write it down, don't build it)
- **Do:** one file, `docs/process/LATER.md`, listing what was ordered after "done" and why: more word chapters (needs a new source; Maknuune is CC BY-SA, so anything built from it must be shared alike, which is Adam's call); recordings for the phrases the deck lacks ([research](../research/phrase-audio-sources.md)); pronunciation scoring (no free service does it, ADR 0013); a domain and email invites (a yearly cost); backups (Adam chose the keep-alive only); M6's world events and new guild halls.
- **Done when:** the file exists and the roadmap points to it. Per CLAUDE.md, this is ordering, not cutting.

---

## The gates, in one place (for Adam)

| Gate | What you do | Blocks |
|---|---|---|
| 1.8 | Walk the release checklist on your phone and desktop | The v1.0.0 release |
| 1.10 | Set the Production keys, merge `Release v1.0.0`, sign in, tag | Being live |
| 2.1 | Listen to the voice samples and pick one, or none | Phase 2's build |
| 3.1 | Decide what friends without the deck may learn | Friends learning Arabic |
| 4.7 | Merge the Fellowship release and add a first friend | "Done" |
