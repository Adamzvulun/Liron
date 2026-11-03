# 0027 — Release versions: each release to `main` is a new major version

- **Status:** Accepted
- **Date:** 2026-11-03

## Context
Adam (2026-11-03) set two rules:
- A release to `main` happens only when the game has a real base, meaning something to learn. Decor and styling alone are not a release.
- **Each release to `main` changes X in X.Y.Z.** The first release, the first playable version, gets its own number.

`main` has carried the scaffold as `v0.1.0` since 2026-11-02, but that tag was never created. We needed to settle what X, Y and Z mean.

## Research (2026-11-03, from web search results)
- **[Semantic Versioning](https://semver.org/):**
  - 0.y.z is initial development, where anything may change.
  - 1.0.0 is the first version people can depend on.
  - After 1.0.0, MAJOR changes for incompatible changes, MINOR for new compatible features and PATCH for bug fixes.
  - These rules are about a *public API* that other code depends on. Waymark has no public API, so "incompatible change" has nothing to attach to.
- **Browsers (Chrome, then Firefox from 2011):** a new major version with every release on a fixed cadence. The number is a release counter. Critics call it inflation, but users only ever see "the newest one".
- **Games:** the common habit is 0.x for pre-alpha, alpha and beta, and 1.0 at launch. Many early-access games call their first public build 1.0 even though it's unfinished. Some studios just count releases (R1, R2…).
- **Apps on the stores:**
  - There's a user-facing marketing version and a separate build number that must rise with every upload.
  - Teams bump the marketing version for meaningful releases.
  - There's no formal rule.
- **[Calendar versioning](https://calver.org/)** (e.g. Ubuntu's YY.MM) suits projects released on a calendar schedule. Waymark releases by milestone, not on a calendar.

## Options considered
1. **SemVer as written:** stay on 0.y.z until "1.0 = finished", and bump Y for each release. This is the standard for libraries, but our releases would all look minor, and "finished" is undefined for a learning hub that keeps growing.
2. **CalVer:** dates say when, not what. We release by milestone, not by month.
3. **Release counter in X (Adam's rule; browser-style):** each release to `main` is X+1. Y and Z cover smaller changes between releases. One number tells you which playable release you're on.

## Decision
Option 3.
- **X (major): a release from `dev` to `main`**, made when there's something new to learn or play.
  - Adam decides when.
  - Each release is a milestone or a meaningful slice of one.
  - **v1.0.0 is the first playable release**: the first time the live site has something to learn (M2).
- **Y (minor): a small addition shipped to `main` between releases**, without a new playable chunk. This should be rare: new work normally waits in `dev` for the next X.
- **Z (patch): a fix to the live site**, a hotfix. It goes into `main` and is merged back into `dev`.
- **0.y.z means before anything is playable.**
  - The current `main` (the scaffold, never tagged) is `v0.1.0`. M1 adds no release.
  - Adam may create `v0.1.0` for the record, or skip it.
  - The next tag is `v1.0.0`.
- **How a release happens:**
  1. A release PR goes from `dev` to `main`. It sets `"version"` in `package.json` and lists what the player can now do.
  2. Adam merges it.
  3. Adam creates the tag `vX.Y.Z` and its GitHub Release. Claude's session can't push tags.
  4. Claude writes the release notes for him.

## Consequences
- Version numbers say which playable release you're on. They make no compatibility promise; no other software depends on Waymark.
- The numbers will climb (v4, v5…). That's fine: it's a release counter, like a browser's.
- `package.json` stays `0.0.0` on `dev` until the first release PR sets `1.0.0`. Showing the version in the app (e.g. in settings) is optional and small; add it with the first release if Adam wants it.
- Revisit this if Waymark ever offers an API to other software. SemVer's rules would apply to that API.
