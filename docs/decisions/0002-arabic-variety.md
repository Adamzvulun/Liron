# 0002 — Arabic variety: spoken Levantine (Palestinian), in Arabic script, with a Hebrew bridge

- **Status:** Accepted. The Hebrew-bridge details are still Proposed.
- **Date:** 2026-11-01

## Context
Adam lives in Israel and wants to understand and speak the Arabic around him: basic speech, reading, and writing, enough to converse. He's a native Hebrew speaker.
The Arabic spoken around him is **Palestinian / Levantine colloquial Arabic**. Modern Standard Arabic (MSA) is the language of news and formal texts, but nobody speaks it in daily life.

## Options considered
1. **MSA.** Rich resources, but it doesn't match the goal: people would understand you, but you'd sound like a newsreader and wouldn't understand them.
2. **Colloquial in Hebrew transliteration only** (the common Israeli school approach). Fast to start, but it doesn't meet the reading/writing goal.
3. **Colloquial Levantine, written in Arabic script, with Hebrew transliteration as scaffolding that fades away.**

## Decision
Option 3.
- **Script:** learn the Arabic alphabet early. Colloquial Arabic is written in Arabic script in real life (WhatsApp, signs, social media).
- **Hebrew as a bridge:**
  - Hebrew letters map naturally to Arabic sounds (ח ע ק צ ט and more). Early cards show Hebrew transliteration with diacritics where needed (ג׳ ח׳ ד׳ ת׳ ט׳ ע׳ / ר׳). It fades out as script skill grows.
  - Shared Semitic roots (שלום/سلام، בית/بيت، כתב/كتب) get a "you already know this" badge.
  - Hebrew grammar parallels (binyanim ↔ verb forms, smikhut ↔ idafa) get short explanations.
- **MSA is a later optional layer** (news, signs), not the spine.

## Consequences
- **Content risk:**
  - Frequency lists, audio, and TTS are much weaker for Levantine than for MSA.
  - We'll need to build our own core word list from spoken-Levantine sources. Research is a task in M0/M1.
  - Free neural TTS mostly produces MSA pronunciation, so audio needs a plan: dialect-capable TTS, native recordings, or both.
- Transliteration conventions need a written standard (`docs/research/`).
