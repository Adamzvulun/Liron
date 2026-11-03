# 0026 — Navigation: the browser's history API, no router library

- **Status:** Accepted (part of #25)
- **Date:** 2026-11-03
- **Builds on:** [0005](0005-stack.md) (stack), [0025](0025-city-painted-in-the-browser.md) (the city)

## Context
#25 needs each hall to have a shareable URL, and the browser's back button has to work. Waymark has a handful of fixed screens: the square, five places, and later the lessons inside them. It needs no nested layouts, data loaders or URL parameters yet.

## Options considered
1. **React Router or Wouter.** Both are well known and MIT-licensed. Either one adds a dependency, and an ADR and a version to keep, for a feature we use in about 40 lines.
2. **Our own: `pushState`, `popstate` and `useSyncExternalStore`.** Chosen.

## Decision
- **`src/core/router.ts`:**
  - `usePath()` re-renders when the path changes, whether from a click or from back and forward.
  - `navigate(to)` adds a history entry.
- **`src/core/Link.tsx`:** a real `<a href>`, so new-tab and copy-link work as normal. A plain click changes screen without reloading.
- **Addresses:** `/signal-tower`, `/caravanserai`, `/notice-board`, `/house` and `/market`, kept in `src/core/city/layout.ts`. Any other path shows a "Lost?" screen with a link home.
- **Deep links on Vercel:** `vercel.json` rewrites every path to `index.html`, as [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite) recommends. Static files are still served first. Vite's preview server, which the e2e tests use, does the same by default.
- **Focus:** a new screen moves focus to its title, so screen readers announce it.

## Consequences
- **If screens grow** nested routes, parameters or data loading (likely inside lessons, M2 and later), we revisit this and probably adopt React Router, in an ADR of its own.
- **Sign-in still comes first.** Someone who opens a deep link while signed out sees the login screen; after signing in, they land on that page.
