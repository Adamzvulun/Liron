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
- Copyrighted source files (paid or free) are kept out of the public git repo. See the amendment below.
- A `content/SOURCES.md` file records where each piece of content came from.

## Amendment (2026-11-01): start free, buy later only if needed
Adam chose option **(c)**:
- **Start with free sources:**
  - The Elihay *Speaking Arabic* community deck (phrases + audio).
  - The Maknuune lexicon (Arabic spelling, roots, glosses).
  - The Madrasa course as an ordering reference.
- **Buy a deck** (e.g. Lingualism) only if the free content feels thin in real use. That would be its own explicit decision, with the price shown first.
- **Storage:** the Elihay deck is copyrighted even though it's free, and the repo is public. Copyrighted content is therefore imported by a script into Supabase (database + private storage bucket). It's readable only by logged-in users, and never committed or bundled into the site's files.

## Consequences
- Non-commercial use doesn't by itself make redistribution legal. Keeping the site private and small keeps that risk low, which Adam accepts.
- If the project ever becomes public, revisit this ADR and fall back to openly licensed sources (Maknuune, Curras, open TTS).
