# 0013 — Speech features on free Gemini: understanding, not pronunciation scoring

- **Status:** Accepted, amended by [0014](0014-groq-whisper-for-speech.md) (the mic's model is now Groq Whisper)
- **Date:** 2026-11-01
- **Amends:** [0004](0004-free-llm-provider-agnostic.md) (which model), [0011](0011-technical-corrections.md) #2 (speech input)

## Context
The Gemini speech spike (issue #1; its files held deck text and left the repo with ADR 0054) tested 50 native deck clips on the free tier:
- **Transcription works:** 80% of sentences right or spelling-only, 75% of single words.
- **Pronunciation judgment doesn't.** A yes/no judge accepts wrong text 98% of the time. Forced choice does as well without audio as with it. With synthetic mistakes (free Gemini TTS saying a one-consonant-wrong copy), 13 of 15 still came back as the correct word.
- **Free quota is per model per day.** The stronger Flash models allow 20/day. `gemini-3.5-flash-lite` handled ~270 calls in under 1 s each. TTS models allow about 10/day each.

Adam's call (2026-11-01): **stay on free Gemini**, no paid tier, and no sending his own recordings to test it. Speaking matters, but it's one track among many, so don't sink more time here.

## Options considered
1. **Pay for a speech or pronunciation API.** Rejected: free only.
2. **Keep testing with Adam's voice.** Rejected by Adam.
3. **Use Gemini for what it can do (understanding), and give pronunciation feedback without AI grading.** Chosen.

## Decision
- **Model:** `gemini-3.5-flash-lite` for audio, behind the provider adapter (ADR 0004), so a better free model can be swapped in by config. The stronger Flash models (20/day) are for a few high-value calls only.
- **"Did it understand you?" instead of "was your ح right?"** The mic sends a sentence, Gemini transcribes it (the run.mjs v1 prompt, a normal listener), and we compare that to the target phrase. A match means a native-trained listener understood you. We never show a per-sound score we can't back up.
- **Pronunciation feedback without AI:**
  - **Record-and-compare:** play your take next to the native clip, and loop it. This runs in the browser, so nothing is uploaded.
  - **Ear training first:** minimal-pair listening drills from native deck audio (ح/ه, ع/ا, ق/ك…). Hearing the difference comes before saying it.
- **Prefer sentences to single words** for anything Gemini checks. Words without context are less reliable.
- **TTS (partner voices, E17):** generate once and cache, never live per message. At about 10/day per model, live TTS won't fit.

## Consequences
- **Nothing is cut.** #45, E14 and E17 keep their mic features; they just don't claim per-sound grading.
- **E14** becomes shadowing + record-and-compare + ear training + an optional "understood" check.
- **E17 voice** works on flash-lite. The partner reads the transcript generously and asks back when unsure.
- **Open (Adam):** every in-app mic check sends the learner's audio to Google's free tier, under the same terms as the spike. The default is record-and-compare, which uploads nothing. The "understood" check is opt-in until Adam decides.
- **Revisit** if a new free model does well on the spike's `v2.mjs --part synth` (kept outside git since ADR 0054). That test needs no human voice.
