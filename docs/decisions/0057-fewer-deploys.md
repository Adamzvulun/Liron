# 0057 — Fewer deploys: no previews for Claude's branches or release branches

- **Status:** Accepted (Claude, 2026-11-23, at Adam's ask: "try to reduce the amount of times we deploy so to not to hit the limit")
- **Date:** 2026-11-23
- **Amends:** [ADR 0015](0015-branches-and-environments.md) (every branch gets a preview)

## Context

Vercel's Hobby plan allows **100 deployments a day** (`api-deployments-free-per-day`, 100 per 86,400 seconds per owner; [limits](https://vercel.com/docs/limits), read 2026-11-23). On 2026-11-23 the v1.7.0 release was refused by that limit after a day of PRs and releases (HANDOFF 186). It was hit before on 2026-11-11 and 2026-11-22 (HANDOFF 18, 157).

Every push deployed something:
- a push to Claude's `claude/…` branch, a preview;
- a release branch, a preview;
- a merge into `dev`, the dev site;
- a merge into `main`, the live site.

Nobody opens the first two. Adam checks the dev site (`dev`) and the live site (`main`), and the browser tests in CI run against their own build, not Vercel's.

Vercel's project configuration has `git.deploymentEnabled`. It maps branch patterns ([minimatch](https://github.com/isaacs/minimatch)) to true or false. A branch set to false gets no deployment from its commits ([git configuration](https://vercel.com/docs/project-configuration/git-configuration), read 2026-11-23).

## Decision

1. In `vercel.json`: `"git": { "deploymentEnabled": { "claude/**": false, "release/**": false } }`. `dev`, `main` and any other branch deploy as before.
2. **Claude's working habits, to spend fewer of the rest:**
   - Fewer, larger PRs into `dev`, since each merge deploys the dev site once.
   - Docs that follow a merge (STATUS, HANDOFF, "released") ride in the next PR rather than their own.
   - A release's notes and version number go in the feature's last PR, so a release costs two deploys (the merge into `dev` and the release into `main`), not four.

## Consequences

- PRs from Claude's branches no longer get a Vercel preview link or the "Vercel Preview Comments" check. CI's own checks still run on every PR.
- A preview is still possible by hand from the Vercel dashboard if one is ever wanted.
- If a day's work still hits the limit, the next step is Adam's (Vercel Pro costs money).
