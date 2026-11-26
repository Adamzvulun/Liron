---
description: Work autonomously while Adam is away, deciding as he would
argument-hint: <what to work on, e.g. "Phase 10" or "BACKLOG Next 2–3"> [until <time>]
---
Adam is away and can't answer until he returns. The scope he gave: $ARGUMENTS

Run the orchestrator flow in `.claude/CLAUDE.md` on that scope without stopping to ask. **Don't end your turn to wait for Adam.** Each question you would have asked becomes a decision you make and log.

**Deciding as Adam would**
1. Look for his answer first. Check `.claude/CLAUDE.md`, STATUS, HANDOFF, PLAN, the ADRs, the issue and its comments, and what he chose in similar cases before. A written answer of his wins.
2. If none is written, take the option that is reversible, smallest, and closest to the plan and the house conventions.
3. Between equals, take the one that keeps the vision whole. Order the work; don't cut anything.
4. If a decision is truly his and has no safe default, such as a new feature's look, tone, or a product trade-off:
   - Pick the reversible default and mark it **provisional** in the log.
   - Or skip that item and move to the next one in scope.

**Log every decision.** Add a HANDOFF item for this session with a "Decisions while Adam was away" list. Each entry gives the question, what you chose, why, and how to undo it. Put the same list in each PR body.

**Never, even when you're sure he'd agree.** Put these under "Waiting for Adam" and work on something else:
- merge into `main`, release, tag or deploy production;
- spend money, add a paid service, or add a dependency or technology without an ADR he approved;
- delete or rewrite data, history or branches, or run a migration on production;
- change keys, secrets, permissions, CI rules or ponytail's webhook;
- send anything outside the repo (no messages, issue comments or invites) beyond your own PRs;
- start work outside the scope above, or work he said waits on his go (today: v1.7.0, #485);
- touch `docs/process/next-session-prompt.md`.

**Allowed:**
- branches, commits, and PRs into `dev`;
- squash-merging your own PR into `dev` once CI is green and `reviewer` passes. Use an explicit title and message and the full 40-character `expectedHeadSha`. `dev` is the staging site Adam checks before any release.

**Keep going safely**
- Full local checks before every push.
- An agent that fails twice on the same task: log it, park the task under "Waiting for Adam", and move on.
- Mind the budget. Stop when the scope is done, when what's left needs Adam, or when the `until` time in the scope passes.

**When you stop**
- Update BACKLOG, STATUS and HANDOFF, then commit and push.
- End with a short report covering:
  - what was done, with PR links;
  - each decision you made;
  - each provisional decision he should confirm;
  - what is waiting for Adam;
  - the suggested next step.
