# 0019 — The subject contract: one bound API per subject, checked import boundaries

- **Status:** Accepted (part of #18)
- **Date:** 2026-11-02
- **Builds on:** [0003](0003-hub-of-independent-subjects.md) (independent subjects), [0017](0017-player-data-schema.md) (player data)

## Context
ADR 0003 says subjects are self-contained modules that report progress to the platform "through a small contract", that no feature may depend on two subjects at once, and that the contract "must be designed carefully in M1". The tables exist (ADR 0017). #19 (XP and levels), #20 (streak, daily goal) and #21 (spaced repetition) build on this contract.

## Options considered
1. **Subjects write the tables themselves** with the Supabase client. Rejected: every subject would repeat the same three writes (subject, today, wallet), any one could forget one or write another subject's row, and three separate writes can half-fail.
2. **A global platform object** that takes a subject id on every call (`platform.awardXP('morse', 10)`). Rejected: nothing stops a subject from passing another subject's id.
3. **One API per subject, bound to its id by the platform, backed by database functions.** Chosen.

## Decision
**A subject is a folder `src/subjects/<id>/`** that exports its `SubjectInfo` (id, place in the city, tagline, guild colour, and optionally its `Hall`: the screen shown inside its place, added 2026-11-03 for the Signal Tower). It's listed in the registry `src/subjects/index.ts`, which checks ids and places are valid and unique. Nothing in `src/core/` changes when a subject is added.

**The platform hands each subject a `SubjectApi`** (`src/core/subject.ts`), already bound to that subject's id:

| Call | Does |
|---|---|
| `awardXP(amount)` | Adds XP (whole number, 1–10,000) to the subject, to today and to the wallet. |
| `recordPractice(minutes)` | Adds practice time, rounded to whole minutes (under 30 s counts as nothing; at most 240 per call). Feeds the daily goal and streak (#20). |
| `progressSummary()` | The subject's XP and minutes. |
| `loadState()` / `saveState(state)` | The subject's own saved data (a JSON object). The platform stores it and never reads it. |

- **Private content, added 2026-11-04 for Arabic (#44):** `privateContent(source)` returns one of the subject's own copyrighted packs (ADR 0023), loaded once per session (a failed load is tried again next time), and `mediaUrl(path)` gives a short-lived link to one of its media files. Both refuse odd sources and paths, and both are bound to the subject like everything else. Behind them is a small `ContentSource`: Supabase in the app, a fake in tests.
- **Spaced repetition is added by #21**, as `recordReview` and a due-items call on the same API, so subjects never talk to the FSRS library directly. Gold and gems arrive with #19.
- **Writes go through two database functions** (migration `20261102210000_record_progress.sql`):
  - `record_progress(subject, xp, minutes)` updates the subject's totals, today's row (today in the profile's time zone, or UTC if that zone name is unknown) and the wallet in **one transaction**, so the wallet can't drift from the subject totals.
  - `save_subject_state(subject, state)` replaces only the state.
  - Both run **as the signed-in user** (`security invoker`), so the row-level security from ADR 0017 still applies, and they refuse logged-out visitors. Amounts are checked in the app and again in the database.
- **Reads** use the table directly; row-level security returns only the user's own rows.
- **Storage is swappable** behind a small `ProgressStore`: Supabase in the app, memory in tests.

**"No feature depends on two subjects" is enforced by a test** (`tests/boundaries.test.ts`, runs in CI with every test run):
1. A subject's files may import only from their own folder, from `src/core/` and from packages. Not from another subject, not from the registry.
2. Platform code (`src/core/`) never imports a particular subject, only the registry.

I checked the test fails when Morse imports Arabic and when platform code imports Morse.

**`src/subjects/example/`** is a template subject. It isn't in the registry, so it never ships. A test registers it next to Morse and Arabic and runs a drill through the contract, which proves a subject can be added without touching platform code. New subjects start by copying it.

## Consequences
- Adding a subject: copy `example/`, change its id and place, list it in the registry. No migration (ADR 0017), no platform change.
- A subject can still call the API with large XP amounts. That only matters once there are friends and leaderboards (M5); then awards should be computed server-side (ADR 0017, E18).
- The boundary test reads import statements with a pattern, not a full parser. It covers `import … from`, `export … from` and `import()`. That's enough for our code; if it ever misses a case, switch to ESLint's import rules.
- When subjects get their own screens (E4, E6), the platform creates the bound API and passes it to the subject's screen. The subject never builds one itself.
