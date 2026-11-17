# 0040 — Versions on a map: X is a chapter, Y is a planned release

- **Status:** Accepted (Adam's request, 2026-11-16; the details are Claude's proposal for him to correct)
- **Date:** 2026-11-16
- **Amends:** [ADR 0027](0027-release-versioning.md) (what X and Y mean) and [ADR 0015](0015-branches-and-environments.md) (a release branch)

## Context

ADR 0027 made every release to `main` a new X, and said a Y "should be rare". That suited a time when the next release was the only one in sight.

Adam (2026-11-16): "divide all the work… into versions, meaning 1.0 is the release, then 1.1 is something, 1.2 is another couple of features, 1.3, then go on until… 2.0, 3.0, 4.0, so we can know which version to release, what it should contain, when it is considered done."

So releases are now planned ahead, several to a chapter, and Y is no longer rare.

A second thing changes with it. Under ADR 0015 a release PR goes from `dev` straight into `main`. With releases planned back to back, the builder keeps working in `dev` while Adam walks a checklist, and a PR from `dev` would pick up that later work.

## Decision

1. **X (major) is a new chapter of Waymark**: something new in kind, not merely more. 1.0 is the solo game, 2.0 is friends, 3.0 is the endings, 4.0 is a third guild.
2. **Y (minor) is a planned release inside a chapter**: a couple of features that are useful on their own.
3. **Z (patch) is a fix to the live site**, as before: into `main` through a small PR, then merged back into `dev`.
4. **The map lives in [`docs/process/VERSIONS.md`](../process/VERSIONS.md)**: each version's name, contents, finish line and what it waits on Adam for. PLAN.md keeps the tasks; VERSIONS.md decides the order they ship in.
5. **A release is cut as a branch.** When a version's tasks are all in `dev`, a branch `release/vX.Y.0` is made from that commit and the release PR goes from it into `main`. Fixes Adam asks for go into `dev` first and are then brought to the release branch. After the merge the branch can be deleted.
6. **Adam still decides when**, merges every release, and creates the tag. A planned version is a plan, not a promise: he can ask for a release earlier with less in it, or hold one back.
7. **Parked work gets a number only when it is un-parked**: the next free Y of the current chapter.

## Consequences

- One number now tells you both the chapter and how far into it the live site is.
- More releases means more small asks of Adam. An X.Y asks for about ten minutes; an X.0 for the full checklist.
- Each release PR is small enough to read, and its DB migrate run carries fewer migrations at once, which makes a bad one easier to find.
- The builder's session may not be able to create the release branch itself (it pushes to its own work branch). If it can't make the branch through GitHub, it asks Adam to create it from the named commit; this is one click on GitHub's branch page.
- ADR 0027's other points stand: v1.0.0 is the first playable release, the version is set in `package.json` by the release PR, Claude writes the notes, and the numbers make no compatibility promise.
