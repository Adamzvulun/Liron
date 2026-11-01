# Workflow

This adapts the discovery → planning → execution → retrospective lifecycle from the `jeffallan/claude-skills` workflow commands.
GitHub replaces Jira, and `docs/` replaces Confluence.

```
Idea ──► Discovery doc ──► ADR(s) ──► Epic issue ──► Feature issues ──► PRs ──► Milestone retro
         docs/discovery     docs/decisions  GitHub          GitHub           GitHub    docs/process/retros
```

## 1. Discovery
- Open-ended brainstorm and research go in `docs/discovery/NN-topic.md` and `docs/research/`.
- Each discovery doc ends with **Open questions** and **Proposed decisions**.
- Use `the-fool` to stress-test an idea before we commit to it.

## 2. Decisions (ADRs)
- One file per decision: `docs/decisions/NNNN-short-title.md`, based on [`0000-template.md`](../decisions/0000-template.md).
- Status moves through `Proposed` → `Accepted` (Adam approves), and later possibly → `Superseded by NNNN`.

## 3. Planning (GitHub)
- **Milestones** are time-boxed releases, for example `M1 – Foundations`.
- **Epics** are issues labeled `type:epic`, each with a checklist of its feature issues.
- **Features, tasks, and bugs** are issues with acceptance criteria. `feature-forge` writes them in EARS / Given-When-Then format.
- **Labels:**
  - `track:core`, `track:arabic`, `track:morse`
  - `type:epic|feature|bug|research|content|design|chore`
  - `prio:p0|p1|p2`

## 4. Execution
- Branch per issue. A PR says `Closes #N`.
- **Definition of Done:**
  - Acceptance criteria are met.
  - Tests pass, with a new test where logic changed.
  - Docs are updated.
  - Adam has tried it if it's user-facing.

## 5. Retrospective
- At each milestone, `docs/process/retros/MN.md` records what worked, what didn't, and what we change.
- It also covers **learning results**: is the app actually teaching Adam?
