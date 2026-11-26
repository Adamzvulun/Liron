# 0030 — Coverage reports with @vitest/coverage-v8

- **Status:** Accepted
- **Date:** 2026-11-04

## Context
The 2026-11-04 full review found code the tests never reach (e2e flows that accept any outcome, pass/fail gates never checked end to end). We had no way to see which lines the unit tests run. Adam approved adding a coverage tool (review decision 10).

## Options considered
1. **`@vitest/coverage-v8`**: Vitest's own provider, using V8's built-in coverage. Free, MIT, always the same version as Vitest, no code changes or instrumentation step.
2. **`@vitest/coverage-istanbul`**: also free (MIT). Instruments the code first, so it's slower; its extra precision isn't needed here.
3. **No tool**: keep guessing from reading the tests.

## Decision
Option 1, as a dev dependency only. `npm run coverage` prints a summary and writes an HTML report to `coverage/` (git-ignored). It is **a report to read, not a gate**: CI doesn't run it and there's no minimum percentage, because a number target rewards tests that touch lines without checking anything.

## Consequences
- We can find untested code before writing the deterministic pass/fail tests the review asked for. The first run (2026-11-04) covered 60% of lines and 40% of branches in `src/` and `scripts/`.
- One more dev dependency to keep at Vitest's exact version when Vitest is upgraded.
- If we later want a CI gate, that's a new decision.
