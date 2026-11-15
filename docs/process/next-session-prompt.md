# Prompt for the next Claude session (written 2026-11-15, updated the same day)

Paste this as the first message of a new session:

---

We're continuing work on Waymark, my personal learning hub for Arabic and Morse (repo: Liron). Branch from `dev` (ADR 0015) and open PRs into `dev`. Merge your own PRs into `dev` once CI is green and the work checks out; only I merge into `main`. Don't release v1.0.0 until I say so.

Before you do anything, read `CLAUDE.md`, then `docs/process/STATUS.md`, then `docs/process/HANDOFF.md` (items 54–68 are the latest), and follow them.

Actions minutes cost money, so keep CI use low:
- Bundle smaller issues and features into one PR. No stacked PRs; push rarely, and never while a run is going.
- Run the full checks locally before opening a PR: tsc, eslint, prettier, vitest (also with `TZ=UTC`, as CI runs), then the whole Playwright suite with `--trace off`.
- Never treat a red, cancelled or flaky run as green. Check the job log: 5 skipped is normal (the desktop-only space-bar test made it 5, HANDOFF item 28).
- If a job fails within seconds with no runner and no log, the Actions budget has run out. Tell me; don't push again to kick it.

First:
1. If an open PR from the last session is still there, check its CI log. If it's clean, squash-merge it with the full head SHA and unsubscribe.
2. Then pick from the plan in HANDOFF/STATUS:
   - The deck's words that I want taught are all in (HANDOFF items 60–61; I said to skip the adult words for now). Any further word chapters need a new free source or a new decision from me, so ask before building them. Word chapters have their own sentences, grammar card and regular. The scratch scripts don't survive a session, so rebuild them in your scratchpad (HANDOFF says what they do). Deck text and deck analysis never go into `content/`, the bundle or commits (ADR 0011): an own sentence is never the deck's line.
   - Or the open M4 items. The things waiting on me are listed under "Open questions" in STATUS: the M5 questions, the regulars' voices, checking `GROQ_API_KEY` on the dev site, v1.0.0.

Keep `docs/process/STATUS.md`, `HANDOFF.md`, this prompt and my report (`docs/process/reports/`) current as you go. Screenshot any visual change and look at it before showing me. Ask me anything that costs money, shares data or locks us in. If I'm away, make the call I'd make, note it in the report, and keep working.
