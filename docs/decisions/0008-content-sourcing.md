# 0008 — Content sourcing: use the best material, keep the site private

- **Status:** Accepted
- **Date:** 2026-11-01
- **Supersedes:** the policy in `docs/research/arabic-sources.md` §5

## Context
The best spoken-Palestinian material (Lingualism decks, the Elihay deck/book, native audio) is copyrighted. Adam's position: the project is non-commercial and private among friends, so we use the best material.

## Decision
- We use the best existing sources (paid or free) as the content for lessons and audio.
- The site is **private and invite-only**:
  - No public sign-up.
  - Not indexed by search engines.
  - Content is served only to logged-in friends.
- Paid source files are kept out of the public git repo. They live in private storage and are loaded at build or run time.
- A `content/SOURCES.md` file records where each piece of content came from.

## Consequences
- Non-commercial use doesn't by itself make redistribution legal. Keeping the site private and small keeps that risk low, which Adam accepts.
- If the project ever becomes public, revisit this ADR and fall back to openly licensed sources (Maknuune, Curras, open TTS).
