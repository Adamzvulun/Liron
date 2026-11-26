---
description: Work autonomously through the backlog while Adam is away, deciding as he would
argument-hint: (optional) until <time>, or a focus
---
Adam is away and can't answer until he returns. Extra words from him, if any: $ARGUMENTS

**Typing `/away` is Adam's go** for the planned work in `.claude/BACKLOG.md` (Next) and [PLAN.md](../../docs/process/PLAN.md). That includes phases marked "waits on Adam's go". Pick the work yourself and keep going. **Never end your turn to wait for Adam.** Each question you would have asked becomes a decision you make and log.

**Choosing the work**
1. Finish anything under In progress first, including your own open PRs that are red or have review comments.
2. Then take the top item of Next that you're allowed to do. Follow PLAN.md's order inside a phase.
3. Skip what needs Adam (see the limits below), note why, and take the next item.
4. When an item is done, move straight to the next one. Finishing a phase's build is not a reason to stop.
5. If he named a focus or an `until` time above, respect it.

Run each item through the orchestrator flow in `.claude/CLAUDE.md`: plan it, the agents, then `reviewer`, the tests and a PR. The plan isn't shown to Adam first; it goes into the log instead.

**Deciding as Adam would**
1. Look for his answer first. Check `.claude/CLAUDE.md`, STATUS, HANDOFF, PLAN, the ADRs, the issue and its comments, and what he chose in similar cases before. A written answer of his wins.
2. If none is written, take the option that is reversible, smallest, and closest to the plan and the house conventions.
3. Between equals, take the one that keeps the vision whole. Order the work; don't cut anything.
4. If a decision is truly his and has no safe default, such as a new look, a tone, or a product trade-off:
   - Pick the reversible default and mark it **provisional** in the log.
   - Or skip that item.

**Log every decision.** Add a HANDOFF item for this session with a "Decisions while Adam was away" list. Each entry gives the question, what you chose, why, and how to undo it. Put the same list in each PR body.

**Never, even when you're sure he'd agree.** Put these under "Waiting for Adam" in BACKLOG and move on:
- merge into `main`, release, tag or deploy production;
  - Building a version's work on `dev` is fine.
  - Its release PR stays open for him.
- spend money, add a paid service, or add a dependency or technology without an ADR he approved;
- delete or rewrite data, history or branches, or run a migration on production;
- change keys, secrets, permissions, CI rules or ponytail's webhook;
- send anything outside the repo (no messages, issue comments or invites) beyond your own PRs;
- touch `docs/process/next-session-prompt.md`.

**Allowed:**
- branches, commits, and PRs into `dev`;
- squash-merging your own PR into `dev` once CI is green and `reviewer` passes. Use an explicit title and message and the full 40-character `expectedHeadSha`. `dev` is the staging site Adam checks before any release.

**Keep going safely**
- Full local checks before every push.
- One PR per item, so each can be undone on its own.
- An agent that fails twice on the same task: log it, park the task under "Waiting for Adam", and move on.
- Mind the budget. Do small work inline, and use subagents only where the roster says so.
- Before each new item, update BACKLOG and HANDOFF and push. If the session is cut off, nothing is lost and the next `/away` picks up from there.
- Stop only when:
  - nothing in the backlog can be done without Adam;
  - or the `until` time passes;
  - or you're cut off.

**When you stop**
- Update BACKLOG, STATUS and HANDOFF, then commit and push.
- End with a short report covering:
  - what was done, with PR links;
  - each decision you made;
  - each provisional decision he should confirm;
  - what is waiting for Adam;
  - the suggested next step.
