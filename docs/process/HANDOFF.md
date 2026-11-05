# Handoff for the next Claude session

- **Written:** 2026-11-03, during the overnight run; updated 2026-11-04 (Arabic sprint, review fixes) and 2026-11-05 (the review's last items #120–#122, and Adam's three findings filed as #123–#126). Adam told Claude to keep working through the plan, make the calls he'd make, research what needs researching, and keep working properly with git.
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
- **Open issues from Adam's try (2026-11-05):** #123–#126, below. Nothing is fixed yet; Adam asked for them documented first.
- `main` is still v0.1.0. Whether to release v1.0.0 is Adam's call; the report asks him.

## Next (in order)
1. **[#123](https://github.com/Adamzvulun/Liron/issues/123) (p0): the city square's speed.** Research first (rasterise the static scene; animate only small layers with transform/opacity; a glow image instead of the hover drop-shadow), amend ADR 0025, add a frame-time e2e budget. Method and numbers: [dev-site-problems-2026-11-05](../research/dev-site-problems-2026-11-05.md).
2. **[#125](https://github.com/Adamzvulun/Liron/issues/125) (p0): Arabic meanings.** A reviewed lesson-word list in `content/arabic/` with our own glosses where the deck's need context; strip `[pl.]`/`[55]`-style tags from the romanisation; homographs by vowel marks; no verbs before verbs are taught; drop unsuitable words. Ask Adam which words he saw.
3. **[#126](https://github.com/Adamzvulun/Liron/issues/126) (p1): American spelling** in every visible string (list in the issue); add the rule to CLAUDE.md's conventions.
4. **[#124](https://github.com/Adamzvulun/Liron/issues/124) (p1): loading.** `React.lazy` per hall, sign a session's audio in one go, cache the deck in IndexedDB.
5. **The rules from the review's last item:** a finished session uses `api.saveSession(report)` (ADR 0031), and a subject names its own `building` and `quest` in `SubjectInfo` (ADR 0019, amended), so `src/core/` never names a subject.
6. **The Groq "understood" check** (approved by Adam): a server-side Vercel function; the key never reaches the browser.
7. **E10** (approved): ADRs first, from 0032. Contract events ride `save_session` (ADR 0031).
8. **Audio for the missing phrases:** retry lingualibre.org speaker pages (Q917215 Akram, Q645576 Khalil.rantissi) for place and dialect, and search the rest of the ajp file names. Never use a file before Adam has seen it.
9. **No v1.0.0** until Adam says so.

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
- **Full-window halls:** a place screen whose child has the class `.place-scene` gets the whole window (`App.css`, `:has()`). Halls that paint a room use this.
- **`useStage`** (`src/core/city/useStage.ts`) scales a 1920×1080 painted stage and pans it on upright phones; the city and the tower share it. The tower passes its own fit, `towerFit`, which keeps the room's sides and lets the ceiling fill tall windows.
- **The decoder** re-reads the whole drill on every press (two-means on log key-down lengths), so don't "optimise" it into one-element-at-a-time learning: that misreads slow senders (see `docs/game/morse-lessons.md`).
- **Measuring speed:** a temporary e2e spec can throttle the CPU (`page.context().newCDPSession(page)` → `Emulation.setCPUThrottlingRate` 4) and record `requestAnimationFrame` gaps and `PerformanceObserver('longtask')` per screen; count Supabase requests with `page.on('request')` (port 54321 is the fake). Headless Chromium paints without a GPU, so confirm on a real phone.
- **Checking deck meanings:** the deck is in `sources/arabic/lingualism-palestinian-vocabulary/` (private, never committed). A throwaway script in `scripts/` can call `buildLingualism()` (`scripts/content/lingualism.ts`) and `wordsFrom()` (`src/subjects/arabic/words.ts`) and print id, Arabic, romanisation, English and tags (`section:NN`) to the scratchpad; run it with `npx tsx`. Don't commit the dump.
- **Screenshots:** write a temporary `e2e/zz-shots.spec.ts` using `signedIn()` from `e2e/fake-supabase.ts` and run it with Playwright. Delete it before committing.
- **Hanging pushes:** `git push` occasionally hangs. Run it with `timeout 60` and retry.
- **Merging into `dev`:** Claude merges its own green PRs (Adam, 2026-11-04). Subscribe to each PR, and unsubscribe after merging.
- **Vitest:** check for `Errors` as well as `Tests` in its summary. Unhandled rejections fail CI even when every test passes.
- **e2e can import app code:** JSON imports in `src/` carry `with { type: 'json' }`, so a spec can import pure modules (e.g. `lettersOf`, `inHebrewVowelled`) to work out the right answer. Keep that attribute on new JSON imports. `listenForAudio()` + `played()` in `e2e/fake-supabase.ts` tell a test which recording played, `listenForMorse()` + `morseRuns()` decode the Morse a run schedules, and the fake database returns the state a session saved (by subject).
- **CSP (#108):** no inline `style` attributes in painted SVG strings (use classes), and zod runs `jitless` (`src/core/strictCsp.ts`, imported first). `e2e/headers.spec.ts` fails on any CSP violation.
- **Wikimedia rate limits:** Commons returns 429 to this container after a few hundred calls; lingualibre.org often times out. Go slowly, in the background.
- **Leftovers for Adam:** see STATUS → "What to do next" item 1 (the optional v0.1.0 tag and two old branches). Before friends join (M5), add a per-user rule for the deck (personal-use licence).
