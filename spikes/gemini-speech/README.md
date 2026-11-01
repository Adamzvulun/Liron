# Spike: can Gemini (free tier) hear Palestinian Arabic?

Roadmap M0 item 0.5. Decides whether the mic features (speaking practice, voice chats with partners, ADR 0004/0007) can rely on Gemini's free tier.

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
The key is read from the `GEMINI_API_KEY` environment variable. Options: `--model <id>`, `--delay <ms>` between calls (default 7000, to stay under free-tier rate limits), `--limit <n>`. Results go to `results/`.

## Results
Not run yet: waiting for the API key.
