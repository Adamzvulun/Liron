# Status: start here

**Read this first in every new session.** It says where we are, what's next, and how this environment behaves. Keep it current: update it at the end of every session.

- **Last updated:** 2026-11-01
- **Phase:** M0 (Shape) done. The Gemini speech spike phase 1 is done (verdict: **partial**). Next: M1, once Adam says go.

## Where we are
| Item | State |
|---|---|
| Vision, name (Waymark), ADRs 0001–0012 | ✅ locked ([vision](../vision.md), [decisions](../decisions/)) |
| Visual concept: city v3 (painted style) | ✅ approved "for now" ([concept](../design/concept-v0/README.md), live canvas linked there) |
| Sources: Lingualism deck (bought), Maknuune, Madrasa structure | ✅ ([sources](../../sources/README.md), [research](../research/arabic-sources.md)) |
| Backlog: M1 + M2 as GitHub issues | ✅ #1–#49 |
| Gemini speech spike, phase 1 (deck clips) | ✅ **partial**: transcription usable, pronunciation judgment unproven ([results](../../spikes/gemini-speech/README.md#results-phase-1-2026-11-01)). Phase 2 (Adam's voice) waits on his OK. Issue #1 stays open for it. |
| App code | none yet; starts with M1 (#12 scaffold) |

## What to do next (in order)
1. **Wait for Adam's "go" on M1.** Don't start before.
2. **M1: Foundations**, starting with E1 (#2): scaffold (#12) → tests (#13) → CI (#14) → Vercel (#15).
   - #15 (Vercel) and #16 (Supabase) need Adam to create free accounts first. Ask him early.
   - After E1, do E2 (#3) and E3 (#4) before E4 (#5) and E5 (#6).
3. **M2: First playable** (#7–#11), after M1.
4. **Issue #1 phase 2** (Adam's own recordings), whenever Adam approves sending his voice. The plan is in issue #1. It can run alongside M1.

## Backlog map
| Milestone | Epic | Issues |
|---|---|---|
| M0 | Gemini speech spike | #1 |
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
- **Branch:** `claude/learning-hub-arabic-morse-20ckww` is currently the repo's only and default branch. From M1 on: one branch and PR per issue (`Closes #N`), but only open PRs when Adam asks.
- **Rules from Adam:**
  - Research before suggesting.
  - Disclose anything that costs money, shares data, or locks us in, as an explicit question.
  - Never quietly drop features.
  - Don't over-engineer.
  - No more purchases.
- **Copyright:** the repo is **private**. Copyrighted material (the Lingualism deck and book) lives only in `sources/` and later in Supabase behind login. It never goes into the public site bundle (ADR 0011).
- **Visual work:** screenshot everything you draw with `docs/design/concept-v0/tools/render.js` and look at it before showing Adam.

## Environment facts (cloud session)
- **Network:** many domains are blocked.
  - Reachable (checked 2026-11-01): GitHub, `generativelanguage.googleapis.com` (Gemini), `registry.npmjs.org`, `supabase.com`, `api.vercel.com`.
  - Blocked: `openrouter.ai` and most websites. Use web search for research, and say when a fact comes only from search snippets.
- **Secrets:** `GEMINI_API_KEY` (added 2026-11-01). Never ask for keys in chat; Adam adds them in the environment settings, and a new session picks them up.
- **Tools present:** Node 22, Python 3, `ffmpeg`, Playwright with a pre-installed Chromium (don't run `playwright install`). The `zstd` CLI is **not always present** (missing on 2026-11-01, and `apt` failed). Node 22 has `zlib.zstdDecompressSync`, so a tiny Node stand-in for `zstd -d IN -o OUT` on `PATH` works.
- **Deck format:** `.apkg` is a zip. `collection.anki21b` and `media` are zstd-compressed (SQLite plus the media map), and SQLite needs a `unicase` collation registered. **Each media file is also zstd-compressed**, and the media map is protobuf with a font entry in it, so parse it; don't regex the mp3 names. See `spikes/gemini-speech/prep.py`.
- **Gemini free tier (seen 2026-11-01):** quota is per model per day. `gemini-3.5-flash` (served as 3.6) and `gemini-3-flash-preview` allow 20/day. `gemini-3.5-flash-lite` took about 270 calls with no cap hit and answers in under 1 s. `gemini-3.8-flash` was overloaded (~130 s per call). `gemini-2.5-*` is closed to new users. Gemma 4 takes no audio.

## Open questions for Adam
- **Phase 2 of the speech spike:** OK to send his own recordings to Gemini's free tier, where Google may use them and human reviewers may see them?
- **Free-tier quota is tight:** the better Flash models allow 20 requests/day each, and only flash-lite has room. This affects ADR 0004 (all AI features, not just the mic). Do we stay on flash-lite, or should Claude research paid-tier pricing? Paid costs money, so it's Adam's call.
- Before M1 #15/#16 he needs free Vercel and Supabase accounts.
