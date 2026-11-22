# Status: start here

**Read this first in every new session**, then the latest [handoff](HANDOFF.md). It says where we are and what comes next. Update it before a session ends.

- **Last updated:** 2026-11-19 (every part of the code has now had a high review; the fixes are merged into `dev`; v1.1.0's release PR waits on Adam).
- **The work order is [PLAN.md](PLAN.md)**, in the order of [VERSIONS.md](VERSIONS.md). How we got here is in [HISTORY.md](HISTORY.md).

## Where we are

**Waymark is live at v1.3.1** ([waymark-phi.vercel.app](https://waymark-phi.vercel.app), 2026-11-22). Everything in [PLAN.md](PLAN.md) that Claude can do alone is built. What is left is Adam's: his reads and approvals, the first friends, and the parked items in [LATER.md](LATER.md). Since v1.0.0: friends read the deck (v1.1), invite links (v1.2), the square on an iPhone (v1.2.x), and Nour the lamplighter's guide for new players (v1.3). Each release's notes are in [releases/](releases/) and the map in [VERSIONS.md](VERSIONS.md). The repo is public since 2026-11-22, with the deck's text out of its tree and its history ([ADR 0054](../decisions/0054-the-repo-goes-public.md)), so CI costs nothing.

| | State |
|---|---|
| **The city** | The square, Your House (avatar, wardrobe, ledger, Fellowship), the Market, the Notice Board (quests, contracts, chests, the party feed), the Arena |
| **Signal Tower (Morse)** | The whole road: 75 steps in 10 chapters, ending in the finale Forty Winters (the Morse capstone). Koch lessons for 41 characters, Instant Recognition, sending with a key, the Codebook's words, the callsign rush, three rank trials, the Radio Room with AI operators, and the wire to a friend |
| **Caravanserai (Arabic)** | The whole road: 275 steps in 115 chapters, ending in the finale The Stranger at the Gate (the Arabic capstone). The script and its marks, the slate, the echo well, survival phrases, 3,390 words in 113 chapters, each with a regular and a trial, grammar cards, Sit and talk with the regulars, the Coach |
| **After the end** | The long evenings: master contracts, a station of the day, personal bests to beat ([ADR 0048](../decisions/0048-the-long-evenings.md)) |
| **Never lost** | One compass line says the next step everywhere: the square, both halls, every result screen. A first page greets a new player ([the Road](../game/the-road.md)) |
| **The look** | Painted in the browser; no screen stands on a blue background ([Grounds](../design/grounds.md)) |
| **Under it** | Login, saved progress, XP, levels, gold, gems, streaks, spaced repetition, ranks, achievements, friends, challenges, quests and gifts, the wire, two finales. 55 ADRs; unit and browser tests on every PR |

### What lives where, and how to run it
- **The code:** `src/core/` is the platform, `src/subjects/<id>/` one subject each; content is data in `content/`; the database is `supabase/migrations/`. The [README](../../.github/README.md) has the map and every script (`npm run dev`, `npm test`, `npm run e2e`).
- **Running the game day to day:** [RUNNING.md](RUNNING.md), the keeper's handbook (keys, allowances, friends, the keep-alive). Hosting: [DEPLOY.md](DEPLOY.md) and [SUPABASE.md](SUPABASE.md).
- **Releasing:** [release-checklist.md](release-checklist.md), then a PR from `dev` into `main`, merged with a merge commit once it is green.
- **Adding a subject:** [ADDING-A-SUBJECT.md](ADDING-A-SUBJECT.md). **What stays open on purpose:** [LATER.md](LATER.md).

## What comes next

**Adam's, in this order:**

1. **Read the guide's words** ([guide-words.md](../game/guide-words.md), #413) and **approve Nour's look** where they stand by the compass (#406). Word changes go into `dev`, then out in the next release.
2. **Try the guide on a newcomer** (#414): one invited friend, on a phone. What they trip on becomes v1.3.x fixes.
3. **Delete the `v1.0.0` tag** (Tags → v1.0.0 → Delete tag). It is the last ref that still holds the deck's old history.
4. **Turn on the ruleset** that makes GitHub refuse a red PR (open questions, below).
5. **Parked:** the third subject (#337), the regulars' voices (Azure, #342), the release of the Fellowship (#332), and how the square feels on his phone (#137). All are in [LATER.md](LATER.md).

**Next to build: v1.4.0, a home of your own** (Phase 7, epic [#435](https://github.com/Adamzvulun/Liron/issues/435), [the-home.md](../game/the-home.md)). Your House becomes a room you walk in, decorate and invite friends into. 7.2, the room's rules, is merged ([#449](https://github.com/Adamzvulun/Liron/pull/449): grid, footprints, caps, paths, and the starter layout fitted to the painting). 7.1, the room drawn as pieces on the grid, is merged and Adam approved the look ([home-v0](../design/home-v0/README.md)). 7.3 is merged ([#451](https://github.com/Adamzvulun/Liron/pull/451): `homes`, `save_home`, `my_home`, `home_of`). 7.4, the furniture and the wallpapers and floors, is painted. Next: 7.5, the room you walk in, in the app. New players now start with a random Arabic name ([#453](https://github.com/Adamzvulun/Liron/pull/453)).

**Claude's:** fixes for whatever Adam or a friend finds, gap hunts between them ([report §4ek](reports/2026-11-09.md)), and keeping these docs true.

**Releasing** is the same every time ([VERSIONS.md](VERSIONS.md#the-release-steps-the-same-every-time)): a `release/vX` branch from `dev`, a PR into `main` with notes, and a merge commit once CI and axe are green. Claude merges green release PRs at Adam's word (2026-11-19). Vercel Hobby allows 100 deploys a day, so never push many branches at once (HANDOFF 157).

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
| M2 | The Silent Beacon III–V | #147 |
| M3 | E12 Morse words & head copy | #149 → #153 #154 #155 #156 |
| M3 | E11 Arabic core words | #150 → #159 #160 #161 #162 #163 #164 #205 |
| M3 | E13 Ranks, trials & achievements | #151 → #174 #175 #176 #177 #178 #179 #180 |
| M3 | E14 Mic practice | #152 → #193 #194 #195 #196 #197 |

M3 is in GitHub (2026-11-09). M4–M6 (E15–E20) stay in the [roadmap](ROADMAP.md) as docs until M3 is nearly done.

## How the backlog is organised in GitHub
- **Milestones are labels** (`milestone:M0`, `milestone:M1`, `milestone:M2`), because the GitHub tools available to Claude can't create real milestones. Adam can convert them in the GitHub UI if he wants.
- **Epics** are issues labeled `type:epic`. Their tasks are GitHub **sub-issues**, so progress shows on the epic.
- **Other labels:** `type:feature|chore|content|design|research|bug`, `track:core|morse|arabic`, `prio:p0|p1|p2`, and `needs:adam` (blocked on something only Adam can do, like creating an account).
- **Gotcha:** creating an issue *with a parent* fails if one of its labels doesn't exist yet. Create the issue first, then attach it with the sub-issue tool. Issues without a parent create missing labels automatically.

## How to work (short version of [WORKFLOW](WORKFLOW.md) and [CLAUDE.md](../../.claude/CLAUDE.md))
- **Branches ([ADR 0015](../decisions/0015-branches-and-environments.md)):** `main` is the live site, and `dev` is the live dev site and the default branch.
  - Feature branches come from `dev`; PRs go into `dev` (`Closes #N`). Several small issues may share one PR when Adam says so (E1 did). Only open PRs when Adam asks.
  - Releases are PRs from `dev` into `main`; only Adam merges them.
  - **When to release (Adam, 2026-11-03):** only when the game has a real base, meaning something the user can learn. Decor and styling alone are not a release. The first candidate is once M2 has lessons (e.g. E6 hearing Morse, E8 Arabic letters); Adam decides.
  - **Version numbers ([ADR 0027](../decisions/0027-release-versioning.md)):** each release to `main` is a new X in X.Y.Z. **The first playable release is v1.0.0.** Y is a rare small addition between releases, and Z is a hotfix. 0.y.z means nothing is playable yet. The release PR sets `package.json`'s version, and Adam creates the tag.
  - **Never merge a PR with a red CI check** (process rule, [CI](CI.md)).
  - **Always watch the PRs you open** (Adam, 2026-11-02): subscribe to PR activity right after creating a PR, fix red CI and answer review comments. Claude may merge its own PRs into `dev` once CI is green and it has checked the work (Adam, 2026-11-04). Release PRs into `main` too: Claude merges them (merge commit) once every check passes and the work checks out (Adam, 2026-11-21: "if all checks pass and everything is working - merge yourself").
  - Claude's session branch (`claude/…`) is the feature branch. If it doesn't start from `dev`, rebase it onto `dev` first.
- **Rules from Adam:**
  - Research before suggesting.
  - Disclose anything that costs money, shares data, or locks us in, as an explicit question.
  - Never quietly drop features.
  - Don't over-engineer.
  - No more purchases.
- **Copyright:** the repo is **public** (ADR 0054). The deck must never be committed again. Copyrighted material (the Lingualism deck and book) lives only in `sources/` and later in Supabase behind login. It never goes into the public site bundle (ADR 0011).
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
- **Deck format:** `.apkg` is a zip. `collection.anki21b` and `media` are zstd-compressed (SQLite plus the media map), and SQLite needs a `unicase` collation registered. **Each media file is also zstd-compressed**, and the media map is protobuf with a font entry in it, so parse it; don't regex the mp3 names. See `sources/research/gemini-speech/prep.py`.
- **Groq free tier (seen 2026-11-02):** response headers show 2,000 requests/day and 7,200 audio-s/hour. `whisper-large-v3` handled 80 calls at ~17/min with no 429s. Audio models listed: `whisper-large-v3`, `whisper-large-v3-turbo`, `canopylabs/orpheus-arabic-saudi` (TTS, untested).
- **Gemini free tier (seen 2026-11-01):** quota is per model per day. `gemini-3.5-flash` (served as 3.6) and `gemini-3-flash-preview` allow 20/day. `gemini-3.5-flash-lite` took about 270 calls with no cap hit and answers in under 1 s. `gemini-3.8-flash` was overloaded (~130 s per call). `gemini-2.5-*` is closed to new users. Gemma 4 takes no audio. TTS models (`gemini-3.8-flash-lite-tts`, `3.8-flash-tts`, `3.1-flash-tts-preview`) work but allow about 10 calls/day each.

## Open questions for Adam
Emptied on 2026-11-17 (task 5.1): each is answered, or marked as his to settle. Answered ones are kept, struck, for the record.
- ~~**The live site's progress**~~: Adam chose a fresh start (2026-11-16). Your dev-site progress stays on the dev site ([DEPLOY](DEPLOY.md#the-first-real-release-v100)).
- **Adam's, new (2026-11-22): require a green CI to merge?** Now that the repo is public, GitHub Free can protect `dev` and `main` for free (Settings → Rules → Rulesets, requiring the CI checks), so GitHub itself blocks a red PR. **Claude recommends yes** (Adam, 2026-11-22: "Do what you think is best"): Settings → Rules → Rulesets → New branch ruleset, target `dev` and `main`, tick *Require status checks to pass* and add `check`, `browser (1 of 3)`, `browser (2 of 3)`, `browser (3 of 3)` and `browser (timing)`. Claude has no tool that changes repo settings. Until then the process rule stands: nothing red gets merged ([CI](CI.md#a-red-check-blocks-merging)). Every CI job reports on every PR, docs-only ones too, so all four can be required.
- **Adam's, standing:** check *Settings → Billing → Budgets*, so Actions can never bill you. Public repos' runs are free, so this matters only if the repo goes private again.
- **Adam's, standing:** more words need a new source. Maknuune is free but CC BY-SA 4.0. Listed in [LATER.md](LATER.md).
- **Adam's, standing:** `GROQ_API_KEY` on the dev site (Claude can't reach the dev site to check). Settings → Services says whether it's on (task 1.8); the key must be ticked for **Preview** in Vercel. Also: try the Morse sound on an iPhone after a phone call or a locked screen (`resumeOnGesture`, §4ax).
- ~~**The words left out on purpose**~~ (report §4bc): Adam answered on 2026-11-15. The stepfamily and the national days are in (chapter 113); the adult, toilet and grim words are skipped for now.
- ~~**The inn's character sheets**~~ (report §4at): done on 2026-11-15 (§4bd).
- ~~**The M5 questions**~~: left to Claude, [ADR 0039](../decisions/0039-fellowship-answers.md). The regulars' voices wait on Adam's look at Azure (#342).
- ~~**E15 (the Radio Room operators' free text)**~~: Adam said yes to all six questions (2026-11-10, ADR 0036).
- ~~**The review's decisions**~~ (end of [the full review](reviews/2026-11-04-full-review.md)): all decided 2026-11-04.
- ~~In-app mic and data~~: decided 2026-11-04, the Groq check is approved, opt-in, through a server-side function.
- Decided 2026-11-01/02: free tiers only, no paid tier; his voice is not sent for testing; no Azure (he will look again himself, 2026-11-16); nothing runs locally; hosted free APIs only. He wants one stable model rather than hopping between models.
- Decided 2026-11-02: git flow feature → dev → main with two live sites (ADR 0015). Vercel and Supabase accounts created.
