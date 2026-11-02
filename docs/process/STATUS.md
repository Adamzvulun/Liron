# Status: start here

**Read this first in every new session.** It says where we are, what's next, and how this environment behaves. Keep it current: update it at the end of every session.

- **Last updated:** 2026-11-02
- **Phase:** **M1 (Foundations) started** (Adam said go, 2026-11-02). #12–#14 (scaffold, tests, CI) are merged into `dev` ([PR #50](https://github.com/Adamzvulun/Liron/pull/50)); `dev` is the default branch. **v0.1.0 is live at https://waymark-phi.vercel.app**; the dev site is https://waymark-git-dev-adamzvuluns-projects.vercel.app (behind a Vercel login). E1 is done (2026-11-02). **New branch flow (ADR 0015):** feature → `dev` (live dev site) → `main` (live site). Adam has free Vercel and Supabase accounts (2026-11-02).

## Where we are
| Item | State |
|---|---|
| Vision, name (Waymark), ADRs 0001–0020 | ✅ locked ([vision](../vision.md), [decisions](../decisions/)) |
| Visual concept: city v3 (painted style) | ✅ approved "for now" ([concept](../design/concept-v0/README.md), live canvas linked there) |
| Sources: Lingualism deck (bought), Maknuune, Madrasa structure | ✅ ([sources](../../sources/README.md), [research](../research/arabic-sources.md)) |
| Backlog: M1 + M2 as GitHub issues | ✅ #1–#49 |
| Gemini speech spike (#1) | ✅ **partial** and closed: transcription usable; pronunciation scoring doesn't work on free Gemini, so feedback uses record-and-compare and ear training ([results](../../spikes/gemini-speech/README.md#results-phase-1-2026-11-01), [ADR 0013](../decisions/0013-speech-on-free-gemini.md)). |
| Non-Gemini speech API | ✅ **Groq `whisper-large-v3`** is the speech model (2026-11-02): 28/30 deck sentences usable vs Gemini's 24/30, 2,000 requests/day free. It catches no pronunciation mistakes either (ح/ه 0/6), so there's still no per-sound scoring. ([analysis](../../spikes/gemini-speech/results/2026-11-02-groq-analysis.md), [ADR 0014](../decisions/0014-groq-whisper-for-speech.md)) |
| App code | ✅ E1 done: scaffold (#12), tests (#13), CI (#14), hosting (#15, [DEPLOY](DEPLOY.md)). Live: https://waymark-phi.vercel.app · dev: https://waymark-git-dev-adamzvuluns-projects.vercel.app |

## What to do next (in order)
1. **Leftovers for Adam:** create the `v0.1.0` tag in GitHub Releases (target `main`; the session's git proxy refuses tag pushes). Delete the old branches `claude/learning-hub-arabic-morse-20ckww` and `claude/nifty-cray-n4594x` (both already in `dev`; Claude's session isn't allowed to delete branches).
2. **M1: Foundations**: ~~E1 (#2)~~ is done. E2 (#3):
   - ~~#16 login~~: done. Adam is signed in on the dev site (2026-11-02).
   - ~~#17 schema~~: done, with **automatic migrations** (ADR 0018). The first run applied it to `waymark-dev` (2026-11-02). Never apply migrations by hand.
   - ~~#18 subject contract~~ ([ADR 0019](../decisions/0019-subject-contract.md)): done; its migration applied itself to `waymark-dev`.
   - **#19 XP, levels, gold, gems** ([ADR 0020](../decisions/0020-fast-levels-and-rewards.md), [economy](../game/economy.md)): in a PR. Adam chose a fast pace (level 5 on day one).
   - Then #20 (streak and daily goal, with the daily-goal chest and the 7-day-streak gem from the economy doc).
   - Adam has created the free Vercel and Supabase accounts (2026-11-02). Connecting the GitHub repo to Vercel happens in his dashboard; Claude gives the steps.
   - #16 (Supabase): **two free projects**, `waymark-prod` and `waymark-dev` (Adam, 2026-11-02; ADR 0015). Adam's steps: [SUPABASE](SUPABASE.md).
   - After E1, do E2 (#3) and E3 (#4) before E4 (#5) and E5 (#6).
3. **M2: First playable** (#7–#11), after M1.

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
- **Branches ([ADR 0015](../decisions/0015-branches-and-environments.md)):** `main` is the live site, and `dev` is the live dev site and the default branch (once Adam switches it).
  - Feature branches come from `dev`; PRs go into `dev` (`Closes #N`). Several small issues may share one PR when Adam says so (E1 did). Only open PRs when Adam asks.
  - Releases are PRs from `dev` into `main`; only Adam merges them.
  - **Never merge a PR with a red CI check** (process rule, [CI](CI.md)).
  - **Always watch the PRs you open** (Adam, 2026-11-02): subscribe to PR activity right after creating a PR, fix red CI and answer review comments. Merging stays with Adam.
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
- **In-app mic and data:** any in-app "did it understand you?" check now sends his audio to **Groq** (ADR 0014). Groq keeps no audio by default, except up to 30 days of abuse logs. Is it OK in the app when he chooses to use it, or record-and-compare only (no upload)? Default until he answers: opt-in, off. Not needed before M2 #45.
- Decided 2026-11-01/02: free tiers only, no paid tier; his voice is not sent for testing; no Azure; nothing runs locally (no in-browser or on-machine models); hosted free APIs only. He wants one stable model rather than hopping between models.
- Decided 2026-11-02: git flow feature → dev → main with two live sites (ADR 0015). Vercel and Supabase accounts created.
