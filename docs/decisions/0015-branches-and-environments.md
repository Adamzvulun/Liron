# 0015 — Branches and environments: feature → dev → main

- **Status:** Accepted (Adam, 2026-11-02)
- **Date:** 2026-11-02

## Context
Adam wants to work like a real dev team. New work happens on its own branch and is merged into `dev`, where it's tested on a live dev site. When he's happy with the dev site, it's published to `main`, the live site users see. Users keep the stable version while we work on `dev`.

Until now everything went into one branch (`claude/learning-hub-arabic-morse-20ckww`), with no live site.

Checked in Vercel's docs (2026-11-02), for the free Hobby plan:
- The **production branch** can be set per project (Project Settings → Environments → Production → Branch Tracking). The default is `main`.
- Every push to another branch gets a **preview deployment**. Each branch also gets a **stable URL** that always shows its latest deploy: `<project>-git-<branch>-<scope>.vercel.app`.
- **Custom environments** (a named "staging") are Pro only. The documented Hobby alternative is a **preview branch used as staging**, with branch-specific environment variables.
- Personal-account private repos can deploy on Hobby. Only private repos owned by a GitHub *organization* can't.

## Decision
**Branches**
| Branch | Role | Deploys to |
|---|---|---|
| `main` | What users see. Only changes through a release PR from `dev`. | Vercel **Production** (the public site) |
| `dev` | Integration and testing. Every feature lands here first. GitHub's **default branch**. | Vercel **Preview**, at the stable `…-git-dev-…` URL: the "live dev site" |
| feature branches | One per issue, version or feature, created from `dev`. Claude's session branches (`claude/…`) count as feature branches. | Their own preview URL; none for `claude/…` since [ADR 0057](0057-fewer-deploys.md) |

**Flow**
1. Branch from `dev`, then open a PR into `dev` (`Closes #N`). CI must be green, and Adam merges. Squash merges are fine here.
2. Adam checks the live dev site.
3. **Release:** a PR from `dev` into `main`, titled `Release vX.Y.Z` with a short changelog. CI must be green, and Adam merges with a **merge commit** (never squash, or `dev` and `main` drift apart). Then tag `main` with `vX.Y.Z`.
4. **Hotfix** (only if the live site is broken): branch from `main`, PR into `main`, then merge `main` back into `dev`.

**Versions:** `v0.x.y` until the first real release to other users. Bump *minor* for a release with new features and *patch* for fixes only.

**Rules (process, not enforced):** GitHub Free can't protect branches in a private repo (see [CI](../process/CI.md)), so these are working rules:
- Never merge a red PR.
- Only Adam merges into `main`.
- Nobody pushes directly to `dev` or `main`.

**Environments and secrets**
- **Vercel:** Production = `main`, Preview = everything else. Secrets such as the Gemini and Groq keys are set separately for Production and Preview. They're server-side only and never in the browser bundle (ADR 0011).
- **Supabase:** **two free projects** (Adam, 2026-11-02): `waymark-prod` for production (`main`) and `waymark-dev` for `dev` and previews, so testing never touches real progress. That uses both free projects. The dev one may pause after 7 days of no use (data kept; restored by hand).
- **Who sees the dev site:** Vercel Authentication can restrict previews to people logged into the Vercel account (available on all plans). Turned on in #15 ([DEPLOY](../process/DEPLOY.md)).

## Consequences
- Users only ever see what Adam has checked on dev.
- More steps per change: a feature PR, then a release PR. That's fine at our pace. Several features can ship in one release.
- **Adam does once in GitHub:** Settings → General → Default branch → `dev`. Until then, `Closes #N` in PRs to `dev` doesn't auto-close issues; GitHub only does that on the default branch.
- The old branch `claude/learning-hub-arabic-morse-20ckww` is replaced by `dev` and `main` (same content on 2026-11-02). Delete it after the default branch is switched, with Adam's OK.
- CI runs on every PR and on pushes to `main`. *(Amended 2026-11-10: pushes to `dev` no longer run CI, since every PR ran the full check before merging. A PR that changes only `docs/` or Markdown files skips the build and Playwright. Actions minutes cost money now, and Adam asked to use as few as possible. Amended 2026-11-18: pushes to `main` no longer run it either, since the release PR ran the same code; see [CI.md](../process/CI.md).)*
- **Never import into Vercel while `main` has no app:** Vercel would then serve the raw repo files, `sources/` included. `vercel.json` pins the Vite build so only `dist/` is published ([DEPLOY](../process/DEPLOY.md)).
