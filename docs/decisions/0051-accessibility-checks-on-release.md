# 0051 — Accessibility checks on every release

- **Status:** Accepted (Adam, 2026-11-19: "not automatically every CI, once we push a major release").
- **Date:** 2026-11-19
- **Changes:** what a release PR into `main` checks ([CI](../process/CI.md)); adds a test-only dependency.

## Decision

A release PR into `main` checks every screen against WCAG 2.1 A and AA with [axe-core](https://github.com/dequelabs/axe-core), through `@axe-core/playwright` 4.14.0 (pinned; it brings axe-core 4.14.1). The spec is `tests/e2e/accessibility.spec.ts`, on both the desktop and the phone. Any problem axe reports fails the run.

It runs where the phone's full set runs: on a release PR (`PHONE_ALL=1`) and on every local `npm run e2e`. A PR into `dev` skips it, so the everyday wait doesn't grow.

## Why

- Three hand audits in v1.1.0 found real problems each time: text below 4.5:1, panning paintings a keyboard couldn't reach, and buttons whose names didn't contain what they show. A check that runs by itself keeps them from coming back.
- Adam asked for it on releases only, not on every CI run.

## What it costs and locks in

- **Money:** nothing. It's a dev dependency and never reaches the site's bundle.
- **License:** axe-core and `@axe-core/playwright` are MPL-2.0. We use them unmodified, in tests only, so nothing of ours has to change license.
- **Data:** none. axe runs inside the test browser; nothing is sent anywhere.
- **Lock-in:** low. The spec is about 90 lines; removing it removes the check.

## What it can't do

axe finds what a machine can see, roughly a third to a half of WCAG problems. It can't tell whether a name makes sense, whether focus moves where a player expects, or whether a screen reader reads a door well. Those stay with the hand checks before a release.
