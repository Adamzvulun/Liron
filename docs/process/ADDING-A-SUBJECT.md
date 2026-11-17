# Adding a subject: the guild-hall kit

How to add a third guild to Waymark, written from the subject contract ([ADR 0019](../decisions/0019-subject-contract.md)) and from how the Signal Tower and the Caravanserai were actually built (task 4.5, #337). Follow it top to bottom. Where a step forces a change in `src/core/`, the kit has a gap; the gaps known today are listed at the end, and fixing them is part of building the third hall.

**Adam picks the subject.** Nothing here starts until he has (PLAN.md, 4.5's gate).

## 1. Decide, and write it down

- **The subject, and what "learned" means for it.** One learner goal in plain words, like "send and receive without thinking". The capstone at the end of the road will test exactly that (task 4.3).
- **Its place and guild:** the building's name on the sign, the guild's name, its color (no blue backgrounds: the night is warm), and its first chapter's story. Write it in `docs/game/` like `morse-lessons.md` and `arabic-script-lessons.md`.
- **Its sources and their licenses**, checked before anything is proposed ([CLAUDE.md](../../CLAUDE.md): research first). Free sources only. Licensed material stays private (ADR 0008, ADR 0023).
- **An ADR** for anything new in kind: a new service, a new kind of content, a new way of judging.

## 2. The folder and the registry

- Copy `src/subjects/example/` to `src/subjects/<id>/`. The id is lowercase, stable forever, and used in URLs and storage keys.
- Fill in its `SubjectInfo` (`src/core/subject.ts`): `id`, `place`, `tagline`, `guildColor`, `building`, `quest`, `welcome`, and later `road`, `ledger`, `skills` and `Hall`.
- List it in `src/subjects/index.ts`. `defineSubjects` refuses a bad or repeated id, place or building.
- **Rules the tests enforce** (`tests/boundaries.test.ts`): a subject imports nothing from another subject, `src/core/` imports no subject, only the scheduler imports ts-fsrs, and site code never imports `sources/` or `scripts/`. Shared code moves to `src/core/`. For example, the finale card's CSS moved to `core/city/finale.css` when both halls needed it.

## 3. Its saved state

- One zod schema in `<id>/progress.ts` with `.catch(...)` on every field, so old saves always parse, plus a `NEW_PROGRESS`. The platform stores it and never reads it.
- **One save per finished session** (ADR 0031): `api.saveSession({ state, xp, minutes, events, reviews, results })`. Never write the tables yourself. The database gives every reward (ADR 0029).
- Spaced repetition goes through `api.recordReview` (FSRS, ADR 0022), and skill ratings through `results` (ADR 0024, the skills listed in `skills`).

## 4. Content is data

Everything a player reads lives in `content/<id>/`, never in code. It is checked by zod schemas when loaded, and kept equal to the database by `supabase/tests/schema.test.ts`.

| File | Holds | Read by |
|---|---|---|
| `questline.json` | Chapters, milestones, intro and outro lines | the hall's scroll, the road |
| `ranks.json` | Ranks and what each needs | `ranksFrom(pack)`, the rank-up card |
| `road.json` | Every step: chapter, kind, door, title, invite, beat | the road |
| `contracts.json` | Daily contract templates | the database (copied by a migration) |
| `finale.json` | The last trial, its screen, epilogue and missed lines | the finale |

Copy the shape of `content/morse/` or `content/arabic/`. Players' text is American English with typographic apostrophes (’) (`tests/spelling.test.ts`). A contract's text says its own numbers (`tests/trial-text.test.ts`).

## 5. The database

One migration per change, each with its own version prefix (`supabase/migrations/YYYYMMDDHHMMSS_name.sql`). Applied to dev on merge, and to live on release (ADR 0018). A subject needs:

- `insert into public.subjects (id) values ('<id>')`.
- **Event kinds** (`subject_event_kinds`): every event the subject reports, with a daily cap. Any other kind is ignored. A numbered trial `trial-N` gets its `requires` (trial N−1) by itself.
- **Contract templates** (`contract_templates`), as in `contracts.json`. Use `requires_kind` for a drill that opens late, and `tier: 1` for the master contracts after the finale (ADR 0048).
- **Rank gear and achievements:** `items` with a `rank` or `trial` milestone, and `achievements` with an `events` condition. Both are mirrored in `content/core/items.json` and `achievements.json`. Each piece of gear needs its art in `src/core/avatar/paint.ts` and its name in `looks.ts`.
- Test it with PGlite (`supabase/tests/`), against the shim (`supabase-shim.sql`).

## 6. The road

Every subject has exactly one road (docs/game/the-road.md), built in `<id>/road.ts` the way `morse/road.ts` and `arabic/road.ts` are:

- a `*_DOORS` list (its hall's doors, and `HALL_DOOR`);
- a check for every written step (`done` and `open`, and `tomorrow` for a lesson that needs a second day), and a step for every check;
- step kinds `lesson`, `visit`, `practice`, `trial`, `rank`, and one `finale` at the very end;
- a `meanwhile` that names something real for every day once the road waits or ends: reviews, then a contract, then the station of the day, with personal bests to beat (ADR 0048).

Its tests walk from the first step to the last, with one open next step at every point, then 30 days past the end, never the same station two days running (copy `road.test.ts`). The tale is regenerated with `UPDATE_TALE=1 npx vitest run tests/tale.test.ts`.

## 7. The hall

- `Hall` is the subject's screen inside its building, given its own `SubjectApi`. `?open=<door>` in the address opens a door directly (for tests). Every result screen ends with `NextStep`, so the player is never lost.
- **Painted in the browser** ([ADR 0006](../decisions/0006-art-direction.md), [ADR 0025](../decisions/0025-city-painted-in-the-browser.md)): SVG from code, deterministic, no image files, using `paintKit.ts`. Each painting has a test that it's the same twice and fits its stage. Screenshot every screen at 320 pixels and on desktop, and look at it (`docs/design/concept-v0/tools/render.js`, run as `.cjs`).
- The finale's screen uses `pictureUrl` and `core/city/finale.css`, and it ends on a door into the daily loop.

## 8. Ranks, ledger, compass

- **Ranks:** `ranks.json`, plus `<id>/ranks.ts` for the standing (what counts toward each rank). The `RankUp` card sends `rank-<id>`.
- **Ledger:** `ledger` in `SubjectInfo`, returning rows and a trend line (docs/game/ledger.md), with a capstone line that shows the distance to the finale.
- **Compass:** `road` in `SubjectInfo`. The platform only asks for it; it never reads a road itself.

## 9. Before the PR

The usual checks (WORKFLOW.md): `tsc -b`, eslint, prettier, vitest (also with `TZ=UTC`), the whole Playwright suite with `--trace off`, and the load budget with `--workers 1`. Each hall gets an e2e spec for its first chapter, using `signedIn(page, …, state)` from `e2e/fake-supabase.ts`.

## Known gaps: where `src/core/` still names the two halls

A third hall can't be added without touching the platform yet. These are the places, found while writing this kit (2026-11-17). Building the first new hall starts by fixing them, in one ADR, so that a fourth needs none of it:

| Where | What is fixed to two halls | The fix |
|---|---|---|
| `src/core/subject.ts` | `HALL_BUILDINGS = ['tower', 'caravanserai']` | Buildings by plot: the square's empty plots become `plot-1`, `plot-2`, and a subject claims one |
| `src/core/city/painter.d.ts`, `layout.ts` | `PlaceId`, `PLACE_PATHS`, `PLACE_SOON` list the two halls by name | Derive a hall's place and path from its subject (`/<id>`) |
| `src/core/city/painter.js` | The two halls are painted into the square; the plots are roped-off earth | A subject paints its own building onto its plot (`SubjectInfo.paintBuilding`), in the square's style and light |
| `src/core/city/City.tsx` | A special case for `caravanserai` | Move it into the subject's building painting |
| `src/core/App.tsx` | `place === 'tower' \|\| place === 'caravanserai'` (no sound bed in halls) | Ask whether the place has a resident subject |

The painted halls are new city art, so the fix has its own screenshots at every width, and stays inside the square's speed budget (`e2e/city-speed.spec.ts`).
