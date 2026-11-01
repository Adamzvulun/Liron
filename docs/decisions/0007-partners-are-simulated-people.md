# 0007 — AI partners simulate real people, not tutors

- **Status:** Accepted
- **Date:** 2026-11-01
- **Amends:** [0004](0004-free-llm-provider-agnostic.md). The adapter and free-model policy stand; this ADR defines *behaviour*.


> **Amended by [0011](0011-simplification-pass.md)** (simplification pass). Where they conflict, 0011 wins.

## Context
Adam: the AI the user practices with **simulates a real person on the other end**. It's not a teacher or a chatbot.

## Decision
Every partner is a **character**, and the experience is built around keeping the illusion intact.

**1. Stays in character, always.** It never says "great job", never explains grammar, never admits to being an AI.
- It reacts like a person: it gets confused when you're unclear, asks you to repeat, changes topic, jokes, and has moods.

**2. Has a life.** Each partner has:
- A name, age, town, job, family, and opinions.
- **Memory of past conversations** ("how was your exam you told me about?").
- Things going on that week.

**3. Adapts the way a real person would, invisibly.**
- **Arabic:** speaks more slowly and simply with a foreigner, rephrases, and occasionally slips into a Hebrew word, as many Arabic speakers in Israel really do.
- **Morse:** sends QRS (slower) if you ask or struggle.
- Difficulty is steered by the learner model *in the hidden prompt*, never in visible teaching.

**4. Realistic channel.**
- **Morse:** the operator only "hears" what you actually keyed. Your timing is decoded, so sloppy sending produces garbled text, and they reply "AGN?" or "PSE RPT". They answer in audio, with band noise, fading (QSB), interference (QRM), and their own "fist" (timing quirks). The QSO follows real conventions: CQ, callsigns, RST, name, QTH, rig, WX, 73.
- **Arabic:** text chat (WhatsApp-style) and voice (mic → speech-to-text → partner → TTS).

**5. Learning happens outside the conversation.** A separate, silent **Coach** layer reviews the transcript *after* the chat.
- The debrief covers what you said wrong, better ways to say it, and new words heard.
- Those items flow into spaced repetition (FSRS).

**6. A cast, not a single bot.** Several partners with different personalities and difficulty. New partners unlock with progression.

## Consequences
- Prompting is a real engineering effort: persona bibles, memory summaries, hidden learner context, and guardrails (`prompt-engineer` skill).
- Morse needs a QSO state machine plus a timing decoder; the LLM supplies the free-text parts.
- Arabic voice mode depends on dialect STT quality. That's a research task.
- Free-tier data terms: some providers may use chat content for training. Users must be told.
