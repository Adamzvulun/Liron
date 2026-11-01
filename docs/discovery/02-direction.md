# 02 — Direction: Adam's answers and what they change


> 📚 **Historical record.** The current truth is [`vision.md`](../vision.md) and the ADRs, including the simplification pass [0011](../decisions/0011-simplification-pass.md).

- **Status:** Open
- **Date:** 2026-11-01
- **Follows:** [01-brainstorm](01-brainstorm.md). Its cross-subject ideas are dropped per [ADR 0003](../decisions/0003-hub-of-independent-subjects.md).

## 1. The lobby (creative core)

The mood reference is a classic browser-RPG town screen: a cartoon place made of buildings you click, a character who levels up, and chunky, warm UI. Our version:

- **The town square is the hub.** Each subject is a building:
  - 📻 **Radio Tower** for Morse.
  - ☕ **The Café / Souk** for Arabic.
  - 🏗️ **Empty plots** marked "coming soon" for future subjects.
- **Your character** stands in the square. Avatar, level, title, and cosmetics are earned through learning: hats, a radio headset, a keffiyeh pattern, pets…
- **Inside each building** is that subject's own Duolingo-style path: a winding trail of lesson nodes, checkpoints, and boss challenges.
- **Notice board** for the daily goal and streak, plus quests like "Learn 5 new words" or "Copy 20 characters at 20 wpm".
- **The Arena** (later) is the social building: leaderboards, friend challenges, and live duels such as a Morse speed duel or an Arabic word race.

### Art direction options to choose from
| | Style | Feel | Production |
|---|---|---|---|
| **A** | Bold cartoon town: thick outlines, warm saturated colors, chunky buttons | Closest to the mood reference; energetic | SVG, very doable in code |
| **B** | Cozy isometric diorama: soft pastel 3D-ish tiles, little animated details | Cute, calm, "toy-like" | SVG/CSS isometric or PixiJS; medium effort |
| **C** | Pixel-art RPG village | Retro game, nostalgic | Needs consistent sprite art; pixel packs exist |
| **D** | Hand-painted storybook | Beautiful, gentle | Hardest to produce consistently without an artist |

**Art pipeline question:** who makes the art?
- Options: code-drawn SVG (Claude), AI-generated images (inconsistent across a set), asset packs, or a commissioned artist.
- **Recommendation:** code-drawn SVG with a tight style guide (palette, outline weight, shapes). It's consistent, animatable, and versionable. Commissioned key art (characters) can come later.

## 2. Arabic subject (see [ADR 0002](../decisions/0002-arabic-variety.md))

**Goal:** converse in spoken Levantine Arabic, and read and write it.

### Proposed curriculum spine
1. **Sounds & script.**
   - Arabic sounds mapped to Hebrew letters (most map directly; teach the few new ones: ث ذ ظ غ ض…).
   - The alphabet taught by shape families, plus connecting forms and short vowels.
2. **Survival phrases** (week 1+): greetings, numbers, "how much", "I don't understand". This gives early wins so you can talk to someone quickly.
3. **Core words by frequency.** Roughly the top 1,000–2,000 *spoken* words.
   - Each is learned in a short sentence, with audio, a Hebrew bridge badge, and the root shown.
4. **Just-in-time grammar.** Pronouns and possessive endings, verbs (past, present with b-, future with rah-), negation (ma/mish), questions, and the 10 most common verb patterns.
5. **Listening & speaking.**
   - Shadowing: listen, repeat, record yourself.
   - Short dialogues.
   - An **AI café partner** who uses only your known words plus a few new ones.
6. **Reading & writing.**
   - Typing and handwriting practice.
   - Fading the transliteration.
   - Reading real-world colloquial text (messages, signs).

### Lesson types
- **Core:** listen-and-pick, build-the-sentence, cloze (fill the gap), speak-it (mic, self-graded at first), and write-it (Arabic keyboard).
- **Speed drills:** fast recognition rounds.

### Open research (M0/M1)
- A spoken-Levantine frequency list. We'll probably have to build our own from corpora and textbooks.
- A transliteration standard.
- Audio: is any free TTS good at Palestinian Arabic? If not, we need a plan for native recordings.
- Recording speech in the browser and possible pronunciation feedback.

## 3. Morse subject

**Goal:** send and receive without thinking.

That means **instant character recognition**, then **whole-word / head copy**, then **conversational flow**, all at a real speed of 20+ wpm character speed.

### Proposed path
1. **Koch at ~20 wpm character speed with Farnsworth spacing.** Two characters to start, adding one at ≥90% accuracy. No dot/dash charts, sound only.
2. **Instant-recognition game.** Hear a character and press it on the keyboard before the timer runs out. Adaptive speed.
3. **Sending trainer.**
   - Desktop: **spacebar as a straight key**. Phone: a big tap pad.
   - Real-time decoding of what you sent, plus a timing analysis of your dit/dah ratio and gaps.
   - Optional "iambic" mode with two keys (e.g. `[` and `]`), still no hardware needed.
4. **Words & head copy.** The most common English words and Q-codes, heard as whole words without writing anything down.
5. **Callsign rush.** Speed goes up when you're right.
6. **AI radio QSO.**
   - A simulated operator you talk to in Morse over noisy, fading "radio".
   - A scripted QSO engine handles structure. The free LLM adds personality.
7. **(Social) Morse duel.** Two players send to each other live.

## 4. Social & sharing ("mostly me, then friends")
- **v1:** single player. Works without an account.
- **v2:** accounts and a friend code, a shared leaderboard (weekly XP), seeing friends' avatars in the square, and async challenges ("beat my callsign score").
- **v3:** live duels and study groups.
- **Architecture note:** design the data model with users from day one (ADR 0005), even before anyone logs in.

## 5. Pre-mortem ("it's a year from now and it failed. Why?")
1. **Art ambition stalled the learning.**
   - We polished the lobby for months and the lessons never got good.
   - *Mitigation:* lock the art direction early. Build the learning loop and the lobby in parallel, with the lesson screens functional first and beautified next.
2. **Levantine content was thin.** No good word list or audio, so lessons felt generic. *Mitigation:* treat content research as a first-class epic, with a small, high-quality first 300 words.
3. **The free AI was too limited or flaky.** *Mitigation:* use the adapter plus fallbacks (ADR 0004), and keep the AI as a bonus layer. Core lessons never depend on it.
4. **Scope creep into social before the habit worked.** *Mitigation:* social is v2. The success metric for M2 is that Adam used it 5 days a week for a month.
5. **15–20 minutes split across two subjects felt thin.** *Mitigation:* the daily goal is per day, not per subject. The notice board suggests which subject needs attention.

## 6. Updated roadmap (draft)
| Milestone | Goal | Key deliverables |
|---|---|---|
| **M0 – Shape** | Agree on what we're making | Vision ✅ · ADRs · **art direction chosen** · content research kickoff |
| **M1 – Foundations** | Platform skeleton | App + PWA · subject module contract · XP/streak/FSRS · lobby v0 (chosen style, static) · CI and deploy |
| **M2 – First playable** | Daily habit possible | Morse Koch trainer + instant-recognition game · Arabic sounds & script + survival phrases · lobby v1 with buildings and character |
| **M3 – Depth** | Real learning value | Arabic first 300 words with audio · sending trainer · words & head copy · quests |
| **M4 – Partners** | Talk to someone | AI café partner · AI radio QSO |
| **M5 – Together** | Share it | Accounts, friends, leaderboards, async challenges |
| **M6+** | Live & expand | Duels, more cosmetics, new subjects |

## 7. Open questions (round 2)
1. **Art direction:** A, B, C, or D? Or describe what you see in your head. Examples of games or sites whose look you love would help most.
2. **Character:** human avatar you customize, a cute creature/mascot, or both (you plus a pet companion)?
3. **Rewards economy:** cosmetics only, or also gameplay items like streak freezes and hints?
4. **Speaking practice:** is it OK to use the microphone (record and compare)?
5. **Morse language:** English words and callsigns, or Hebrew Morse too, later?
6. **Do you know any native speakers** who might record audio or review content? It's the cheapest high-quality option.
