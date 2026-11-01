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
- Raw source files live in `sources/` in **this repo, which is private**. The repo must stay private.
- A `content/SOURCES.md` file records where each piece of content came from.

## Amendment (2026-11-01): start free, buy later only if needed
Adam chose option **(c)**:
- **Start with free sources:**
  - The Elihay *Speaking Arabic* community deck (phrases + audio).
  - The Maknuune lexicon (Arabic spelling, roots, glosses).
  - The Madrasa course as an ordering reference.
- **Buy a deck** (e.g. Lingualism) only if the free content feels thin in real use. That would be its own explicit decision, with the price shown first.
- **Storage:** the Elihay deck is copyrighted even though it's free, and the repo is public. Copyrighted content is therefore imported by a script into Supabase (database + private storage bucket). It's readable only by logged-in users, and never committed or bundled into the site's files.

## Amendment 2 (2026-11-01): fact-check changes the starting point
- The "Elihay" deck turned out to be a third-party deck, standardized to **Jordanian**, with mostly English computer-voice audio and reported errors. **It is no longer the main source.**
- Adam's rule: **if the best source costs under $20, he'll buy it.** The best verified candidate is the Lingualism *Palestinian Colloquial Arabic Vocabulary* Anki deck at **$17.99**: Arabic script, 4,800+ items, native audio. Caveats: Gaza dialect, and one reported translation error. **✅ Bought by Adam (2026-11-01) for $25.** The $17.99 found by search was outdated or excluded something, so prices from search results must be treated as estimates.
- Maknuune (CC BY-SA 4.0) stays as the reference dictionary.

## Amendment 3 (2026-11-01)
**No more purchases** (Adam). The content principle is clarified in [ADR 0012](0012-content-principle.md).

## Correction (2026-11-01): the repo is private
Earlier amendments said "the repo is public". **That was wrong.** Claude concluded it from an API check that went through this environment's GitHub-authenticated proxy, so it succeeded even though the repo is private. Claude didn't verify further.
- Raw sources are stored in `sources/` in this private repo (see `sources/README.md`).
- **Still true:** the deployed website is reachable by anyone with its URL. So content reaches users through Supabase, behind login, and is never bundled into the site's public files.

## Consequences
- Non-commercial use doesn't by itself make redistribution legal. Keeping the site private and small keeps that risk low, which Adam accepts.
- If the project ever becomes public, revisit this ADR and fall back to openly licensed sources (Maknuune, Curras, open TTS).
