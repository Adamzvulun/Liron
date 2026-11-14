# Roadmap: Waymark

- **Status:** v1 (2026-11-01). M1–M2 are GitHub issues (#1–#49); M3+ stay here until M2 is nearly done. **Where we are (2026-11-04):** M0 and M1 are done; M2 is mostly built (E6–E9), with E10 next. Current state: [STATUS.md](STATUS.md).
- **Inputs:** [vision](../vision.md), ADRs 0002–0010, discovery 02–04.
- **Rhythm:** milestones are goal-based, not date-based. Retros go in `retros/`.

## M0 — Shape *(done)*
| # | Item | State |
|---|---|---|
| 0.1 | Vision locked, name chosen (Waymark) | ✅ |
| 0.2 | Core ADRs: Arabic variety, hub model, AI, stack, art, partners, sourcing, Morse speed, rating | ✅ |
| 0.3 | **Visual concept:** style guide v0 + city screen + Signal Tower interior ([docs/design/concept-v0](../design/concept-v0/README.md)) | ✅ city approved "for now" (v3). Later: Signal Tower interior repaint, phone layout |
| 0.4 | Arabic sources settled: Lingualism deck (bought), Maknuune; script and grammar taught in-house, based on the Madrasa course structure (ADR 0012) | ✅ |
| 0.5 | Spike: test Gemini on recorded Palestinian speech (for the mic), issue #1 | ✅ done: no pronunciation scoring on free models ([ADR 0013](../decisions/0013-speech-on-free-gemini.md)); Groq Whisper hears the mic ([ADR 0014](../decisions/0014-groq-whisper-for-speech.md)) |
| 0.6 | Convert M1–M2 into GitHub issues: epics #2–#11 with sub-issues #12–#49; milestones as `milestone:Mn` labels (see [STATUS](STATUS.md)) | ✅ |

## M1 — Foundations *(done 2026-11-03, [retro](retros/M1.md))*
**Goal:** the platform skeleton is deployed. You can open Waymark in the browser on your phone or desktop, log in, and see the city.

| Epic | Contents |
|---|---|
| **E1 Project setup** | Vite + React + TS (regular responsive website), lint/format, Vitest, Playwright, GitHub Actions CI, Vercel deploys (preview per PR) |
| **E2 Platform core** | Subject-module contract (ADR 0003); profile; XP/level; gold and gems; streak + daily goal; Supabase project, login (just Adam), progress stored in Supabase |
| **E3 Learning engine** | FSRS service (`ts-fsrs`); Glicko-2 rating service (learner + item); item and content data format |
| **E4 City v0** | Waymark city screen in the final art style; clickable Signal Tower, Caravanserai, Your House, Market, Notice Board; locked Arena; construction plots |
| **E5 Avatar v0** | Paper-doll SVG system; base customization; 3–4 starter gear slots |

## M2 — First playable *(in progress)*
**Built in sprints, one theme at a time, never mixed (Adam, 2026-11-03): first the Morse sprint (E6, E7), then the Arabic sprint (E8, E9), then quests and rewards (E10).**

**Goal:** a real daily habit. 15–20 min/day for both subjects.

| Epic | Contents |
|---|---|
| **E6 Signal Tower: receive** | Web Audio Morse engine; Koch path at 20 wpm with auto Farnsworth (ADR 0009); instant-recognition game; "The Silent Beacon" ch. 1–2 |
| **E7 Signal Tower: send** | Spacebar/tap straight key; real-time decoder; fist timing analysis |
| **E8 Caravanserai: script** | Sounds via Hebrew bridge; letter families; positional forms; harakat; reading and writing drills; "The Long Road In" ch. 1. Taught in-house, ordered after the Madrasa script course (ADR 0012) |
| **E9 Caravanserai: survival** | First phrases with audio, imported from the chosen sources |
| *Before E10* | The "did it understand you?" check: "Say it" sends a recording to Groq Whisper through a server-side Vercel function (Adam approved it, PR #87). It's the first slice of E14 and E15, brought forward; the rest of them stays in M3–M4. |
| **E10 Quests & rewards** | Quest board (daily contracts); main-questline tracking; reward chest; Market v1 |

## M3 — Depth
| Epic | Contents |
|---|---|
| **E11 Arabic core words** | First 300 → 1,000 words in sentences with audio, using FSRS and ratings; just-in-time grammar cards built in-house from the Madrasa beginners structure + deck sentences (ADR 0012) |
| **E12 Morse words & head copy** | Common words, Q-codes, prosigns; callsign rush (overspeed) |
| **E13 Ranks & trials** | Guild ranks (milestone + rating); boss trials; achievements and titles |
| **E14 Mic practice** | Shadowing, record-and-compare, minimal-pair ear training; optional "did it understand you?" sentence check via Groq Whisper (ADR 0013, 0014) |

## M4 — The people
| Epic | Contents |
|---|---|
| **E15 AI adapter** | Vercel serverless function; Gemini + backup; Groq Whisper for speech; caps; eval set (ADR 0004, 0014). **First slice built** (2026-11-10, ADR 0036): `api/partner.ts` on `gemini-3.5-flash-lite` with Groq as the backup, 40 replies a day, writing the Radio Room operators' news. **Second slice** (ADR 0037): you key your own news in a free turn and the operator answers it live, and remembers it. **Eval set:** `scripts/partner-eval.ts` (by hand, with the keys). |
| **E16 Radio QSO** | QSO state machine; operator personas; noise/QSB/QRM; speed matching; AGN on garbled input (ADR 0007). **Built without AI first** (#223, 2026-11-10; [design](../game/radio-qso.md)); E15 adds the live parts: the operators' news (ADR 0036) and their answer to yours (ADR 0037). |
| **E17 Café conversations** | Persona bibles; memory; reputation; WhatsApp-style chat, then voice; the silent Coach debrief → FSRS. **Proposal and spike written** (2026-11-11, [design](../game/cafe-conversations.md)). **First slice built** (2026-11-14, [ADR 0038](../decisions/0038-talking-with-the-regulars.md)): "Sit and talk" with the regulars in Palestinian Arabic on Groq's `gpt-oss-120b`, 60 lines a day, memory of what you told them. Then the eval set (`scripts/inn-eval.ts`) and typing in Hebrew letters. Then a daily contract and the Known at the Inn achievement. Then the Coach's tips after a chat. Next: the Coach's tips into spaced repetition, and voice. |

## Art for every screen *(proposed 2026-11-11; Adam said go on A1)*
Only three screens are painted so far: the city square, the Signal Tower room and the Caravanserai courtyard (ADR 0025, painted in the browser). Every other screen is cards on the navy gradient: Your House, the Market, the Notice Board, and every lesson and station inside the halls (the Koch lessons, the Radio Room, the word path, the coffee corner, the script lessons).

| # | Item | Proposed order |
|---|---|---|
| A1 | **Hall backdrops for every station:** each station screen sits on its hall's own painting, dimmed and blurred, with the cards on top. One change per hall, so every lesson screen gets a background at once | ✅ built 2026-11-11 (`HallBackdrop`) |
| A2 | **Your House:** a painted room around the wardrobe (bed, chest, window to the square) | ✅ built 2026-11-11 (`paintHouse`) |
| A3 | **The Market:** a painted stall with an awning, the wares on its counter | ✅ built 2026-11-11 (`paintMarket`: a bazaar lane behind the stall) |
| A4 | **The Notice Board:** a painted wooden board on a wall, the quests pinned to it (the E10 concept) | ✅ built 2026-11-11 (`paintNoticeWall`, notes on planks in `player.css`) |
| A5 | **The Radio Room:** its own painted room off the tower (radio set, map of the bands) | ✅ built 2026-11-11 (`paintRadioRoom`, also behind the Far Station) |
| A6 | **Station scenes:** a painted close-up for the stations used most (the innkeeper's table, the listening desk) | ✅ built 2026-11-11 (`paintInnTable`, `paintListeningDesk`) |
| A7 | **The Arena** | with M5 (it opens then) |

## M5 — Fellowship
| Epic | Contents |
|---|---|
| **E18 Invites** | Invite friends (invite-only sign-up); profiles visible to friends |
| **E19 Social** | Friends; visiting halls; party feed; gifting; opt-in challenges; rating-matched pairing |
| **E20 Live Morse** | Friend-to-friend live QSO in the Signal Tower (Supabase Realtime) |

## M6+ — Beyond
World events, more partners and gear sets, more questline chapters, and new guild halls (new subjects).
