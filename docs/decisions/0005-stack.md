# 0005 — Tech stack

- **Status:** Accepted (2026-11-01)
- **Date:** 2026-11-01

> Amended by [0011](0011-technical-corrections.md): the AI endpoint is a Vercel function.

## Context
Requirements:
- Phone and desktop equally, as a **regular responsive website** (not installable, no offline mode).
- Rich game-like visuals and animation.
- Low-latency audio (Morse tones) and keyboard/tap input.
- Single user first, with accounts, sharing, leaderboards, and live challenges later.
- Free or near-free to run.

## Decision
| Layer | Choice | Why |
|---|---|---|
| App | **TypeScript + React + Vite, as a regular responsive website** | One codebase for phone and desktop in the browser. No PWA, no install, no offline (Adam, 2026-11-01). |
| Lobby / game visuals | **SVG + CSS** (Framer Motion only if CSS isn't enough; it isn't a dependency today). The lobby is an **illustrated screen with clickable buildings**, not a walkable world (Adam, 2026-11-01). | Crisp at any size, animatable, and Claude can produce it as code. Can grow into a scene engine later if ever wanted. |
| Audio | **Web Audio API** | Precise Morse timing |
| Backend | **Supabase** (Postgres, Auth, Realtime, Edge Functions), free tier | Auth and leaderboards for sharing, Realtime for head-to-head challenges, the LLM adapter runs as a Vercel serverless function (ADR 0011) |
| Progress storage | **Supabase from day one**; you log in (just Adam at first) | Phone and desktop share one progress record without any sync logic. Simpler than local-first. |
| SRS | **FSRS** (`ts-fsrs` library) | Modern open algorithm |
| Hosting / CI | **Vercel** + GitHub Actions | Free, with preview deploys per PR |
| Tests | Vitest + Playwright | |

## Amendment (2026-11-01)
PWA, installability, and offline mode are dropped: Waymark is a regular website. Progress therefore lives in Supabase from M1, and login is required (invite-only, ADR 0008).

## Amendment 2 (2026-11-02, issue #12): repo layout
- The app lives at the **repo root** (`package.json`, `src/`, `index.html`), not in an `app/` folder. There's only one app, and Vercel and CI work with no extra root-directory setting. `docs/`, `spikes/` and `sources/` sit next to it and are excluded from lint and formatting.
- `src/core/` is the platform, `src/subjects/<id>/` holds one module per subject (ADR 0003), and `content/` holds learning data.
- Versions: TypeScript 6.0 (typescript-eslint doesn't support 7 yet), Vite 8, React 19. Dependencies are pinned exactly, using releases at least two weeks old.
- Fonts are self-hosted via `@fontsource/*`, so no visitor request goes to Google Fonts.

## Consequences
- Supabase lock-in is moderate, since it's plain Postgres underneath.
- The lobby is a clickable illustrated screen. A walkable world is out of scope.
