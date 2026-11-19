# Status: start here

**Read this first in every new session**, then the latest [handoff](HANDOFF.md). It says where we are and what comes next. Update it before a session ends.

- **Last updated:** 2026-11-19 (every part of the code has now had a high review; the fixes are merged into `dev`; v1.1.0's release PR waits on Adam).
- **The work order is [PLAN.md](PLAN.md)**, in the order of [VERSIONS.md](VERSIONS.md). How we got here is in [HISTORY.md](HISTORY.md).

## Where we are

**Waymark is built, as far as it can be without Adam.** Every task in [PLAN.md](PLAN.md) that Claude can do alone is done and merged into `dev` (the last sweep, task 5.1, on 2026-11-17; [final retro](retros/final.md)). What is left is Adam's: his gates at the end of PLAN.md, the choice of a third subject (4.5), and the releases. `main` (the live site) still holds the v0.1.0 scaffold; everything below is on `dev`.

| | State |
|---|---|
| **The city** | The square, Your House (avatar, wardrobe, ledger, Fellowship), the Market, the Notice Board (quests, contracts, chests, the party feed), the Arena |
| **Signal Tower (Morse)** | The whole road: 75 steps in 10 chapters, ending in the finale Forty Winters (the Morse capstone). Koch lessons for 41 characters, Instant Recognition, sending with a key, the Codebook's words, the callsign rush, three rank trials, the Radio Room with AI operators, and the wire to a friend |
| **Caravanserai (Arabic)** | The whole road: 275 steps in 115 chapters, ending in the finale The Stranger at the Gate (the Arabic capstone). The script and its marks, the slate, the echo well, survival phrases, 3,390 words in 113 chapters, each with a regular and a trial, grammar cards, Sit and talk with the regulars, the Coach |
| **After the end** | The long evenings: master contracts, a station of the day, personal bests to beat ([ADR 0048](../decisions/0048-the-long-evenings.md)) |
| **Never lost** | One compass line says the next step everywhere: the square, both halls, every result screen. A first page greets a new player ([the Road](../game/the-road.md)) |
| **The look** | Painted in the browser; no screen stands on a blue background ([Grounds](../design/grounds.md)) |
| **Under it** | Login, saved progress, XP, levels, gold, gems, streaks, spaced repetition, ranks, achievements, friends, challenges, quests and gifts, the wire, two finales. 49 ADRs; unit and browser tests on every PR |

### What lives where, and how to run it
- **The code:** `src/core/` is the platform, `src/subjects/<id>/` one subject each; content is data in `content/`; the database is `supabase/migrations/`. The [README](../../.github/README.md) has the map and every script (`npm run dev`, `npm test`, `npm run e2e`).
- **Running the game day to day:** [RUNNING.md](RUNNING.md), the keeper's handbook (keys, allowances, friends, the keep-alive). Hosting: [DEPLOY.md](DEPLOY.md) and [SUPABASE.md](SUPABASE.md).
- **Releasing:** [release-checklist.md](release-checklist.md), then a PR from `dev` into `main` that only Adam merges.
- **Adding a subject:** [ADDING-A-SUBJECT.md](ADDING-A-SUBJECT.md). **What stays open on purpose:** [LATER.md](LATER.md).

## What comes next

**v1.1.0, Open to Friends, is built** (2026-11-18, HANDOFF item 114): every account reads the deck ([ADR 0050](../decisions/0050-friends-learn-from-the-deck.md)), an account without it is told so plainly, the compass knows whether Sit and talk is on, and [FRIENDS.md](FRIENDS.md) opens with Adam's five steps for a first friend. Release notes: [releases/v1.1.0.md](releases/v1.1.0.md). It's all in `dev`, and [the release PR](https://github.com/Adamzvulun/Liron/pull/371) into `main` is open for Adam to merge. **Overnight (report §4df–4di, #376 and #377, merged into `dev`):** a high code review of both towers, the Fellowship and the platform, with about 40 real bugs fixed. The biggest: a run that couldn't be saved no longer loses its XP or its one-time rewards (ADR 0031 amendment). **Then on 2026-11-19 (report §4dj–4do, #378–#383):** the server functions, the database (one migration, applied to dev), the player and Market, the avatar and content, the city, its sound, the workflows and the content scripts. The biggest: the finales' gear could be bought and a finale claimed without its rank; a friend code could be tested; opening Settings early could wipe your name; a late answer could undo a purchase; one odd look could break every friend's list; "Say it" failed in Firefox. A last review of the day's own fixes found and fixed a few mistakes in them (§4do). All of this is in `dev`, not in the v1.1.0 release PR: it ships with the next release. **Claude's next:** every part of the code has now had a high review; what's left is test holes (coverage) and anything Adam finds playing.

**Adam's, in the order of [VERSIONS.md](VERSIONS.md):**

1. **Play v1.0.0** (live since 2026-11-17, #359; database migrated 2026-11-18, #360). What you find becomes 1.0.x fixes, folded into v1.1.0. The checklist walk (1.12) can still be done on the live site.
2. **Merge the v1.1.0 release PR, then the first friend:** the five steps at the top of [FRIENDS.md](FRIENDS.md); then 3.7 opens the Fellowship.
3. **Parked:** the third subject (4.5; Adam, 2026-11-18: "won't come soon"), the regulars' voices (Azure, #342), more word chapters (a source), and #137 (how the square feels on his phone). All in [LATER.md](LATER.md).

**The repo itself (2026-11-18):** its front page opens on a banner of the square ([README](../../.github/README.md)), and its root lists 23 entries (the charter is now `.claude/CLAUDE.md`). CI costs about 40% less a run (arm64 runners, two Playwright workers, no second run when a release lands on `main`), and since #370 and #373 it takes about 5.5 minutes instead of 16: four jobs side by side, with caches every PR can read ([CI.md](CI.md)). The live site was checked from outside the same day: it loads in 1–2 s on desktop and phone, with no console errors and every security header in place.

**Keep alive** ran green on 2026-11-18 (Adam, by hand) and now runs on Mondays and Thursdays. Before that nothing had ever used `waymark-prod`, so it had paused ([SUPABASE](SUPABASE.md#keep-alive)).


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
- **Deck format:** `.apkg` is a zip. `collection.anki21b` and `media` are zstd-compressed (SQLite plus the media map), and SQLite needs a `unicase` collation registered. **Each media file is also zstd-compressed**, and the media map is protobuf with a font entry in it, so parse it; don't regex the mp3 names. See `docs/research/spikes/gemini-speech/prep.py`.
- **Groq free tier (seen 2026-11-02):** response headers show 2,000 requests/day and 7,200 audio-s/hour. `whisper-large-v3` handled 80 calls at ~17/min with no 429s. Audio models listed: `whisper-large-v3`, `whisper-large-v3-turbo`, `canopylabs/orpheus-arabic-saudi` (TTS, untested).
- **Gemini free tier (seen 2026-11-01):** quota is per model per day. `gemini-3.5-flash` (served as 3.6) and `gemini-3-flash-preview` allow 20/day. `gemini-3.5-flash-lite` took about 270 calls with no cap hit and answers in under 1 s. `gemini-3.8-flash` was overloaded (~130 s per call). `gemini-2.5-*` is closed to new users. Gemma 4 takes no audio. TTS models (`gemini-3.8-flash-lite-tts`, `3.8-flash-tts`, `3.1-flash-tts-preview`) work but allow about 10 calls/day each.

## Open questions for Adam
Emptied on 2026-11-17 (task 5.1): each is answered, or marked as his to settle. Answered ones are kept, struck, for the record.
- ~~**The live site's progress**~~: Adam chose a fresh start (2026-11-16). Your dev-site progress stays on the dev site ([DEPLOY](DEPLOY.md#the-first-real-release-v100)).
- **Adam's, standing:** check *Settings → Billing → Budgets*, so Actions can never bill you.
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
