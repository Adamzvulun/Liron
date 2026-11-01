# Spike: can Gemini (free tier) hear Palestinian Arabic?

Roadmap M0 item 0.5, GitHub issue #1. Decides whether the mic features (speaking practice, voice chats with partners, ADR 0004/0007) can rely on Gemini's free tier.

## What it tests
50 native-speaker clips from the Lingualism deck (fixed sample, seed 42): 30 sentences and 20 single words containing hard sounds (ح ع ق خ غ ص ض ط ظ ء).

1. **Transcription:** Gemini writes down each clip in Arabic script. Scored against the deck text after normalising diacritics, hamza and alef forms, ة/ه and ى/ي (character and word error rate). Dialect spelling varies, so read the side-by-side table too, not only the numbers.
2. **Minimal pairs** (a stand-in for "is my pronunciation right?"): for each clip, Gemini judges the correct text and a copy with one letter swapped for a sound learners confuse (ح→ه, ع→ا, ق→ك…). A useful judge accepts the first and rejects the second.

Phase 2, after phase 1 looks promising: the same tests on Adam's own recordings.

## Data and cost
- Free tier: no cost. Google may use free-tier prompts and audio to improve its products, and human reviewers may see them. Adam approved sending these clips (2026-11-01).
- The audio files stay out of git (`clips/` is ignored); `manifest.json` holds only the text.

## Run
```bash
python3 -I prep.py
```
```bash
node run.mjs
```
The key is read from the `GEMINI_API_KEY` environment variable. Options: `--model <id>`, `--delay <ms>` between calls (default 7000, to stay under free-tier rate limits), `--limit <n>`. Results go to `results/`. The run saves a checkpoint after each clip and resumes from it if stopped (for example by a daily quota).

Follow-up test, forced-choice minimal pairs, plus a no-audio control:
```bash
node choice.mjs --model gemini-3.5-flash-lite
```
```bash
node choice.mjs --model gemini-3.5-flash-lite --no-audio
```

## Results (phase 1, 2026-11-01)
**Verdict: partial.** Transcription works well enough to use with care. Pronunciation judgment is unproven, and the deck clips cannot prove it. Details: [`results/2026-11-01-analysis.md`](results/2026-11-01-analysis.md), raw table: [`results/2026-11-01-gemini-3.5-flash-lite.md`](results/2026-11-01-gemini-3.5-flash-lite.md).

- **Model:** `gemini-3.5-flash-lite`, the only free model with enough daily quota and good speed (<1 s). The stronger Flash models allow **20 requests/day** on the free tier, and the newest (`3.8-flash`) took about 130 s per clip because of load.
- **Transcription:** sentence CER 9% / WER 25%. By hand, 24/30 sentences are right or differ only in spelling, and 27/30 keep the meaning. Single words: 15/20. It drifts towards MSA spellings now and then (تلات→ثلاث, هادي→هذي).
- **Pronunciation (minimal pairs):** the yes/no judge accepts the one-letter-wrong text 98% of the time, so it's useless. Forced choice scores 92% with audio but 96% *without* audio, so it reflects language knowledge, not hearing.
- **Follow-up (v2.mjs, no human voice):** a dialect-aware prompt brings sentence CER to 7.5%. In a synthetic-mistake test (free Gemini TTS says a one-consonant-wrong copy), 11 of 15 came back as the correct word and only 2 were caught. Pronunciation scoring is off the table on the free tier.
- **Decision:** [ADR 0013](../../docs/decisions/0013-speech-on-free-gemini.md): free Gemini only, check *understanding* of sentences, pronunciation via record-and-compare and ear training. Adam's voice is not sent (his call, 2026-11-01), so phase 2 is dropped.

```bash
node v2.mjs --part deck
```
```bash
node v2.mjs --part synth
```
(`synth` uses the TTS models, about 10 calls/day each on the free tier. Its audio goes to `synth-clips/`, which is git-ignored.)
