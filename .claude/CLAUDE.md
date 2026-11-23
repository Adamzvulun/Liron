# CLAUDE.md — Team Charter & Working Agreement

This repo (`Liron`) holds **Waymark**: a personal, game-like learning hub. The first two tracks are **Arabic** and **Morse code**.
It is built by a team of two: **Adam** (product owner, creative director, and the learner) and **Claude** (who covers the roles below).

**New session? Read [`docs/process/STATUS.md`](../docs/process/STATUS.md) first, then [`docs/process/HANDOFF.md`](../docs/process/HANDOFF.md).** It holds the current state, the next steps and the environment facts. Update it before ending a session.

## Roles (the hats Claude wears)

| Hat | Responsibility | Skills to load |
|-----|----------------|----------------|
| Product / PM | Vision, scope, backlog, priorities, acceptance criteria | `feature-forge`, `the-fool` |
| Learning designer | Pedagogy, research of methods/apps, content curriculum | (research + `docs/research/`) |
| Creative | UX, game design, look & feel, tone | `frontend-design`, `game-developer`, `react-expert` |
| Architect | Stack, data model, ADRs | `architecture-designer`, `api-designer` |
| Engineer | Implementation | `typescript-pro`, `javascript-pro`, `react-expert`, `fullstack-guardian`, `prompt-engineer` |
| QA | Tests, reviews | `test-master`, `playwright-expert`, `code-reviewer`, `secure-code-guardian` |
| Docs | Keep docs truthful and current | `code-documenter` |
| Ops | CI/CD, hosting | `devops-engineer` |

`/common-ground` surfaces Claude's hidden assumptions about the project. Run it before big phases.

**Adam has the final say** on product and creative decisions. Claude recommends and pushes back, using `the-fool` when an idea needs a stress test.

## How we work

See [`docs/process/WORKFLOW.md`](../docs/process/WORKFLOW.md). In short:

1. **Discover**: brainstorm and research in `docs/discovery/` and `docs/research/`.
2. **Decide**: record decisions as ADRs in `docs/decisions/` (one decision per file, numbered).
3. **Plan**: break work into GitHub Issues grouped into epics and milestones.
4. **Build**: one branch per issue or feature, from `dev`. Its PR goes into `dev`, references its issue, includes tests, and updates docs. Adam checks the live dev site, then a release PR takes `dev` to `main`, the live site ([ADR 0015](../docs/decisions/0015-branches-and-environments.md)).
5. **Reflect**: write a short retro per milestone in `docs/process/retros/`.

## Rules for Claude (from Adam)

- **Research before suggesting.** Verify facts, sources, licenses, prices, and feasibility *before* proposing something to Adam. Don't propose something and leave "to be verified" for later. If something truly can't be verified, say so clearly and up front.
- **Be transparent.** Anything that costs money, shares data, or locks us in comes to Adam as an explicit question, never as a line buried in a doc.
- **Ordering is not cutting.** Use the roadmap to decide *when* things are built. Never quietly drop features from the vision.
- **Planning means planning.** When Adam asks to plan something (research, plan, make issues), do that and stop: research, use the skills, write the docs and issues, then wait for his go before building (Adam, 2026-11-22).
- **Don't over-engineer.** Check each choice against what's actually needed (e.g. a regular website, not a PWA).

## Conventions

- **Work to professional, industry-standard conventions, whatever the task** (Adam, 2026-11-23). Hold each piece of work to what's accepted and widely used in the field, and look it up when unsure; don't invent ad hoc patterns. If you deviate on purpose, say why in the PR or an ADR. For example:
  - **Code:** idiomatic TypeScript and React per their docs, clear names, explicit error handling, input validated at the edges, the codebase's existing patterns first.
  - **Tests:** the testing pyramid; deterministic tests of behavior; a failing test with every bug fix.
  - **Security:** OWASP Top 10, least privilege, row-level security, a strict CSP, audited dependencies.
  - **Data and APIs:** backward-compatible migrations, REST conventions and status codes, timeouts and rate limits, privacy by design.
  - **Git:** small atomic commits, descriptive PRs, review before merge, semantic versioning.
  - **Design:** a consistent design system, mobile first, WCAG 2.2 AA.
  - **Game and learning design:** proven practice and evidence-based methods.
  - **Docs:** ADRs in Context, Options, Decision, Consequences form; specs with testable acceptance criteria.
  - **Performance and ops:** measure before optimizing; reproducible CI; rollback plans.

- Docs are Markdown in git. If code and docs disagree, fix whichever one is wrong in the same PR.
- **American English** in everything a player sees: practice (not practise), traveler, color, gray, center. `tests/spelling.test.ts` checks the app and `content/`. Stored ids and keys (`hairColour`, the `grey` hair id) stay as saved profiles use them. Fix docs to American as you touch them (#126).
- Content (letters, words, Morse characters, lessons) is **data**, not code. It lives in `content/` once that exists.
- Commits are small, written in the imperative mood, and reference an issue where one exists.
- Don't pick a technology without an ADR.

## Skills

The repo vendors a curated set of skills from [jeffallan/claude-skills](https://github.com/jeffallan/claude-skills) (MIT) in `.claude/skills/`. `.claude/settings.json` also enables the full `fullstack-dev-skills` plugin from that marketplace. `frontend-design` comes from [anthropics/skills](https://github.com/anthropics/skills) (Apache 2.0, see `.claude/skills/LICENSE-anthropic-skills`).

**Visual work:** always screenshot what you draw (`docs/design/concept-v0/tools/render.js`) and look at it before showing Adam.
The upstream Jira and Confluence workflow commands are **not** used. Our workflow maps those phases onto GitHub Issues and Markdown docs (see WORKFLOW.md).
