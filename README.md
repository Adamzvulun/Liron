# Waymark — a personal learning hub

*(repo: `Liron`)*

A personal learning hub, designed and owned by Adam. It combines the best ideas from existing apps and learning methods into one focused site.

**First tracks:** 🇸🇦 Arabic · 📻 Morse code

> Status: **M1 – Foundations** in progress. The app scaffold exists; the city, login and lessons come next. **Start here: [`docs/process/STATUS.md`](docs/process/STATUS.md).**

## Where things live

| Path | What |
|---|---|
| [`src/`](src/) | The app (Vite + React + TypeScript). `src/core/` is the platform, `src/subjects/<id>/` holds one subject each (ADR 0003, contract in ADR 0019; start a new one from `src/subjects/example/`) |
| [`docs/process/DEPLOY.md`](docs/process/DEPLOY.md) | Hosting on Vercel: live site (`main`), dev site (`dev`), environment variables |
| [`content/`](content/) | Learning content as data (letters, words, Morse characters, lessons) |
| [`docs/vision.md`](docs/vision.md) | North star: what we are building |
| [`docs/discovery/`](docs/discovery/) | Brainstorms and explorations. Start with [`01-brainstorm.md`](docs/discovery/01-brainstorm.md) |
| [`docs/research/`](docs/research/) | Research notes on methods, apps, and sources |
| [`docs/decisions/`](docs/decisions/) | Architecture & product decision records (ADRs) |
| [`docs/design/`](docs/design/) | Visual concepts and the city generator |
| [`spikes/`](spikes/) | Throwaway experiments that answer one question |
| [`docs/process/`](docs/process/) | Current status ([`STATUS.md`](docs/process/STATUS.md)), how we work ([`WORKFLOW.md`](docs/process/WORKFLOW.md)), the [`ROADMAP.md`](docs/process/ROADMAP.md), and retros |
| [`CLAUDE.md`](CLAUDE.md) | Team charter: roles, conventions, skills |
| [`sources/`](sources/) | Raw learning material (books, decks). Upload new files to `sources/_inbox/` |
| `.claude/` | Claude Code skills, commands, and settings |

## Run locally
Needs Node 22+.
```bash
npm install
```
```bash
npm run dev
```
Then open the address it prints (usually http://localhost:5173). For the login to work, first copy `.env.example` to `.env.local` and fill in the `waymark-dev` Supabase values ([SUPABASE](docs/process/SUPABASE.md)).

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check, then build the site into `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run lint` | ESLint, plus a Prettier formatting check |
| `npm run format` | Rewrite files with Prettier |
| `npm run typecheck` | TypeScript only |
| `npm test` | Unit tests (Vitest), files named `src/**/*.test.ts` |
| `npm run e2e` | Browser smoke tests (Playwright, `e2e/`) at desktop and phone sizes, against a production build |

`npm run e2e` needs a Chromium for Playwright. On your own machine, run `npx playwright install chromium` once. In the Claude cloud session it's already installed, so don't run that there.

Dependencies are pinned to exact versions (`.npmrc` has `save-exact=true`). `@playwright/test` is pinned to the same version as the Playwright pre-installed in the Claude cloud session (1.63.0), so its Chromium matches. Fonts are self-hosted from npm (`@fontsource/*`), so the site never calls Google Fonts.

## Credits
Skills in `.claude/skills/` come from [jeffallan/claude-skills](https://github.com/jeffallan/claude-skills) (MIT).
