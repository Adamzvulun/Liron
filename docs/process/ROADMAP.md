# Roadmap: Waymark

- **Status:** Draft v1 (2026-11-01), simplified per ADR 0011. Each milestone becomes a GitHub milestone, and the epics below become groups of labeled issues.
- **Inputs:** [vision](../vision.md), ADRs 0002–0010, discovery 02–04.
- **Rhythm:** milestones are goal-based, not date-based. Retros go in `retros/`.

## M0 — Shape *(now)*
| # | Item | State |
|---|---|---|
| 0.1 | Vision locked, name chosen (Waymark) | ✅ |
| 0.2 | Core ADRs: Arabic variety, hub model, AI, stack, art, partners, sourcing, Morse speed, rating | ✅ |
| 0.3 | **Visual concept:** style guide v0 + one illustrated city screen + one guild hall interior | ⏭️ next |
| 0.4 | Pick the decks to buy (Lingualism Palestinian vocab + verbs; the free Elihay deck) and import them once by script | ⏳ |
| 0.5 | Spike: does Gemini understand recorded Palestinian speech well enough? | ⏳ |
| 0.6 | Convert M1–M2 into GitHub issues and milestones | ⏳ |

## M1 — Foundations
**Goal:** the platform skeleton is deployed. You can open Waymark in the browser on your phone or desktop, log in, and see the city.

| Epic | Contents |
|---|---|
| **E1 Project setup** | Vite + React + TS (regular responsive website), lint/format, Vitest, Playwright, GitHub Actions CI, Vercel deploys (preview per PR) |
| **E2 Platform core** | Shared functions (`awardXP`, `completeQuest`); profile; XP/level; gold; streak + daily goal; Supabase project, login (just Adam), progress stored in Supabase |
| **E3 Content & rating** | One-time deck import script → Supabase; plain Elo rating helper |
| **E4 City v0** | Waymark city screen in the final art style; clickable Signal Tower, Caravanserai, Your House, Market; Notice Board panel; locked Arena; construction plots |
| **E5 Avatar v0** | Paper-doll SVG; base customization; 3 gear slots (head, body, hand) |

## M2 — First playable
**Goal:** a real daily habit. 15–20 min/day for both subjects.

| Epic | Contents |
|---|---|
| **E6 Signal Tower: receive** | Web Audio Morse engine; Koch path at 20 wpm with auto Farnsworth (ADR 0009); instant-recognition game; "The Silent Beacon" ch. 1–2 |
| **E7 Signal Tower: send** | Spacebar/tap straight key; real-time decoder; simple timing feedback |
| **E8 Caravanserai: script** | Sounds via auto Hebrew transliteration; letter families; positional forms; harakat; reading and writing drills; "The Long Road In" ch. 1 |
| **E9 Caravanserai: survival** | First phrases with deck audio; FSRS reviews (`ts-fsrs`) |
| **E10 Quests & rewards** | Daily contracts; main-questline tracking; reward chest; fixed Market (gear, streak freeze, hint) |

## M3 — Depth
| Epic | Contents |
|---|---|
| **E11 Arabic core words** | First 300 → 1,000 words in deck order, with audio and FSRS; grammar notes as the decks provide them |
| **E12 Morse words & head copy** | Common words, Q-codes, prosigns; callsign rush (overspeed) |
| **E13 Ranks & trials** | Guild ranks (milestones); Elo ratings shown beside them; boss trials |
| **E14 Mic practice** | Shadowing and record-yourself, compared against deck audio |

## M4 — The people
| Epic | Contents |
|---|---|
| **E15 AI endpoint** | Vercel serverless function → Gemini; daily cap; small eval set |
| **E16 Radio QSO** | QSO state machine; operator personas; noise/QSB/QRM; speed matching; AGN on garbled input (ADR 0007) |
| **E17 Café conversations** | Personas; running-summary memory; inbox; text chat, then voice in (audio → Gemini); Coach debrief → FSRS |

## M5 — Fellowship
| Epic | Contents |
|---|---|
| **E18 Invites** | Invite friends (invite-only sign-up); profiles visible to friends |
| **E19 Social** | Friends; see each other's progress; party feed; opt-in challenges |
| **E20 Live Morse** | Friend-to-friend live QSO in the Signal Tower (Supabase Realtime) |

## M6+ — Beyond
World events, more partners and gear sets, more questline chapters, and new guild halls (new subjects).
