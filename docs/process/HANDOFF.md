# Handoff for the next Claude session

- **Written:** 2026-11-03, during the overnight run; updated 2026-11-04 (Arabic sprint, review fixes) and 2026-11-05 (the review's last items #120–#122; Adam's findings #123–#126, fixed in #128–#131), 2026-11-06 (the Groq check) and 2026-11-09 (E10: ADRs 0032–0034, #47, #46). Adam told Claude to keep working through the plan, make the calls he'd make, research what needs researching, and keep working properly with git.
- **Read first:** [STATUS](STATUS.md) for the full picture and the environment facts, then this file for what just happened and what's next.
- **Starting prompt:** [next-session-prompt.md](next-session-prompt.md) is what Adam pastes to start the next session.

## State right now
- **Adam's instruction (2026-11-04):**
  - Keep working without stopping.
  - One branch per major feature, each with its own PR into `dev`.
  - **Merge into `dev` yourself once CI is green and the work checks out.** Only Adam merges into `main`.
  - Keep a report ready for him: [reports/2026-11-05.md](reports/2026-11-05.md) covers everything since 2026-11-03 night, his three findings and his open questions.
- **Merged into `dev` (2026-11-04):**
  - #73: the Morse sprint (E6, E7), merged by Adam.
  - #74: the Arabic design doc and letter data.
  - #75: `privateContent` and `mediaUrl` in the subject contract.
  - #76: the Arabic Meet/Listen/Read lessons.
  - #77: the painted courtyard, "The Long Road In" ch. I and the Painted Sign trial.
  - #79: vowel marks. #80: the slate. #81: the Latin fade. #82, #85: the coffee corner (survival phrases, 9 sets). #84: the Notice Board quest fix. #83, #86: docs.
  - #88–#118: the full review's fixes and Adam's ten review decisions (list in STATUS).
  - #120: Morse Koch gate pass/fail e2e. #121: one save per session (ADR 0031). #122: subjects name their building and Notice Board line (ADR 0019 amended). **The full review is done.**
- **Adam's findings (2026-11-05), all fixed:**
  - #128: the square's speed (#123).
  - #129: Arabic meanings (#125). #141 shortened the list; Adam approved it on 2026-11-09.
  - #130: spelling (#126).
  - #131: loading (#124).
- `main` is still v0.1.0. Whether to release v1.0.0 is Adam's call; the report asks him.

## Next (in order)
1. **Lesson words (#125, done):** Adam approved the lesson 1–3 list (10, 12 and 16 words, most useful first). Lessons 4–8 aren't reviewed yet; give them the same treatment before they ship, in `content/arabic/lesson-words.json`. To rebuild the human-readable table, run a scratchpad script that joins the list with `buildLingualism()`. Never commit that table.
2. **The Groq "understood" check is built** (2026-11-06). It waits for Adam to add `GROQ_API_KEY` in Vercel. The [report](reports/2026-11-06.md) gives him the cost, data (ZDR recommended) and lock-in facts. Once he has added it, try it on the dev site: record a Say it phrase and press "Would they understand me?". Without the key it says "isn't set up yet".
3. **E10** (approved): ADRs 0032–0034 are written; #47 (questline tracker) and #46 (daily contracts) are built, and #48 (owned items, milestone gear, streak shields, reward chests). Chests: `grant_chests` runs inside `claim_contracts` (after every save and when the board opens); `open_chest` rolls with `chest_roll(id, n)` and pays once; the client reads unopened chests after the contracts (`player.loadContracts`). #49 part 1 is built: 16 wares in `GEAR` (painted in `paint.ts`, `PAINTED_GEAR`) and 4 `DYES` (`look.dye`, kept only if owned), all in `content/core/items.json` and migration `20261112000000_market_wares.sql`. Next, #49 part 2: `market_today()` (4 slots seeded by the day: 2 gear, 1 color, 1 functional) and `buy_item(id)`, and the Market stall on the Notice Board. Contract events ride on `save_session` (`p_events`); a new kind needs a template in `content/<subject>/contracts.json` and a migration, or the database ignores it.
4. **#137** (Adam, 2026-11-09): the site still feels too slow. After E10, measure first (Lighthouse and a trace on the live dev site, phone and desktop), then fix what the numbers show.
5. **Audio for the missing phrases:** retry the lingualibre.org speaker pages (Q917215 Akram, Q645576 Khalil.rantissi) for place and dialect. Never use a file before Adam has seen it.
6. **No v1.0.0** until Adam says so.

## Things the next session should know
- **Arabic code map (`src/subjects/arabic/`):**
  - `letters.ts`: letters, lessons, shapes, Hebrew spelling, lookalikes.
  - `words.ts`: the deck's words.
  - `progress.ts`: saved state, the pass gate, `applyTrial`.
  - `questline.ts`: "The Long Road In".
  - `lesson/`: `ScriptLesson.tsx` (with `only='listen'|'read'` for the fountain and the storyteller), `Trial.tsx`, `questions.ts`, `report.ts`.
  - `hall/`: `paintKhan.ts` paints the courtyard; `Courtyard.tsx` places milestones, the scroll, the banner and the stations.
  - `Caravanserai.tsx` switches views. `?open=lesson|listen|read|trial|write|phrases` opens one directly, for tests.
  - `ArabicText` isolates Arabic runs inside English text.
  - `marks.ts`: vowel marks, vowelled Hebrew (`inHebrewVowelled`, NFC output: compare Hebrew in tests with `.normalize('NFC')`).
  - `write/`: `trace.ts` scores a drawing on a 64×64 grid; `Slate.tsx`.
  - `phrases/`: `sets.ts`, `hebrew.ts` (Latin → Hebrew letters), `useRecorder.ts`, `CoffeeCorner.tsx`.
  - **Gotcha:** never return `play()`'s promise from a `useEffect` (use braces); it broke the page.
- **Morse code map (`src/subjects/morse/`):**
  - `player.ts` plays Morse.
  - `lesson/` holds the Koch runs, progress and the trials.
  - `recognition/` is the Instant Recognition game.
  - `hall/` is the painted room: `paintTower.ts` paints it, `Hall.tsx` places lamps, writing and stations on it.
  - `send/` is the straight key: `decoder.ts`, `fist.ts`, `sidetone.ts`, `drill.ts`, `SendDrill.tsx`.
  - `TowerHall.tsx` switches between the hall and the activities. `?open=koch|recognition|trial|sending` opens one directly, for tests.
- **The Groq check:**
  - `api/understood.ts` is built by Vercel on its own, so it imports nothing from `src/`. `vercel.json` sends every path except `/api/` to `index.html`.
  - The cap lives in the database (`claim_speech_check`, 100 per learner per UTC day, licensees only).
  - The compare is `src/subjects/arabic/phrases/understood.ts`. `tests/understood-spike.test.ts` holds it to the spike's native clips (30/30 sentences, at least 18/20 words). Before loosening or tightening it, re-check that none of the 91 phrases passes for another; use a scratchpad script with `buildLingualism`, and never commit deck text.
  - The e2e (`e2e/understood.spec.ts`) uses Chromium's fake microphone and fakes `/api/understood`.
- **Full-window halls:** a place screen whose child has the class `.place-scene` gets the whole window (`App.css`, `:has()`). Halls that paint a room use this.
- **`useStage`** (`src/core/city/useStage.ts`) scales a 1920×1080 painted stage and pans it on upright phones; the city and the tower share it. The tower passes its own fit, `towerFit`, which keeps the room's sides and lets the ceiling fill tall windows.
- **Watch `e2e/morse-lesson.spec.ts` (desktop):** it failed once in a full local run on 2026-11-09 (#48 part 2), then passed 15 runs in a row, 4 workers included. The error was lost (the next run clears `test-results/`). It takes about 35 s of its 60 s budget, mostly audio playback. If it fails again, keep `test-results/` and read the error before anything else.
- **The decoder** re-reads the whole drill on every press (two-means on log key-down lengths), so don't "optimise" it into one-element-at-a-time learning: that misreads slow senders (see `docs/game/morse-lessons.md`).
- **Measuring speed:** a temporary e2e spec can throttle the CPU (`page.context().newCDPSession(page)` → `Emulation.setCPUThrottlingRate` 4) and record `requestAnimationFrame` gaps and `PerformanceObserver('longtask')` per screen; count Supabase requests with `page.on('request')` (port 54321 is the fake). Headless Chromium paints without a GPU, so confirm on a real phone.
- **Lesson words (#125):** a reviewed lesson (`REVIEWS` in `words.ts`) uses only the listed deck ids, with our gloss. Unreviewed lessons drop verbs. The e2e fake must use reviewed ids: use `lessonWord(n, …)` in `e2e/fake-supabase.ts`.
- **Frame budget (#123, #132):** `e2e/city-speed.spec.ts` times the square against a **reference scene drawn in the same run** (the best of 3 rounds). CI composites in software and its runners are sometimes slow for a whole test, so fixed limits measured the machine (PR #130 failed on a rename). The test checks idle frame p95 against the reference plus one frame, compositor work against 5× (idle) and 7× (hover) the reference, and hover raster against 0.45 of it. Hover frame gaps are not checked: on CI they read 33–67 ms for the same square. If it fails, look for an animation that isn't transform/opacity, or a filter on hover. Don't loosen the ratios.
- **Loading (#124):**
  - `cachedContent` (`src/core/content/packCache.ts`) keys the kept deck by `privatePackVersion`.
  - The e2e fake answers the version check with `Content-Range` plus `Access-Control-Expose-Headers`; without that header, the count is unreadable and the cache never hits.
  - `useAudio(api, upcoming)` signs in a layout effect, so it runs before a child question plays.
- **Checking deck meanings:** the deck is in `sources/arabic/lingualism-palestinian-vocabulary/` (private, never committed). A throwaway script in `scripts/` can call `buildLingualism()` (`scripts/content/lingualism.ts`) and `wordsFrom()` (`src/subjects/arabic/words.ts`) and print id, Arabic, romanisation, English and tags (`section:NN`) to the scratchpad; run it with `npx tsx`. Don't commit the dump.
- **Screenshots:** write a temporary `e2e/zz-shots.spec.ts` using `signedIn()` from `e2e/fake-supabase.ts` and run it with Playwright. Delete it before committing.
- **Hanging pushes:** `git push` occasionally hangs. Run it with `timeout 60` and retry.
- **Rejected pushes:** on 2026-11-05 GitHub refused one commit six times with `fatal error in commit_refs`, across branch names. Rewriting the commit message in plain ASCII (no en dash) let it through. The cause is a guess.
- **CI shown as cancelled:** a run can finish every step and still read "cancelled". This session can't re-run jobs (403), so merging the latest `dev` into the branch gives it a fresh run.
- **Merging into `dev`:** Claude merges its own green PRs (Adam, 2026-11-04). Subscribe to each PR, and unsubscribe after merging.
- **Vitest:** check for `Errors` as well as `Tests` in its summary. Unhandled rejections fail CI even when every test passes.
- **e2e can import app code:** JSON imports in `src/` carry `with { type: 'json' }`, so a spec can import pure modules (e.g. `lettersOf`, `inHebrewVowelled`) to work out the right answer. Keep that attribute on new JSON imports. `listenForAudio()` + `played()` in `e2e/fake-supabase.ts` tell a test which recording played, `listenForMorse()` + `morseRuns()` decode the Morse a run schedules, and the fake database returns the state a session saved (by subject).
- **CSP (#108):** no inline `style` attributes in painted SVG strings (use classes), and zod runs `jitless` (`src/core/strictCsp.ts`, imported first). `e2e/headers.spec.ts` fails on any CSP violation.
- **Wikimedia rate limits:** Commons returns 429 to this container after a few hundred calls; lingualibre.org often times out. Go slowly, in the background.
- **Leftovers for Adam:** see STATUS → "What to do next" item 1 (the optional v0.1.0 tag and two old branches). Before friends join (M5), add a per-user rule for the deck (personal-use licence).
