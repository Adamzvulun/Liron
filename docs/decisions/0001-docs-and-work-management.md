# 0001 — Docs in git, work tracked in GitHub

- **Status:** Accepted
- **Date:** 2026-11-01

## Context
We want to work like a real team: creative, software, documentation, and work management.
The skill library's workflow commands assume Jira and Confluence, which we don't use.

## Options considered
1. Jira + Confluence (as upstream). Too heavy for a two-person team, and the docs would live away from the code.
2. Notion or Google Docs. Fine to edit, but disconnected from the code history.
3. **Markdown in the repo + GitHub Issues, Milestones, and a Project board.** Docs are versioned alongside the code, and Claude can read and update all of it.

## Decision
Option 3. The process is described in `docs/process/WORKFLOW.md`.

## Consequences
- Everything is reviewable in PRs.
- We need discipline to keep docs current. The Definition of Done includes "docs updated".
