# 01 — Brainstorm: what is this hub?

- **Status:** Open (living doc)
- **Owners:** Adam (PO) and Claude
- **Started:** 2026-11-01

---

## 1. The idea in one line (draft)

> **One personal place to learn symbol systems properly.** Each subject is a *track* built from the best proven methods. All tracks share one engine: memory scheduling, a daily session, progress tracking, and an AI partner who knows exactly what you know.

Arabic and Morse look unrelated, but they are the same kind of skill: **decode a system of symbols into meaning quickly, then produce it back.** Seeing that connection is what lets us build one hub instead of two apps glued together.

## 2. Design principles (draft, to challenge)

1. **Evidence over vibes.** Every mechanic comes from a known method (Koch, spaced repetition, frequency lists, comprehensible input…). Gamification is the skin, never the substance.
2. **Built for one person.** No accounts, no marketing pages. Opinionated, hackable, and the data is owned by Adam.
3. **Small daily loop, deep optional rabbit holes.** One "Today" button does 10–20 minutes of the right thing. Games and exploration are there for when you want more.
4. **Recognition first, then production, then real use.** Hear or read it, then send or say it, then use it with a "person".
5. **The AI partner is constrained by the learner model.** It talks *at your level*: mostly words and characters you know, plus a few new ones.
6. **Content is data.** Letters, words, roots, Morse characters, and QSO scripts live in versioned files we can edit and extend.
7. **Extensible.** Adding a third track later (another language, music notation, chess openings…) should mean adding content and a few track-specific drills.

## 3. Best ideas worth stealing

### 3a. Morse

| Source | Idea | Keep? |
|---|---|---|
| **Koch method** (LCWO, G4FON) | Learn at full character speed (~20 wpm) from day one. Start with 2 characters and add one each time copy accuracy reaches ≥90%. | ✅ Core progression |
| **Farnsworth timing** | Characters sent fast, with extra gaps between them, so you learn the *sound* rather than counting dits. | ✅ Combined with Koch |
| **"Sound, not sight"** (CW Academy, Morse Code Ninja) | Never show dot/dash charts early. Characters are rhythms ("dah-di-dah-dit"), not pictures. | ✅ UI rule |
| **Instant Character Recognition drills** | Hear one character, respond within a time limit, with adaptive speed. | ✅ Mini-game |
| **RufzXP** | Copy callsigns. Speed rises on a hit and falls on a miss. | ✅ Mini-game |
| **MorseRunner** | Contest pileup simulator with QRM, QSB, and many callers. | 🟡 Later, "advanced" mode |
| **Head copy & common words** | Recognize whole words and QSO phrases (CQ, RST, QTH, 73) without writing them down. | ✅ Phase 2 of the track |
| **Sending trainer** | Straight key or iambic paddle in the browser (keyboard, touch, or a USB/MIDI key). Shows a timing analysis of your "fist". | ✅ Production practice |
| **Your morsehub.com** | **An AI radio partner**: a realistic QSO with an operator who has a callsign, a location, a personality, band noise, and fading. | ⭐ Flagship feature |

### 3b. Arabic

| Source | Idea | Keep? |
|---|---|---|
| **Letter families by skeleton (rasm)** | ب ت ث ن ي share one shape and differ only by dots. Learn the shape once, then the dots. Also cover the 4 positional forms, harakat, and sun/moon letters. | ✅ Script module (~1–2 weeks) |
| **Duolingo** | Tiny sessions, streaks, a visible path, instant feedback. | ✅ The *format* |
| ~~Duolingo content~~ | Random low-value sentences, not frequency-driven, weak grammar explanations. | ❌ What we fix |
| **Frequency dictionaries** (Buckwalter & Parkinson, *A Frequency Dictionary of Arabic*, top 5,000) | Learn words in order of usefulness. Note: Arabic attaches clitics (و، ب، ـه), so we count *lemmas* and teach clitics early. | ✅ Spine of the vocab track |
| **Root & pattern system** (جذر / وزن) | ك-ت-ب gives كتاب، كاتب، مكتب، مكتبة، كتب. Learning ~10 common patterns multiplies vocabulary. Unique to Semitic languages. | ⭐ "Root explorer" + pattern drills |
| **Anki / FSRS** | Spaced repetition. FSRS is the modern open algorithm and beats the classic SM-2. | ✅ Shared engine |
| **Sentence mining / i+1** (Krashen, Refold) | Learn words *inside* sentences where only one thing is new. | ✅ Card format |
| **Clozemaster** | Fill-in-the-gap in real sentences. | ✅ Drill type |
| **Vocalized → unvocalized reading** | Start with full harakat, then fade them as you level up. | ✅ Reading progression |
| **Minimal useful grammar** | Pronouns, nominal sentences (no "is"), ال, idafa, past/present verbs, broken plurals. Taught just-in-time, when a sentence needs it. | ✅ |
| **AI conversation partner** | A tutor or "a person at a café" who uses your known vocabulary. | ⭐ Same engine as the radio partner |

### 3c. Cross-pollination (things neither kind of app does alone)

- **Koch for Arabic:** unlock new letters, words, or roots only when current accuracy is ≥90%. The same adaptive gate works in both tracks.
- **ICR for Arabic:** speed-recognition drills for high-frequency words, so reading becomes as instant as hearing a Morse character.
- **One AI partner engine, two personas:** a radio operator over CW, and an Arabic speaker over text or voice. Both read your learner model.
- **Bridge track (fun bonus):** **Arabic Morse code** exists. It's a late-game challenge that joins the two worlds.
- **Hebrew bridge (if relevant):** Hebrew and Arabic share many roots (שלום/سلام, כתב/كتب, בית/بيت). If you speak Hebrew, that's a huge head start we should exploit.

## 4. Shared engine (the "hub" part)

```
                 ┌──────────── Today (daily session composer) ────────────┐
                 │                                                        │
   Learner model (every item: letter, char, word, root, pattern, phrase)  │
        │    accuracy, speed, FSRS stability, last seen                   │
        ▼                                                                 ▼
   Scheduler (FSRS + Koch-style unlock gate)        AI partner (persona + learner-aware prompt)
        │                                                                 │
        ▼                                                                 ▼
   Drill types / mini-games  ◄──── Content packs (data) ────►  Audio engine (Web Audio tones, TTS / recordings)
        │
        ▼
   Progress map, stats, streaks
```

## 5. Feature idea pool (unsorted, not commitments)

**Core:** Today button · progress map per track · stats (wpm, words known, text coverage %) · streak and calendar · offline PWA on the phone · export/backup of your data.

**Morse:** Koch trainer · ICR game · callsign game · word/QSO-phrase head copy · sending trainer with fist analysis · AI QSO partner with noise and fading · "listen to the band" (real WebSDR audio, later) · Q-codes and prosigns module.

**Arabic:** script course by letter families · harakat & sun/moon letters · 2,000-word frequency path with sentences and audio · root explorer · pattern drills · just-in-time grammar cards · graded micro-stories using only known words (AI-generated, then reviewed) · AI conversation partner · handwriting practice (draw letters, later).

## 6. Draft roadmap (to discuss)

| Milestone | Goal |
|---|---|
| **M0 – Shape** (now) | Vision, principles, answers to open questions, stack ADR |
| **M1 – Foundations** | App skeleton, learner model + FSRS, "Today" shell, content format |
| **M2 – First playable** | Morse Koch trainer + Arabic script course. You can use it daily. |
| **M3 – Depth** | Arabic 2,000-word path v1 · Morse ICR and callsign games · sending trainer |
| **M4 – The partner** | AI radio QSO + Arabic conversation partner, both learner-aware |
| **M5+** | Roots explorer, grammar cards, graded stories, polish, and new tracks? |

## 7. Tech direction (proposal only, needs an ADR)

- **TypeScript + React + Vite, as an installable PWA.** It works on phone and desktop, and offline. Web Audio handles Morse tones.
- **Local-first storage** (IndexedDB), with optional sync later (e.g., Supabase) if you use multiple devices.
- **A small serverless function** to call the LLM, so the API key stays off the client. Provider TBD: Gemini (as in morsehub) or Claude.
- **Hosting:** Cloudflare Pages or Vercel. CI on GitHub Actions.

## 8. Open questions for Adam

1. **Which Arabic?** Modern Standard (Fusha: reading, news, writing), a spoken dialect (Levantine/Palestinian, Egyptian, Gulf…), or both (MSA for reading, dialect for talking)? *This is the biggest content decision.*
2. **Why Arabic, and what does "success" look like** in 6–12 months? Read news, chat with people, travel, religious texts…?
3. **Your other languages.** Do you speak Hebrew? (See the Hebrew bridge above.)
4. **Morse goal:** on-air QSOs (are you licensed?), a speed target (e.g., 25 wpm head copy), or the skill itself?
5. **Devices:** mostly phone, desktop, or both? Do you own a key or paddle you'd want to plug in?
6. **Daily time budget:** 10, 20, or 45 minutes?
7. **morsehub.com:** do you still have the code, the domain, or design assets? What did you love about it, and what annoyed you?
8. **Name and vibe:** is "Liron" the name of the hub? What aesthetic: clean/minimal, a ham-radio shack, a field notebook, a playful game…?
9. **Just you forever**, or maybe shareable with friends later? (This affects auth and architecture.)
10. **AI provider and budget:** stick with Gemini, try Claude, or keep it swappable? What's a comfortable monthly cost?
