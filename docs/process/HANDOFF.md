# Handoff for the next Claude session

- **Written:** 2026-11-03, during the overnight run; updated 2026-11-04 after the Arabic sprint (PRs #74–#82). Adam told Claude to keep working through the plan, make the calls he'd make, research what needs researching, and keep working properly with git, and repeated it on 2026-11-04.
- **Read first:** [STATUS](STATUS.md) for the full picture and the environment facts, then this file for what just happened and what's next.

## State right now
- **Adam's instruction (2026-11-04):**
  - Keep working without stopping.
  - One branch per major feature, each with its own PR into `dev`.
  - **Merge into `dev` yourself once CI is green and the work checks out.** Only Adam merges into `main`.
  - Keep a report ready for him: [reports/2026-11-04.md](reports/2026-11-04.md) lists what was done, what needs his approval and what he should try.
- **Merged into `dev` (2026-11-04):**
  - #73: the Morse sprint (E6, E7), merged by Adam.
  - #74: the Arabic design doc and letter data.
  - #75: `privateContent` and `mediaUrl` in the subject contract.
  - #76: the Arabic Meet/Listen/Read lessons.
  - #77: the painted courtyard, "The Long Road In" ch. I and the Painted Sign trial.
  - #79: vowel marks. #80: the slate. #81: the Latin fade. #82: the coffee corner (survival phrases).
- `main` is still v0.1.0. Whether to release v1.0.0 is Adam's call; the report asks him.

## Next (in order)
1. **Adam goes through the report:** approvals, and the things he should try on his phone.
2. **Waiting on Adam:** the Groq speech check (then the final fade to no choices), closing #44, release v1.0.0.
3. **More phrase sets** for the coffee corner (`content/arabic/phrases.json`, deck ids only).
4. **E10** once Adam approves the draft (`e10-quests-and-rewards.md`, which he has as a file) and its Notice Board concept.

## Things the next session should know
- **Arabic code map (`src/subjects/arabic/`):**
  - `letters.ts`: letters, lessons, shapes, Hebrew spelling, lookalikes.
  - `words.ts`: the deck's words.
  - `progress.ts`: saved state, the pass gate, `applyTrial`.
  - `questline.ts`: "The Long Road In".
  - `lesson/`: `ScriptLesson.tsx` (with `only='listen'|'read'` for the fountain and the storyteller), `Trial.tsx`, `questions.ts`, `report.ts`.
  - `hall/`: `paintKhan.ts` paints the courtyard; `Courtyard.tsx` places milestones, the scroll, the banner and the stations.
  - `Caravanserai.tsx` switches views. `?open=lesson|listen|read|trial` opens one directly, for tests.
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
- **Screenshots:** write a temporary `e2e/zz-shots.spec.ts` using `signedIn()` from `e2e/fake-supabase.ts` and run it with Playwright. Delete it before committing.
- **Hanging pushes:** `git push` occasionally hangs. Run it with `timeout 60` and retry.
- **Merging into `dev`:** Claude merges its own green PRs (Adam, 2026-11-04). Subscribe to each PR, and unsubscribe after merging.
- **Leftovers for Adam:** see STATUS → "What to do next" item 1 (the optional v0.1.0 tag and two old branches). Before friends join (M5), add a per-user rule for the deck (personal-use licence).
