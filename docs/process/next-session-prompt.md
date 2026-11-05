# Prompt for the next Claude session (written 2026-11-05)

Paste this as the first message of a new session:

---

We're continuing work on Waymark, my personal learning hub for Arabic and Morse (repo: Liron). Branch from `dev` (ADR 0015); each fix gets its own branch and PR into `dev`. Merge your own PRs into `dev` once CI is green and the work checks out; only I merge into `main`. Don't release v1.0.0 until I say so.

Before you do anything, read `CLAUDE.md`, then `docs/process/STATUS.md`, then `docs/process/HANDOFF.md`, and follow them.

I tried the latest dev site and found three problems. They're measured and filed. Read `docs/research/dev-site-problems-2026-11-05.md` and the issues first. Work through them in this order:

1. **#123: the city square is slow and laggy.** It's the painted SVG with turbulence/blur filters and animations inside it.
   - Research the fix before building and propose it to me. A one-time bitmap for the static scene, small animated layers, and a glow image instead of the hover drop-shadow are the leads; this needs an ADR 0025 amendment.
   - Add a frame-time budget test so it can't regress.
   - Measure before and after, the same way the research note did.
2. **#125: some Arabic words show wrong meanings.**
   - Build a reviewed lesson-word list in `content/arabic/` with our own glosses where the deck's need context.
   - Strip the grammar tags from the romanisation.
   - Handle homographs by their vowel marks.
   - Keep verbs and unsuitable words out of the early lessons.
   - Show me the lesson 1–3 list so I can review it.
3. **#126: American spelling in everything players see** ("Practice", not "Practise"; "Traveler"; "color"; "gray"). Add the rule to CLAUDE.md.
4. **#124: faster loading.**
   - Code-split the halls.
   - Sign a session's audio in one request.
   - Cache the deck in the browser.

After that: the Groq "understood" check (approved), then E10 (approved; ADRs from 0032).

Keep `docs/process/STATUS.md`, `HANDOFF.md` and a report for me (`docs/process/reports/`) current as you go. Screenshot any visual change and look at it before showing me. Ask me anything that costs money, shares data or locks us in.
