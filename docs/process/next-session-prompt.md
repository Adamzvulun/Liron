# Prompt for the next Claude session (written 2026-11-15)

Paste this as the first message of a new session:

---

We're continuing work on Waymark, my personal learning hub for Arabic and Morse (repo: Liron). Branch from `dev` (ADR 0015) and open PRs into `dev`. Merge your own PRs into `dev` once CI is green and the work checks out; only I merge into `main`. Don't release v1.0.0 until I say so.

Before you do anything, read `CLAUDE.md`, then `docs/process/STATUS.md`, then `docs/process/HANDOFF.md` (items 54–59 are the latest), and follow them.

Actions minutes cost money, so keep CI use low:
- Bundle smaller issues and features into one PR. No stacked PRs; push rarely, and never while a run is going.
- Run the full checks locally before opening a PR: tsc, eslint, prettier, vitest (also with `TZ=UTC`, as CI runs), then the whole Playwright suite with `--trace off`.
- Never treat a red, cancelled or flaky run as green. Check the job log: 4 skipped is normal.
- If a job fails within seconds with no runner and no log, the Actions budget has run out. Tell me; don't push again to kick it.

First:
1. If an open PR from the last session is still there, check its CI log. If it's clean, squash-merge it with the full head SHA and unsubscribe.
2. Then pick from the plan in HANDOFF/STATUS:
   - More B1 words in the same kind of chapters, each with its own sentences, grammar card and regular. The scratch scripts don't survive a session, so rebuild them in your scratchpad (HANDOFF says what they do). Deck text and deck analysis never go into `content/`, the bundle or commits (ADR 0011).
   - Or the open M4 items. The things waiting on me are listed under "Open questions" in STATUS: the M5 questions, the inn's character sheets, the regulars' voices, `GROQ_API_KEY`, v1.0.0.

Keep `docs/process/STATUS.md`, `HANDOFF.md`, this prompt and my report (`docs/process/reports/`) current as you go. Screenshot any visual change and look at it before showing me. Ask me anything that costs money, shares data or locks us in. If I'm away, make the call I'd make, note it in the report, and keep working.
