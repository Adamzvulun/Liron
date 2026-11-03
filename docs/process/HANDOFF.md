# Handoff for the next Claude session

- **Written:** 2026-11-03, at the end of the session that built E5 (the avatar, PR #68).
- **Read first:** [STATUS](STATUS.md) for the full picture and the environment facts, then this file for what just happened and what's next.

## State right now
- **Merged into `dev`:**
  - E2: #16–#20 (login, schema, subject contract, XP and levels, streak).
  - E3: #21 FSRS, #22 Glicko-2, #23 content pipeline.
  - E4: #24 city screen, #25 clickable places, #26 HUD, #27 phone layout.
  - PR #64, which uploads audio 8 files at a time.
- **`main` (the live site) is still v0.1.0.** A release PR from `dev` to `main` is Adam's call; only Adam merges into `main`.
- **`waymark-dev` (Supabase)** has every migration up to `20261103020000_skill_ratings.sql`, plus the whole Lingualism deck: 4,823 items, 57 lessons and 4,823 MP3s.
- **`waymark-prod` (Supabase)** gets the same automatically on the first merge to `main`. With PR #64, the first upload should fit within the content job's 20-minute limit. Check that job's log at the release.
- **Adam approved** the city on PC and on an iPhone 16 (2026-11-03), after these fixes:
  - The scene fills the window. At most 18% of an edge is cut off, mostly sky (`stageFit` in `src/core/city/layout.ts`).
  - The Arena's flags are removed.
  - The phone HUD is two slim rows.

## Next (in order)
1. **E5 avatar v0 (#6) is in [PR #68](https://github.com/Adamzvulun/Liron/pull/68).**
   - It holds #28 (the paper-doll avatar) and #29 (the wardrobe in Your House).
   - Adam approved the concept on 2026-11-03: "looks good for now, we can add more stuff later".
   - Merging is Adam's call. The details are in [avatar](../game/avatar.md).
   - The locked items' names and earn conditions are placeholders until E10.
2. **After #68 is merged, M1 is done.**
   - Write the M1 retro in `docs/process/retros/`.
   - Suggest to Adam a release PR from `dev` to `main`, and a v0.2.0 tag. Adam creates tags in GitHub → Releases.
3. **Then M2: first playable (#7–#11).**

## Things the next session should know
- **Where the avatar code lives:** `src/core/avatar/` (`looks.ts` holds options and items as data, `paint.ts` is the SVG painter, `Avatar.tsx`, `Wardrobe.tsx`). In the city, the painter paints only the avatar's shadow; `City.tsx` puts the figure on top.
- **Where the city code lives:**
  - `src/core/city/`: `painter.js` paints the scene, deterministic from one seed. `City.tsx` places it, `layout.ts` holds positions, paths and `stageFit`, and `PlaceScreen.tsx` is the place screens.
  - Navigation is our own ~40 lines (`src/core/router.ts`, `src/core/Link.tsx`; ADR 0026).
  - `vercel.json` rewrites every path to `index.html` so deep links work.
- **Painter caveat:** the painter draws with a seeded random sequence. Adding drawing calls that use `R()` before other parts shifts everything painted after them. Add new elements late, or check the screenshot.
- **Phone mode** means an upright window under 900 px wide (`city--pan`). The view pans; it keeps its centre through resizes (`centre` ref in `City.tsx`). The view needs `min-height: 0`, or it can't shrink when the HUD loads; CI caught that once.
- **Screenshots:** write a temporary `e2e/zz-shots.spec.ts` using `signedIn()` from `e2e/fake-supabase.ts` and run it with Playwright. Delete it before committing.
- **The e2e fake Supabase** answers wallets, today, profiles (GET and PATCH) and the RPCs. Extend it when the app reads new tables.
- **Stacked PRs:** when a fix belongs to an earlier branch in a stack, commit it there and merge it forward. Never rebase; merge commits only.
- **Merging into `dev`:** only when Adam asks in so many words. He did on 2026-11-03 for #63–#67. Otherwise open the PR, watch it, and leave the merge to him.
- **Hanging pushes:** `git push` occasionally hangs. Run it with `timeout 60` and retry.
- **Leftovers for Adam:** still open from earlier, see STATUS → "What to do next" item 1 (the v0.1.0 tag and two old branches). Before friends join (M5), add a per-user rule for the deck (personal-use licence).
