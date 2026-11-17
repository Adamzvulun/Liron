# Prompt for the next Claude session (written 2026-11-15, updated 2026-11-16)

Paste this as the first message of a new session:

---

We're continuing work on Waymark, my personal learning hub for Arabic and Morse (repo: Liron). Branch from `dev` (ADR 0015) and open PRs into `dev`. Merge your own PRs into `dev` once CI is green and the work checks out; only I merge into `main`. Don't release v1.0.0 until I say so.

Before you do anything, read `CLAUDE.md`, then `docs/process/STATUS.md`, then `docs/process/HANDOFF.md` (items 94–106 are the latest), and follow them.

Actions minutes cost money, so keep CI use low:
- Bundle smaller issues and features into one PR. No stacked PRs; push rarely, and never while a run is going.
- Run the full checks locally before opening a PR: tsc, eslint, prettier, vitest (also with `TZ=UTC`, as CI runs), then the whole Playwright suite with `--trace off`.
- Never treat a red, cancelled or flaky run as green. Check the job log. 10 skipped is normal: ten tests run on only one of the two projects, phone or desktop (`grep -n "test.skip" e2e/*.spec.ts` lists them).
- If a job fails within seconds with no runner and no log, the Actions budget has run out. Tell me; don't push again to kick it.

**Your work order is `docs/process/PLAN.md`** (2026-11-16). Read it after HANDOFF. **`docs/process/VERSIONS.md` gives the order**: work the versions in turn (1.0 first), ticking tasks off in the plan. The designs are already written (`docs/game/the-road.md`, `docs/design/grounds.md`, `docs/game/fellowship-build.md`): build to them. At a gate, ask me once and carry on with the next task that doesn't depend on it.

First:
1. If an open PR from the last session is still there, check its CI log. If it's clean, squash-merge it with the full head SHA and unsubscribe.
2. Find your place: PLAN.md's ticked boxes and VERSIONS.md's "Where things stand" say what is done. Start at the first unticked task of the current version. On 2026-11-17, v1.0's gates (1.12, 1.13) wait on Adam, and v1.1, v1.2 and v2.0 are built (HANDOFF items 94–105), except v2.0's task 2.1, which is Adam's decision. v2.1 to v2.4 (tasks 3.3–3.6) are built too (HANDOFF items 104–106); 3.7 is Adam's. Start at **v3.0** (tasks 4.2, 4.3, then 4.1, as VERSIONS.md orders them).
3. Rules that outlast the plan: deck text and deck analysis never go into `content/`, the bundle or commits (ADR 0011). No new word chapters without a new source or a decision from me. The regulars' voices are parked until I've looked at Azure. Don't release anything until I say so; when a version is ready, cut its release branch (or ask me to), open the release PR, and tell me what my part is.

Keep `docs/process/STATUS.md`, `HANDOFF.md`, this prompt and my report (`docs/process/reports/`) current as you go. Screenshot any visual change and look at it before showing me. Ask me anything that costs money, shares data or locks us in. If I'm away, make the call I'd make, note it in the report, and keep working.
