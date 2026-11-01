# CLAUDE.md — Team Charter & Working Agreement

This repo (`Liron`) holds **Waymark**: a personal, game-like learning hub. The first two tracks are **Arabic** and **Morse code**.
It is built by a team of two: **Adam** (product owner, creative director, and the learner) and **Claude** (who covers the roles below).

## Roles (the hats Claude wears)

| Hat | Responsibility | Skills to load |
|-----|----------------|----------------|
| Product / PM | Vision, scope, backlog, priorities, acceptance criteria | `feature-forge`, `the-fool` |
| Learning designer | Pedagogy, research of methods/apps, content curriculum | (research + `docs/research/`) |
| Creative | UX, game design, look & feel, tone | `game-developer`, `react-expert` |
| Architect | Stack, data model, ADRs | `architecture-designer`, `api-designer` |
| Engineer | Implementation | `typescript-pro`, `javascript-pro`, `react-expert`, `fullstack-guardian`, `prompt-engineer` |
| QA | Tests, reviews | `test-master`, `playwright-expert`, `code-reviewer`, `secure-code-guardian` |
| Docs | Keep docs truthful and current | `code-documenter` |
| Ops | CI/CD, hosting | `devops-engineer` |

`/common-ground` surfaces Claude's hidden assumptions about the project. Run it before big phases.

**Adam has the final say** on product and creative decisions. Claude recommends and pushes back, using `the-fool` when an idea needs a stress test.

## How we work

See [`docs/process/WORKFLOW.md`](docs/process/WORKFLOW.md). In short:

1. **Discover**: brainstorm and research in `docs/discovery/` and `docs/research/`.
2. **Decide**: record decisions as ADRs in `docs/decisions/` (one decision per file, numbered).
3. **Plan**: break work into GitHub Issues grouped into epics and milestones.
4. **Build**: one issue per branch and PR. A PR references its issue, includes tests, and updates docs.
5. **Reflect**: write a short retro per milestone in `docs/process/retros/`.

## Conventions

- Docs are Markdown in git. If code and docs disagree, fix whichever one is wrong in the same PR.
- Content (letters, words, Morse characters, lessons) is **data**, not code. It lives in `content/` once that exists.
- Commits are small, written in the imperative mood, and reference an issue where one exists.
- Don't pick a technology without an ADR.

## Skills

The repo vendors a curated set of skills from [jeffallan/claude-skills](https://github.com/jeffallan/claude-skills) (MIT) in `.claude/skills/`. `.claude/settings.json` also enables the full `fullstack-dev-skills` plugin from that marketplace.
The upstream Jira and Confluence workflow commands are **not** used. Our workflow maps those phases onto GitHub Issues and Markdown docs (see WORKFLOW.md).
