# 0005 — Tech stack

- **Status:** Proposed
- **Date:** 2026-11-01

## Context
Requirements:
- Phone and desktop equally; installable.
- Rich game-like visuals and animation.
- Low-latency audio (Morse tones) and keyboard/tap input.
- Single user first, with accounts, sharing, leaderboards, and live challenges later.
- Free or near-free to run.

## Decision (proposed)
| Layer | Choice | Why |
|---|---|---|
| App | **TypeScript + React + Vite, as a PWA** | One codebase for phone and desktop, installable, works offline |
| Lobby / game visuals | **SVG + CSS/Framer Motion** to start. Add **PixiJS** only if the lobby needs a real scene with walking characters. | Crisp at any size, animatable, and Claude can produce it as code |
| Audio | **Web Audio API** | Precise Morse timing |
| Backend | **Supabase** (Postgres, Auth, Realtime, Edge Functions), free tier | Auth and leaderboards for sharing, Realtime for head-to-head challenges, Edge Functions for the LLM adapter (ADR 0004) |
| Local-first | Progress cached in IndexedDB; syncs when logged in | Fast and works offline. Single-user mode needs no login. |
| SRS | **FSRS** (`ts-fsrs` library) | Modern open algorithm |
| Hosting / CI | Cloudflare Pages or Vercel + GitHub Actions | Free, with preview deploys per PR |
| Tests | Vitest + Playwright | |

## Consequences
- Supabase lock-in is moderate, since it's plain Postgres underneath.
- Up for debate: whether the lobby is "illustrated UI" (SVG) or "a little game world" (PixiJS). This depends on the art direction chosen in M0.
