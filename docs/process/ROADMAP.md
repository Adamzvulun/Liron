# Roadmap: Waymark

- **Status:** Draft v1 (2026-11-01). Each epic becomes a GitHub epic issue with feature issues once Adam approves.
- **Inputs:** [vision](../vision.md), ADRs 0002–0010, discovery 02–04.
- **Rhythm:** milestones are goal-based, not date-based. Retros go in `retros/`.

## M0 — Shape *(now)*
| # | Item | State |
|---|---|---|
| 0.1 | Vision locked, name chosen (Waymark) | ✅ |
| 0.2 | Core ADRs: Arabic variety, hub model, AI, stack, art, partners, sourcing, Morse speed, rating | ✅ |
| 0.3 | **Visual concept:** style guide v0 + one illustrated city screen + one guild hall interior | ⏭️ next |
| 0.4 | Arabic sources settled: Lingualism deck (bought), Maknuune; script and grammar taught in-house, based on the Madrasa course structure (ADR 0012) | ✅ |
| 0.5 | Spike: test Gemini on recorded Palestinian speech (for the mic) | ⏳ |
| 0.6 | Convert M1–M2 into GitHub issues and milestones | ⏳ |

## M1 — Foundations
**Goal:** the platform skeleton is deployed. You can open Waymark in the browser on your phone or desktop, log in, and see the city.

| Epic | Contents |
|---|---|
| **E1 Project setup** | Vite + React + TS (regular responsive website), lint/format, Vitest, Playwright, GitHub Actions CI, Vercel deploys (preview per PR) |
| **E2 Platform core** | Subject-module contract (ADR 0003); profile; XP/level; gold and gems; streak + daily goal; Supabase project, login (just Adam), progress stored in Supabase |
| **E3 Learning engine** | FSRS service (`ts-fsrs`); Glicko-2 rating service (learner + item); item and content data format |
| **E4 City v0** | Waymark city screen in the final art style; clickable Signal Tower, Caravanserai, Your House, Market, Notice Board; locked Arena; construction plots |
| **E5 Avatar v0** | Paper-doll SVG system; base customization; 3–4 starter gear slots |

## M2 — First playable
**Goal:** a real daily habit. 15–20 min/day for both subjects.

| Epic | Contents |
|---|---|
| **E6 Signal Tower: receive** | Web Audio Morse engine; Koch path at 20 wpm with auto Farnsworth (ADR 0009); instant-recognition game; "The Silent Beacon" ch. 1–2 |
| **E7 Signal Tower: send** | Spacebar/tap straight key; real-time decoder; fist timing analysis |
| **E8 Caravanserai: script** | Sounds via Hebrew bridge; letter families; positional forms; harakat; reading and writing drills; "The Long Road In" ch. 1. Taught in-house, ordered after the Madrasa script course (ADR 0012) |
| **E9 Caravanserai: survival** | First phrases with audio, imported from the chosen sources |
| **E10 Quests & rewards** | Quest board (daily contracts); main-questline tracking; reward chest; Market v1 |

## M3 — Depth
| Epic | Contents |
|---|---|
| **E11 Arabic core words** | First 300 → 1,000 words in sentences with audio, using FSRS and ratings; just-in-time grammar cards built in-house from the Madrasa beginners structure + deck sentences (ADR 0012) |
| **E12 Morse words & head copy** | Common words, Q-codes, prosigns; callsign rush (overspeed) |
| **E13 Ranks & trials** | Guild ranks (milestone + rating); boss trials; achievements and titles |
| **E14 Mic practice** | Shadowing and record-yourself (STT if the M0 spike succeeds) |

## M4 — The people
| Epic | Contents |
|---|---|
| **E15 AI adapter** | Vercel serverless function; Gemini + backup; caps; eval set (ADR 0004) |
| **E16 Radio QSO** | QSO state machine; operator personas; noise/QSB/QRM; speed matching; AGN on garbled input (ADR 0007) |
| **E17 Café conversations** | Persona bibles; memory; reputation; WhatsApp-style chat, then voice; the silent Coach debrief → FSRS |

## M5 — Fellowship
| Epic | Contents |
|---|---|
| **E18 Invites** | Invite friends (invite-only sign-up); profiles visible to friends |
| **E19 Social** | Friends; visiting halls; party feed; gifting; opt-in challenges; rating-matched pairing |
| **E20 Live Morse** | Friend-to-friend live QSO in the Signal Tower (Supabase Realtime) |

## M6+ — Beyond
World events, more partners and gear sets, more questline chapters, and new guild halls (new subjects).
