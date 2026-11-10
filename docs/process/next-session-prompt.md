# Prompt for the next Claude session (written 2026-11-10)

Paste this as the first message of a new session:

---

We're continuing work on Waymark, my personal learning hub for Arabic and Morse (repo: Liron). Branch from `dev` (ADR 0015) and open PRs into `dev`. Merge your own PRs into `dev` once CI is green and the work checks out; only I merge into `main`. Don't release v1.0.0 until I say so.

Before you do anything, read `CLAUDE.md`, then `docs/process/STATUS.md`, then `docs/process/HANDOFF.md` (the last items are the latest), and follow them.

Actions minutes cost money, so keep CI use low:
- Bundle smaller issues and features into one PR. No stacked PRs; push rarely.
- Run the full checks locally before opening a PR: tsc, eslint, prettier, vitest, then the whole Playwright suite with `--trace off`.
- Never treat a red, cancelled or flaky run as green. Check the job log: 4 skipped is normal.

First:
1. If the last session's PR is still open (HANDOFF says which), check its CI log. If it's clean, squash-merge it with the full head SHA, close its issue and unsubscribe.
2. Then go on with the plan in HANDOFF/STATUS:
   - More B1 words in the same kind of chapters, each with its own sentences and a regular. The scratch scripts don't survive a session, so rebuild them in your scratchpad (HANDOFF says what they do). Deck text and deck analysis never go into `content/`, the bundle or commits (ADR 0011).
   - Or the other open items. E15 (the Radio Room operators' personalities) waits on my decisions about AI providers and data; the questions are in the latest report.

Keep `docs/process/STATUS.md`, `HANDOFF.md`, this prompt and my report (`docs/process/reports/`) current as you go. Screenshot any visual change and look at it before showing me. Ask me anything that costs money, shares data or locks us in. If I'm away, make the call I'd make, note it in the report, and keep working.
