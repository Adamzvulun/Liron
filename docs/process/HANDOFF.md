# Handoff for the next Claude session

- **Written:** 2026-11-03, during the overnight run. Adam went to sleep and told Claude to keep working through the plan, make the calls he'd make, research what needs researching, and keep working properly with git.
- **Read first:** [STATUS](STATUS.md) for the full picture and the environment facts, then this file for what just happened and what's next.

## State right now
- **Open: [PR #73](https://github.com/Adamzvulun/Liron/pull/73)** into `dev`, on branch `claude/brave-ride-j0hcmv`. It closes #32–#37. **Don't merge it; Adam does.** It holds:
  - **Approved by Adam (2026-11-03):** #32 saving Instant Recognition rounds, #33 the tower hall, and #34 "The Silent Beacon" I–II with trials. CI passed on 639fbe9.
  - **Overnight, awaiting Adam's review:** the tower's **painted room** (#33, commit bf4ef15) and **sending with a straight key** (#35 sidetone and key, #36 decoder, #37 fist analysis). Each is its own commit, so either can be reverted alone.
- **Why one PR:** this session can push only to its one designated branch, and the Stop hook pushes every commit. So the overnight work landed on the open PR. Its description marks which parts are approved.
- **Merged into `dev` before this:** M1 (E1–E5); #30 sound engine and #31 Koch lessons (PR #71, #72). `main` is still v0.1.0.

## Next (in order)
1. **Adam reviews PR #73.** He checks the painted room, the sending drill and its fist analysis on the preview, then merges or asks for changes.
2. **Then the Morse sprint (E6, E7) is complete,** and the Arabic sprint starts: E8 (Caravanserai: script, #38–#43), then E9 (survival phrases, #44, #45). Design first: a screenshotted concept that Adam approves before building.
3. **Release v1.0.0** when Adam decides there's enough to learn. Morse is now playable end to end.

## Things the next session should know
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
- **Merging into `dev`:** only when Adam asks in so many words.
- **Leftovers for Adam:** see STATUS → "What to do next" item 1 (the optional v0.1.0 tag and two old branches). Before friends join (M5), add a per-user rule for the deck (personal-use licence).
