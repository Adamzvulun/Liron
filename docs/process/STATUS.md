# Status: start here

**Read this first in every new session**, then the latest [handoff](HANDOFF.md). It says where we are and what comes next. Update it before a session ends.

- **Last updated:** 2026-11-17.
- **The work order is [PLAN.md](PLAN.md)**, in the order of [VERSIONS.md](VERSIONS.md). How we got here is in [HISTORY.md](HISTORY.md).

## Where we are

**Waymark is a playable game on the dev site, being finished for its first real release, v1.0.0.** Adam is the only player. `main` (the live site) still holds the v0.1.0 scaffold; everything below is on `dev`.

| | State |
|---|---|
| **The city** | The square, Your House (avatar and wardrobe), the Market, the Notice Board (quests, contracts, chests) |
| **Signal Tower (Morse)** | The whole road: 75 steps in 10 chapters, ending in the finale Forty Winters (the Morse capstone). Koch lessons for 41 characters, Instant Recognition, sending with a key, the Codebook's words, the callsign rush, three rank trials, the Radio Room with AI operators |
| **Caravanserai (Arabic)** | The whole road: 275 steps in 115 chapters, ending in the finale The Stranger at the Gate (the Arabic capstone). The script and its marks, the slate, the echo well, survival phrases, 3,390 words in 113 chapters, each with a regular and a trial, grammar cards, Sit and talk with the regulars, the Coach |
| **Never lost** | One compass line says the next step everywhere: the square, both halls, every result screen. A first page greets a new player ([the Road](../game/the-road.md)) |
| **The look** | Painted in the browser; no screen stands on a blue background ([Grounds](../design/grounds.md)) |
| **Under it** | Login, saved progress, XP, levels, gold, gems, streaks, spaced repetition, ranks, achievements, friends, challenges, quests and gifts, the wire (live Morse between friends), two finales and the long evenings. 48 ADRs; unit and browser tests on every PR |

## What comes next

1. **Finish v1.0** ([PLAN](PLAN.md) Phase 1). Built: tasks 1.1–1.5 and 1.7–1.11 (1.9 needs its first run after the release). Left: two gates that are Adam's: **1.12, his release checklist** ([written](release-checklist.md), waiting for his walk), and **1.13, the release PR** into `main`.
2. **Then v1.1 to 4.0** in the order of [VERSIONS.md](VERSIONS.md). v1.1 (the ledger, the keeper's handbook in [RUNNING](RUNNING.md)) and v1.2 (sound, motion and world events) are built and wait for Adam's look. **v2.0 is built except Adam's part:** fair shares of the free AI (2.2), passwords and FRIENDS.md (2.3), the two-player tests (2.4), friend codes and the Fellowship list (3.1), and visits (3.2). Waiting on him: 2.1, what friends without the deck may learn, and making a first friend's account. v2.1 (3.3, the feed and friends in the square), v2.2 (3.4, challenges and the Arena) v2.3 (3.5, Fellowship quests and gifts) and v2.4 (3.6, the wire: live Morse between friends) are built too. v2.4 also waits on Adam to switch off "Allow public access" in Supabase's Realtime settings ([RUNNING](RUNNING.md#friends)) and to try it with a friend on two devices. **v3.0 (Journey's End) is built:** both finales and their capstones (4.2, 4.3; [ADR 0047](../decisions/0047-the-two-finales.md)), with the judge's eval set run and recorded ([judge-eval.md](../research/judge-eval.md)), and the long evenings (4.1; [ADR 0048](../decisions/0048-the-long-evenings.md)). To look at both endings on the dev site, Adam runs `scripts/endings.ts` for an account (VERSIONS.md, 3.0). 3.7 (releasing the Fellowship) is Adam's. **v4.0 so far:** the guild-hall kit is written ([ADDING-A-SUBJECT.md](ADDING-A-SUBJECT.md)), and so is what stays open on purpose ([LATER.md](LATER.md), task 5.2). **Waiting on Adam for v4.0:** which subject fills the third hall (4.5). **Next to build without him:** 5.1, the last sweep (phone and desktop over Phases 2–4, the doubt walk with both endings).

**Waiting on Adam:** nothing blocks the work today. His gates are listed at the end of PLAN.md. The regulars' voices are parked until he has looked at Azure (#342). #137 (speed) waits for him to try the dev site on his phone.

**After the release, once:** run the "Keep alive" workflow by hand and see it green ([SUPABASE](SUPABASE.md#keep-alive)).


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
- **New (2026-11-15, for v1.0.0):** the live site has its own database, so it will start you at level 1; your dev-site progress stays on the dev site. Keep it that way (a fresh start), or should I write a one-off copy before the release? The release steps are in [DEPLOY](DEPLOY.md#the-first-real-release-v100).
- **Billing:** check *Settings → Billing → Budgets*, so Actions can never bill you.
- ~~**The words left out on purpose**~~ (report §4bc): Adam answered on 2026-11-15. The stepfamily and the national days are in (chapter 113); the adult, toilet and grim words are skipped for now.
- ~~**The inn's character sheets**~~ (report §4at): done on 2026-11-15 (§4bd). The server now looks the regulars up by number.
- **New (2026-11-15, report §4be):** more words would need a new source. Maknuune is free (about 36,000 Palestinian entries, no audio) but CC BY-SA 4.0, so what we build from it would be share-alike too. Use it only to check meanings (my suggestion), or as a word source?
- **Answered (2026-11-15, later):** the five M5 questions are left to Claude: [ADR 0039](../decisions/0039-fellowship-answers.md) (no email, §3's list, visits first, live Morse last, after v1.0.0). **The regulars will speak aloud, but in the version after v1.0.0.** **v1.0.0 comes when Adam is satisfied**: until then, optimize and polish.
- **Still open (2026-11-15):** `GROQ_API_KEY` (Adam says it's on the dev site; Claude can't check it, because the dev site's Vercel login stops every request from the cloud container. To check it yourself: on the dev site, sit and talk with a regular at the inn, or press "Would they understand me?" after a Say it. "Busy" or "isn't set up yet" means the key isn't reaching the dev site. The dev site is a *Preview* deployment, so in Vercel the key must be ticked for **Preview**, not only Production; and after adding it, redeploy `dev`). Also: trying the Morse sound on an iPhone after a phone call or a locked screen (`resumeOnGesture`, §4ax).
- ~~**E15 (the Radio Room operators' free text)**~~: Adam said yes to all six questions (2026-11-10, ADR 0036). His one hand step: add `GEMINI_API_KEY` in Vercel.
- ~~**The review's decisions**~~ (end of [the full review](reviews/2026-11-04-full-review.md)): all decided 2026-11-04. Adam answered three (prod keys in GitHub, the second-day gate, the final k) and left the rest to Claude ("do what you think is best"); all are built.
- ~~In-app mic and data~~: decided 2026-11-04, the Groq check is approved, opt-in, through a server-side function.
- Decided 2026-11-01/02: free tiers only, no paid tier; his voice is not sent for testing; no Azure; nothing runs locally (no in-browser or on-machine models); hosted free APIs only. He wants one stable model rather than hopping between models.
- Decided 2026-11-02: git flow feature → dev → main with two live sites (ADR 0015). Vercel and Supabase accounts created.
