# 0011 — Simplification pass: do the simplest thing that works

- **Status:** Accepted
- **Date:** 2026-11-01
- **Trigger:** Adam caught an over-engineered choice (PWA → regular website) and asked for a full review for more of the same.

## Principle
Waymark is a private site for one person plus a few friends. Default to the simplest option. Add complexity only when real use shows it's needed, and record it in an ADR when it is.

## Changes
| # | Area | Before | After | Amends |
|---|---|---|---|---|
| 1 | **Paid content hosting** | "Private storage, loaded at build or run time." Undefined, and the **repo is public**. | Paid content is imported **once** by a script into Supabase tables and a private storage bucket, readable only by logged-in users. It's never committed and never bundled into the site's JS (bundled files are downloadable by anyone with the URL). | 0008 |
| 2 | **Deck import** | "Bring your own deck" as an in-app feature | A one-time **developer import script** (`scripts/`). No import UI. | 0008, research |
| 3 | **Word order** | Build a frequency list from the Curras corpus | **Follow the purchased decks' own level order** (A1 → B1). No frequency mining. | 0002, research |
| 4 | **Hebrew bridge** | Transliteration + cognate badges + grammar-parallel notes | **Only transliteration**, generated automatically by rule from the decks' vowelled Arabic. Cognates and grammar notes would mean writing content, so they're dropped. | 0002 |
| 5 | **Audio** | Self-host the Sofelia/Leva TTS models | **Deck audio** for lessons. Partners reply in **text first**; voice replies later via Gemini's built-in speech output or the browser. No model servers. | 0007, research |
| 6 | **Speech input** | Separate speech-to-text service + research spike | Send the recorded audio **straight to Gemini**, which understands audio. The spike becomes "test Gemini on Palestinian speech". | 0007 |
| 7 | **AI endpoint** | Supabase Edge Function | A **Vercel serverless function** in the same repo and deploy. One less runtime. | 0004, 0005 |
| 8 | **AI extras** | User-pasted API keys; per-user caps; backup provider | Drop user keys. A simple daily cap per user. The backup provider is wired in only if Gemini actually fails us. | 0004 |
| 9 | **Partner memory & reputation** | Memory system + reputation levels | A short **running summary** per partner (one DB field, updated after each chat). Reputation = number of conversations. | 0007 |
| 10 | **Partners message first** | Implied notifications | No push (it's a plain website). New messages wait in an **inbox** shown when you open the site. | 0007 |
| 11 | **Spaced repetition** | FSRS as a platform-wide service | **FSRS only inside Arabic.** Morse uses the Koch method, which doesn't need it. | 0003 |
| 12 | **Subject "module contract"** | A designed plugin contract | **A folder per subject** that calls a few shared functions (`awardXP`, `completeQuest`). No framework. | 0003 |
| 13 | **Rating** | Glicko-2; 7 sub-ratings; item ratings learned from answers; ranks need a rating too | **Plain Elo.** Morse gets 2 ratings (Receive, Send) and Arabic gets 1. Item difficulty comes from its curriculum position. **Ranks = milestones only**, with the rating shown beside them. Upgrade to Glicko or item ratings only if needed. | 0010 |
| 14 | **Economy (v1)** | Gold + gems, rotating market, 4 functional items, pets, decorations | **Gold only.** A fixed market. Two functional items: **streak freeze, hint**. Gems, pets, and decorations come later. | discovery 03 |
| 15 | **Avatar (v1)** | 7 gear slots + pet | **3 slots** (head, body, hand) + base customization | 0006 |
| 16 | **Quests (v1)** | 7 quest types | **Main questline, daily contracts, trials.** The rest come later. | discovery 04 |
| 17 | **City screens** | Separate Notice Board building | The Notice Board is a **panel on the city screen**, not its own screen | discovery 03 |
| 18 | **Morse sending** | Straight key + optional iambic mode | **Straight key only** (spacebar / tap) | discovery 02 |
| 19 | **Work management** | Epic issues + feature issues + milestones | **Milestones + issues with labels.** No separate epic issues; the milestone *is* the epic. | 0001, WORKFLOW |
| 20 | **Docs** | Vision spread over discovery 01–04 | **`vision.md` is the single source of truth**, with a v1 scope section. Discovery docs are history. | — |

## Consequences
- Less to build before Adam can learn daily.
- Every dropped item is listed above, so it can return when it earns its place.
