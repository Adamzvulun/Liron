# Status: start here

**Read this first in every new session**, then the latest [handoff](HANDOFF.md). It says where we are, what's next, and how this environment behaves. Keep it current: update it at the end of every session.

- **Last updated:** 2026-11-06. The Groq "understood" check is built (ADR 0014 amended); it stays off until Adam adds `GROQ_API_KEY` in Vercel ([report](reports/2026-11-06.md)). Before that, 2026-11-05: E6 and E7 are merged (PR #73). E8 and E9's first part are built on `dev` (PRs #74–#85). The full review is done (PRs #88–#122). Adam tried the dev site on 2026-11-05 and filed four problems, [#123](https://github.com/Adamzvulun/Liron/issues/123)–[#126](https://github.com/Adamzvulun/Liron/issues/126). **All four are fixed** (PRs #128–#132). #125 is closed: Adam approved the shortened lesson 1–3 word list on 2026-11-09 (PR #141). Adam's report: [reports/2026-11-05.md](reports/2026-11-05.md) (the whole run since 2026-11-03 night); the day-by-day detail is in [reports/2026-11-04.md](reports/2026-11-04.md).
- **Phase:** **M1 (Foundations) is done** (2026-11-03; [retro](retros/M1.md)). **Next: M2, first playable**: the first release, v1.0.0 (ADR 0027), comes once it has something to learn. History: M1 started when Adam said go (2026-11-02). #12–#14 (scaffold, tests, CI) are merged into `dev` ([PR #50](https://github.com/Adamzvulun/Liron/pull/50)); `dev` is the default branch. **v0.1.0 is live at https://waymark-phi.vercel.app**; the dev site is https://waymark-git-dev-adamzvuluns-projects.vercel.app (behind a Vercel login). E1 is done (2026-11-02). **New branch flow (ADR 0015):** feature → `dev` (live dev site) → `main` (live site). Adam has free Vercel and Supabase accounts (2026-11-02).

## Where we are
| Item | State |
|---|---|
| Vision, name (Waymark), ADRs 0001–0034 | ✅ locked ([vision](../vision.md), [decisions](../decisions/)) |
| Visual concept: city v3 (painted style) | ✅ approved "for now" ([concept](../design/concept-v0/README.md), live canvas linked there) |
| Sources: Lingualism deck (bought), Maknuune, Madrasa structure | ✅ ([sources](../../sources/README.md), [research](../research/arabic-sources.md)) |
| Backlog: M1 + M2 as GitHub issues | ✅ #1–#49 |
| Gemini speech spike (#1) | ✅ **partial** and closed: transcription usable; pronunciation scoring doesn't work on free Gemini, so feedback uses record-and-compare and ear training ([results](../../spikes/gemini-speech/README.md#results-phase-1-2026-11-01), [ADR 0013](../decisions/0013-speech-on-free-gemini.md)). |
| Non-Gemini speech API | ✅ **Groq `whisper-large-v3`** is the speech model (2026-11-02): 28/30 deck sentences usable vs Gemini's 24/30, 2,000 requests/day free. It catches no pronunciation mistakes either (ح/ه 0/6), so there's still no per-sound scoring. ([analysis](../../spikes/gemini-speech/results/2026-11-02-groq-analysis.md), [ADR 0014](../decisions/0014-groq-whisper-for-speech.md)) |
| App code | ✅ M1 (E1–E5) done (2026-11-03); M2's E6–E9 built on `dev` (2026-11-04), E10 next. M1: scaffold, tests, CI, hosting ([DEPLOY](DEPLOY.md)); login, player data, XP/levels/streak; FSRS, Glicko-2, content pipeline; the painted city with clickable places, HUD and phone layout. Live: https://waymark-phi.vercel.app · dev: https://waymark-git-dev-adamzvuluns-projects.vercel.app |

## What to do next (in order)
1. **Leftovers for Adam:** optionally create the `v0.1.0` tag in GitHub Releases for the record (target `main`; the session's git proxy refuses tag pushes). The next tag is `v1.0.0` (ADR 0027). Delete the old branches `claude/learning-hub-arabic-morse-20ckww` and `claude/nifty-cray-n4594x` (both already in `dev`; Claude's session isn't allowed to delete branches).
2. **M1: Foundations**: ~~E1 (#2)~~ is done. E2 (#3):
   - ~~#16 login~~: done. Adam is signed in on the dev site (2026-11-02).
   - ~~#17 schema~~: done, with **automatic migrations** (ADR 0018). The first run applied it to `waymark-dev` (2026-11-02). Never apply migrations by hand.
   - ~~#18 subject contract~~ ([ADR 0019](../decisions/0019-subject-contract.md)): done; its migration applied itself to `waymark-dev`.
   - ~~#19 XP, levels, gold, gems~~ ([ADR 0020](../decisions/0020-fast-levels-and-rewards.md), [economy](../game/economy.md)): done. Adam chose a fast pace (level 5 on day one).
   - ~~#20 streak and daily goal~~ ([ADR 0021](../decisions/0021-streak-and-daily-goal.md)): done. **E2 is complete** (2026-11-02); all its migrations are applied to `waymark-dev`.
   - **E3:** ~~#21 FSRS~~ ([ADR 0022](../decisions/0022-fsrs-spaced-repetition.md)) and ~~#23 content format and private pipeline~~ ([ADR 0023](../decisions/0023-content-format-and-private-pipeline.md)) are merged (2026-11-03), with their migrations applied to `waymark-dev`. Both secret keys are set. ~~#22 Glicko-2 skill ratings~~ ([ADR 0024](../decisions/0024-glicko2-skill-ratings.md)) is merged (2026-11-03). **E3 is complete.**
   - ~~**E4 city v0**~~: done (2026-11-03). #24 city screen ([ADR 0025](../decisions/0025-city-painted-in-the-browser.md)), #25 clickable places ([ADR 0026](../decisions/0026-routing-without-a-library.md)), #26 HUD with real data, #27 phone layout. Adam reviewed it on PC and an iPhone 16 and approved it after three fixes: the scene fills the window, the Arena's flags are gone, the phone HUD is slim. The deck's audio upload now runs 8 at a time (PR #64).
   - ~~**E5 avatar v0 (#6)**~~: done, merged in [PR #68](https://github.com/Adamzvulun/Liron/pull/68) (2026-11-03). #28 is the paper-doll avatar and #29 the wardrobe in Your House. Adam approved the concept on 2026-11-03 ("looks good for now, we can add more stuff later"). See [avatar](../game/avatar.md). **M1 is done**, and the [M1 retro](retros/M1.md) is written. Next is M2. **No release to `main` yet:** Adam releases only when there is something to learn (2026-11-03). That means M2 content, not just the city and styling.
   - Adam has created the free Vercel and Supabase accounts (2026-11-02). Connecting the GitHub repo to Vercel happens in his dashboard; Claude gives the steps.
   - #16 (Supabase): **two free projects**, `waymark-prod` and `waymark-dev` (Adam, 2026-11-02; ADR 0015). Adam's steps: [SUPABASE](SUPABASE.md).
   - After E1, do E2 (#3) and E3 (#4) before E4 (#5) and E5 (#6).
3. **M2: First playable** (#7–#11): **next.** Per the M1 retro: design first, and measure learning from day one.
   - **Sprints, one theme each, never mixed** (Adam, 2026-11-03).
   - **The Morse sprint comes first** (E6 receive, E7 send), then the Arabic sprint (E8, E9).
   - Letter order settled: Koch order, K and M first (Adam: "A", [ADR 0028](../decisions/0028-morse-koch-order-and-gate.md)). How lessons work: [morse-lessons.md](../game/morse-lessons.md).
   - Morse sprint order: #30 audio engine → lesson concept (screenshotted, Adam approves) → #31 → #32 → #33, #34 → E7 (#35–#37).
   - **Done:** #30 sound engine and the lesson concept ([PR #71](https://github.com/Adamzvulun/Liron/pull/71)); Adam approved the lesson design (2026-11-03, "thats great"). The city's hanging banners were removed at his request ([PR #72](https://github.com/Adamzvulun/Liron/pull/72)). #31 (Koch lessons that save progress) merged in [PR #72](https://github.com/Adamzvulun/Liron/pull/72), with the Instant Recognition concept; Adam approved it (2026-11-03). **In [PR #73](https://github.com/Adamzvulun/Liron/pull/73) (merged 2026-11-04):** #32 (saving rounds), #33 (tower hall) and #34 ("The Silent Beacon" ch. I–II with playable trials), which Adam approved on 2026-11-03. **Built overnight on Adam's instruction, awaiting his review:** the tower's painted room (#33) and E7 sending (#35 straight key and sidetone, #36 decoder, #37 fist analysis). **2026-11-04:** Adam reviewed the preview: "the room needs more depth", the rest looks OK (sending not tried yet). The room is now painted in true perspective, and Morse plays through the iOS silent switch. **#73 merged by Adam (2026-11-04): the Morse sprint is done.**
   - **Arabic sprint (E8), 2026-11-04.** Adam told Claude to keep working, one branch per feature, and to merge into `dev` when green. Merged into `dev` so far:
     - [#74](https://github.com/Adamzvulun/Liron/pull/74): design and letter data (#38, #39).
     - [#75](https://github.com/Adamzvulun/Liron/pull/75): private content for subjects.
     - [#76](https://github.com/Adamzvulun/Liron/pull/76): Meet/Listen/Read lessons (#41's reading half).
     - [#77](https://github.com/Adamzvulun/Liron/pull/77): the painted courtyard and "The Long Road In" ch. I with the Painted Sign trial (#42, #43).
     - [#79](https://github.com/Adamzvulun/Liron/pull/79): vowel marks (#40).
     - [#80](https://github.com/Adamzvulun/Liron/pull/80): the slate, tracing and writing from memory (#41).
     - [#81](https://github.com/Adamzvulun/Liron/pull/81): Read choices fade from Hebrew to Latin.
     - [#82](https://github.com/Adamzvulun/Liron/pull/82), [#85](https://github.com/Adamzvulun/Liron/pull/85): the coffee corner, survival phrases (#45), 9 sets. #44 (importing the deck) is closed as done.
   - **Adam's decisions (2026-11-04, "yes to all except 1.0.0"):**
     - He approved every pick in [reports/2026-11-04.md](reports/2026-11-04.md).
     - **The Groq speech check is approved:** "Say it" may send a recording to Groq Whisper (ADR 0014) through a server-side Vercel function. The key never reaches the browser.
     - #44 is closed.
     - **E10's draft and Notice Board concept are approved:** [quests-and-rewards.md](../game/quests-and-rewards.md).
     - **No v1.0.0 release yet.**
   - **Review (2026-11-04):** Adam asked for a full check of the work so far by specialist reviewers (code, security, QA, learning design, UX, architecture). Results: [full review](reviews/2026-11-04-full-review.md) and [security](reviews/2026-11-04-security.md). Fixes so far:
     - [#88](https://github.com/Adamzvulun/Liron/pull/88): the database is the only writer of rewards ([ADR 0029](../decisions/0029-database-is-the-only-writer-of-rewards.md)). Applied to `waymark-dev`. **The deck is now read only by `content_licensees`** ([SUPABASE](SUPABASE.md#adding-a-licensee)).
     - [#89](https://github.com/Adamzvulun/Liron/pull/89): Morse copy scoring can't be passed by mashing keys; the coffee corner's "Next:" message.
     - [#90](https://github.com/Adamzvulun/Liron/pull/90): the microphone and Morse audio contexts are always released.
     - [#92](https://github.com/Adamzvulun/Liron/pull/92)–[#96](https://github.com/Adamzvulun/Liron/pull/96): the Hebrew bridge, empty-practice crash and error boundary, button contrast and Koch feedback, CI secrets and audio links, two Arabic progress loopholes.
     - [#98](https://github.com/Adamzvulun/Liron/pull/98)–[#107](https://github.com/Adamzvulun/Liron/pull/107), Adam's ten decisions: final k is כ; a lesson passes on two different days; لا in lesson 3 and ة in lesson 5; Guest rank is reading only; Arabic XP at 2 per answer; coverage reports (ADR 0030); set 6 gets "I didn't understand" and the missing phrases are scheduled ([audio sources](../research/phrase-audio-sources.md)); well-known words are read by picking their recording (Latin optional); fair FSRS grades (`gradeFrom`); Listen skips words said as another letter.
     - [#108](https://github.com/Adamzvulun/Liron/pull/108): security headers and a strict CSP ([DEPLOY](DEPLOY.md#security-headers)). [#109](https://github.com/Adamzvulun/Liron/pull/109): guild-coloured text passes AA. [#111](https://github.com/Adamzvulun/Liron/pull/111): security L2 and L6 fixed, L5 checked (not a gap). [#112](https://github.com/Adamzvulun/Liron/pull/112): reveals show how the speaker says the word. [#110](https://github.com/Adamzvulun/Liron/pull/110): the slate's plaque no longer covers the questline scroll.
     - [#113](https://github.com/Adamzvulun/Liron/pull/113): this status update. [#114](https://github.com/Adamzvulun/Liron/pull/114): one wrong Read choice differs only in a letter's dots. [#115](https://github.com/Adamzvulun/Liron/pull/115): the slate requires the dots. [#116](https://github.com/Adamzvulun/Liron/pull/116): no alif after tanween in the Hebrew spelling (شكرًا → שֻכְּרַן). [#117](https://github.com/Adamzvulun/Liron/pull/117): e2e tests that pass and fail a script lesson on purpose, with a fake database that keeps state. [#118](https://github.com/Adamzvulun/Liron/pull/118): docs that disagreed with the code, and the daily chest's test now checks `economy.ts`.
     - GitHub: epics #2–#5 closed (M1 is done). #38 and #39 are built and labelled `needs:adam`.
   - **Adam, when you have a minute:** try the script lessons (#38, #39), the vowel marks (#40), the slate (#41) and the coffee corner (#45) on the dev site. They're closed or labelled `needs:adam`, but the Definition of Done asks for your try.
   - **One save per session ([ADR 0031](../decisions/0031-one-save-per-session.md)):** a finished session is saved by one `save_session` call, all or nothing; a repeated session id applies nothing. Every session report uses `saveSession`. **Adam:** its migration reaches prod with the next release (ADR 0018).
   - **Subject knowledge out of core (ADR 0019, amended):** each subject names its building and its Notice Board line; the board no longer promises rewards nothing pays. The Rider's breeches now unlock with "Pass a first-chapter trial in any guild" (was "Learn all 28 Arabic letters"). **Adam:** say if you want the old wording back. **The full review is done.**
   - **Adam's findings (2026-11-05), measured and filed** ([research](../research/dev-site-problems-2026-11-05.md)):
     - [#123](https://github.com/Adamzvulun/Liron/issues/123) (p0): the city square is slow: one 1920×1080 SVG with turbulence and blur filters and 9 animations inside it (≈34 fps idle, ≈17 fps on hover at 4× CPU throttle). Halls are smooth.
     - [#124](https://github.com/Adamzvulun/Liron/issues/124) (p1): loading: one 815 KB bundle, two round trips per question's audio, the deck re-downloaded every visit.
     - [#125](https://github.com/Adamzvulun/Liron/issues/125) (p0): Arabic meanings come straight from deck rows: section context lost (وزير "queen"), homographs (بابا "pope"), verb forms, grammar tags in the romanisation, unsuitable early words.
     - [#126](https://github.com/Adamzvulun/Liron/issues/126) (p1): American spelling in everything players see ("Practice", "Traveler", "color", "gray").
   - **Fixed (2026-11-05 evening):**
     - [#128](https://github.com/Adamzvulun/Liron/pull/128) (#123): the square is held still, and small layers animate (ADR 0025 amended). `e2e/city-speed.spec.ts` holds the frame budget, timed against a reference scene since [#132](https://github.com/Adamzvulun/Liron/pull/132).
     - [#129](https://github.com/Adamzvulun/Liron/pull/129) (#125): `content/arabic/lesson-words.json` is the reviewed list for lessons 1–3: deck ids plus our glosses, with no deck text. Tags are stripped, homographs are told apart by their marks, and verbs are kept out. Adam found it too long (2026-11-09); [#141](https://github.com/Adamzvulun/Liron/pull/141) cut it to 10, 12 and 16 of the most useful words, and he approved that.
     - [#130](https://github.com/Adamzvulun/Liron/pull/130) (#126): American spelling, guarded by `tests/spelling.test.ts`, with the rule in CLAUDE.md.
     - [#131](https://github.com/Adamzvulun/Liron/pull/131) (#124): the halls are split into their own chunks, a session's audio is signed in one request, and the deck is kept in IndexedDB (ADR 0023 amended).
   - **The Groq "understood" check (2026-11-06):** a "Would they understand me?" button on the coffee corner's Say it cards. `api/understood.ts` (a Vercel function) checks sign-in, licence and a cap of 100 a day in one database call (`claim_speech_check`), then asks Groq Whisper. The browser compares the text with the phrase (`phrases/understood.ts`). [ADR 0014, amended](../decisions/0014-groq-whisper-for-speech.md). **Off until Adam adds `GROQ_API_KEY` in Vercel**; the [report](reports/2026-11-06.md) lists the cost, data and lock-in facts for him.
   - **E10 decisions written (2026-11-09):** [0032](../decisions/0032-subject-events-and-daily-contracts.md) subject events and contracts, [0033](../decisions/0033-inventory-chests-and-market.md) inventory, chests and Market, [0034](../decisions/0034-streak-shields.md) streak shields.
   - **E10 build (2026-11-09):**
     - [#136](https://github.com/Adamzvulun/Liron/pull/136) (#47): each started questline shows on the Notice Board and in the HUD ("The Silent Beacon I: Embers · 6/8 lamps"), read from the subject's own state (`tracker.ts`).
     - [#138](https://github.com/Adamzvulun/Liron/pull/138) (#46): daily contracts. Subjects send events with each session save; 3 contracts a day are picked, checked and paid in gold by the database (migration `20261109000000_daily_contracts.sql`). The Notice Board lists them; the HUD says "1 of 3 done today · 30 gold left to earn". Numbers in [economy](../game/economy.md#daily-contracts).
     - [#139](https://github.com/Adamzvulun/Liron/pull/139) (#48, part 1): owned items, milestone gear and streak shields. The database gives the 4 locked gear items when their milestones are met (they only showed their condition before); the wardrobe lets you wear what you own. Streak shields (ADR 0034) cover missed days; the HUD shows how many you hold. Migration `20261110000000_owned_items_and_shields.sql`.
     - #48, part 2: reward chests. Finishing a day's 3 contracts gives a wooden chest, each trial passed and a 7-day streak a brass one, 30 and 100 days a jeweled one. They wait on the Notice Board's shelf; the database rolls and pays one when it's opened, once. Migration `20261111000000_chests.sql`; numbers in [economy](../game/economy.md#reward-chests).
   - **#49 Market, part 1 (wares):** 16 new gear items (2–3 per slot) and 4 tunic dyes are drawn, in the catalogue and the `items` table. Chests can drop them now; the wardrobe has a Tunic dye choice.
   - **#49 Market, part 2 (buying):** the Market building sells 4 wares a day for gold (`market_today`, `buy_item`). E10 is complete once it merges.
   - **E10 is complete** (#46–#49 merged 2026-11-09).
   - **[#137](https://github.com/Adamzvulun/Liron/issues/137) speed, measured (2026-11-09):** the biggest cost is the city's 5,871 SVG shapes (paint 0.28 s and layout 0.7 s on a slowed phone; about 0.2 s redraw on every return to the square, even on desktop). Startup data now loads in parallel. Waiting on Adam: pre-render the scenery at build time (a WebP download of about 110–430 kB), and which moments feel slow ([report](reports/2026-11-09.md)).
   - **Audio for the missing phrases:** no source is usable yet. Lingua Libre is the lead (a CC0 *nšallah* found); the speakers' origin is unverified because lingualibre.org timed out. Nothing is used until Adam has seen the files ([research](../research/phrase-audio-sources.md)).

## Backlog map
| Milestone | Epic | Issues |
|---|---|---|
| M0 | Speech spike (Gemini, then Groq) | #1 ✅ closed |
| M1 | E1 Project setup | #2 → #12 #13 #14 #15 |
| M1 | E2 Platform core | #3 → #16 #17 #18 #19 #20 |
| M1 | E3 Learning engine | #4 → #21 #22 #23 |
| M1 | E4 City v0 | #5 → #24 #25 #26 #27 |
| M1 | E5 Avatar v0 | #6 → #28 #29 |
| M2 | E6 Signal Tower: receive | #7 → #30 #31 #32 #33 #34 |
| M2 | E7 Signal Tower: send | #8 → #35 #36 #37 |
| M2 | E8 Caravanserai: script | #9 → #38 #39 #40 #41 #42 #43 |
| M2 | E9 Survival phrases | #10 → #44 #45 |
| M2 | E10 Quests & rewards | #11 → #46 #47 #48 #49 |

M3–M6 (E11–E20) stay in the [roadmap](ROADMAP.md) as docs. Turn them into issues when M2 is nearly done.

## How the backlog is organised in GitHub
- **Milestones are labels** (`milestone:M0`, `milestone:M1`, `milestone:M2`), because the GitHub tools available to Claude can't create real milestones. Adam can convert them in the GitHub UI if he wants.
- **Epics** are issues labeled `type:epic`. Their tasks are GitHub **sub-issues**, so progress shows on the epic.
- **Other labels:** `type:feature|chore|content|design|research|bug`, `track:core|morse|arabic`, `prio:p0|p1|p2`, and `needs:adam` (blocked on something only Adam can do, like creating an account).
- **Gotcha:** creating an issue *with a parent* fails if one of its labels doesn't exist yet. Create the issue first, then attach it with the sub-issue tool. Issues without a parent create missing labels automatically.

## How to work (short version of [WORKFLOW](WORKFLOW.md) and [CLAUDE.md](../../CLAUDE.md))
- **Branches ([ADR 0015](../decisions/0015-branches-and-environments.md)):** `main` is the live site, and `dev` is the live dev site and the default branch.
  - Feature branches come from `dev`; PRs go into `dev` (`Closes #N`). Several small issues may share one PR when Adam says so (E1 did). Only open PRs when Adam asks.
  - Releases are PRs from `dev` into `main`; only Adam merges them.
  - **When to release (Adam, 2026-11-03):** only when the game has a real base, meaning something the user can learn. Decor and styling alone are not a release. The first candidate is once M2 has lessons (e.g. E6 hearing Morse, E8 Arabic letters); Adam decides.
  - **Version numbers ([ADR 0027](../decisions/0027-release-versioning.md)):** each release to `main` is a new X in X.Y.Z. **The first playable release is v1.0.0.** Y is a rare small addition between releases, and Z is a hotfix. 0.y.z means nothing is playable yet. The release PR sets `package.json`'s version, and Adam creates the tag.
  - **Never merge a PR with a red CI check** (process rule, [CI](CI.md)).
  - **Always watch the PRs you open** (Adam, 2026-11-02): subscribe to PR activity right after creating a PR, fix red CI and answer review comments. Claude may merge its own PRs into `dev` once CI is green and it has checked the work (Adam, 2026-11-04). Only Adam merges into `main`.
  - Claude's session branch (`claude/…`) is the feature branch. If it doesn't start from `dev`, rebase it onto `dev` first.
- **Rules from Adam:**
  - Research before suggesting.
  - Disclose anything that costs money, shares data, or locks us in, as an explicit question.
  - Never quietly drop features.
  - Don't over-engineer.
  - No more purchases.
- **Copyright:** the repo is **private**. Copyrighted material (the Lingualism deck and book) lives only in `sources/` and later in Supabase behind login. It never goes into the public site bundle (ADR 0011).
- **Visual work:** screenshot everything you draw with `docs/design/concept-v0/tools/render.js` and look at it before showing Adam.

## Environment facts (cloud session)
- **Network:** many domains are blocked. `api.groq.com`, Azure speech and Cloudflare API hosts answer (checked 2026-11-01).
  - Reachable (checked 2026-11-01): GitHub, `generativelanguage.googleapis.com` (Gemini), `registry.npmjs.org`, `supabase.com`, `api.vercel.com`.
  - Blocked: `openrouter.ai` and most websites. Use web search for research, and say when a fact comes only from search snippets.
- **Secrets:** `GEMINI_API_KEY` (added 2026-11-01) and the Groq key (added 2026-11-02). **The Groq secret is actually named `GROQ_KEY`**, not `GROQ_API_KEY`; `groq.mjs` reads either. Rename it in the environment settings if you want them to match. Never ask for keys in chat; Adam adds them in the environment settings, and a new session picks them up.
- **Git tags:** the session's git proxy disconnects on `git push` of a tag, and the GitHub tools can't create tags, so Adam tags releases in GitHub → Releases.
- **Adam's working rule (2026-11-02):** automate everything. Hand steps only where it's truly impossible otherwise (account creation, secrets, approvals). Say why each time.
- **npm gotcha:** npm 10 (Node 22's npm) crashes (`reading 'edgesOut'`) when it resolves vitest's optional peers from scratch. Installing from the lockfile works. To add or upgrade dependencies, run `npx -y npm@12.2.1 install …`, which updates the lockfile.
- **Pinning:** exact versions, using releases at least two weeks old. `@playwright/test` stays at the pre-installed Playwright version (1.63.0) so it finds `/opt/pw-browsers`.
- **Tools present:** Node 22, Python 3, `ffmpeg`, Playwright with a pre-installed Chromium (don't run `playwright install`). The `zstd` CLI is **not always present** (missing on 2026-11-01, and `apt` failed). `prep.py` falls back to Node 22's built-in `zlib.zstdDecompressSync`, so it works either way.
- **Deck format:** `.apkg` is a zip. `collection.anki21b` and `media` are zstd-compressed (SQLite plus the media map), and SQLite needs a `unicase` collation registered. **Each media file is also zstd-compressed**, and the media map is protobuf with a font entry in it, so parse it; don't regex the mp3 names. See `spikes/gemini-speech/prep.py`.
- **Groq free tier (seen 2026-11-02):** response headers show 2,000 requests/day and 7,200 audio-s/hour. `whisper-large-v3` handled 80 calls at ~17/min with no 429s. Audio models listed: `whisper-large-v3`, `whisper-large-v3-turbo`, `canopylabs/orpheus-arabic-saudi` (TTS, untested).
- **Gemini free tier (seen 2026-11-01):** quota is per model per day. `gemini-3.5-flash` (served as 3.6) and `gemini-3-flash-preview` allow 20/day. `gemini-3.5-flash-lite` took about 270 calls with no cap hit and answers in under 1 s. `gemini-3.8-flash` was overloaded (~130 s per call). `gemini-2.5-*` is closed to new users. Gemma 4 takes no audio. TTS models (`gemini-3.8-flash-lite-tts`, `3.8-flash-tts`, `3.1-flash-tts-preview`) work but allow about 10 calls/day each.

## Open questions for Adam
- **Billing:** check *Settings → Billing → Budgets*, so Actions can never bill you.
- ~~**The review's decisions**~~ (end of [the full review](reviews/2026-11-04-full-review.md)): all decided 2026-11-04. Adam answered three (prod keys in GitHub, the second-day gate, the final k) and left the rest to Claude ("do what you think is best"); all are built.
- ~~In-app mic and data~~: decided 2026-11-04, the Groq check is approved, opt-in, through a server-side function.
- Decided 2026-11-01/02: free tiers only, no paid tier; his voice is not sent for testing; no Azure; nothing runs locally (no in-browser or on-machine models); hosted free APIs only. He wants one stable model rather than hopping between models.
- Decided 2026-11-02: git flow feature → dev → main with two live sites (ADR 0015). Vercel and Supabase accounts created.
