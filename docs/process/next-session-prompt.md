# Prompt for the next Claude session (written 2026-11-15, updated 2026-11-18)

Paste this as the first message of a new session:

---

We're continuing work on Waymark, my personal learning hub for Arabic and Morse (repo: Liron). v1.0.0 is live. Branch from `dev` (ADR 0015) and open PRs into `dev`. Merge your own PRs into `dev` once CI is green and the work checks out. Only I merge into `main`.

So continue working on the next version. Don't stop working until you're out of usage. Whatever questions arise, do what you think I would've done.

Before you do anything, read `.claude/CLAUDE.md`, then `docs/process/STATUS.md`, then `docs/process/HANDOFF.md` (items 111–113 are the latest), and follow them.

**The next version is v1.1.0, Open to Friends** (`docs/process/VERSIONS.md`, "Next: v1.1.0"):
1. **My friends get the deck.** This is decided: `docs/decisions/0050-friends-learn-from-the-deck.md`. Don't reopen it. Make every account a licensee with no step from me: a migration plus a backfill, with database tests. Keep the path for an account without a licence honest, with no dead end and no "haven't been loaded". That's task 2.1's "Done when" in PLAN.md.
2. **Everything for 3.7 (Release the Fellowship) that doesn't need me:**
   - the two lows the v1 review left for 2.1;
   - FRIENDS.md checked against the code;
   - my steps for the first friend, as one short list.
3. **Fix anything I report** from the live site.
4. **When it's all merged into `dev`,** cut `release/v1.1.0`, write `docs/process/releases/v1.1.0.md`, open the release PR into `main`, and tell me my part.

Then keep going. Look for real gaps, bugs, rough edges and test holes in what's built, and fix them in bundled PRs. Everything parked stays parked: the third subject (I said it won't come soon), the regulars' voices (Azure), new word chapters, and #137. Those are in `docs/process/LATER.md`.

Actions minutes cost money, so keep CI use low:
- Bundle smaller fixes into one PR. No stacked PRs. Push rarely, and never while a run is going. A docs-only PR skips the browser tests (about 2 minutes); one that touches code runs about 16.
- Run the full checks locally before opening a PR:
  - tsc, eslint, prettier;
  - vitest, and again with `TZ=UTC` as CI runs it;
  - `npx vitest run supabase/tests`;
  - `npm run e2e` (the whole Playwright suite, then the `@timing` tests alone on one worker).
- Never treat a red, cancelled or flaky run as green: check the job log. On arm64 the load budget passes with less headroom than on x64 (CI.md). If it fails at random, compare with x64 before blaming the PR.
- If a job fails within seconds with no runner and no log, the Actions budget has run out. Tell me, and don't push again to kick it.

Rules that outlast the plan:
- Deck text and deck analysis never go into `content/`, the bundle or commits (ADR 0011). Friends reading the deck through the database doesn't change that.
- Don't release anything until I merge the release PR.

Keep `docs/process/STATUS.md`, `HANDOFF.md`, this prompt and my report (`docs/process/reports/`) current as you go. Screenshot any visual change and look at it before showing me. Ask me anything that costs money, shares data or locks us in. If I'm away, make the call I'd make, note it in the report, and keep working.
