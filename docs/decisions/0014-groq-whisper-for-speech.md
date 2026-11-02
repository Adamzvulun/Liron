# 0014 — Groq Whisper is the speech model

- **Status:** Accepted
- **Date:** 2026-11-02
- **Amends:** [0013](0013-speech-on-free-gemini.md) (which model hears the mic). Everything else in 0013 stands.

## Context
ADR 0013 put "did it understand you?" on `gemini-3.5-flash-lite`, because Gemini's stronger free models allow only 20 requests/day. Adam wants **one** hosted, free speech model we can stick with, without hopping between models. His rules: nothing runs locally (no in-browser or on-machine models), no paid tiers, no Azure, and his voice is never sent for testing.

We ran Groq-hosted Whisper on the same 50 native deck clips and 15 synthetic right/wrong pairs as Gemini ([analysis](../../spikes/gemini-speech/results/2026-11-02-groq-analysis.md)):

| | Groq `whisper-large-v3` | Gemini `3.5-flash-lite` |
|---|---|---|
| Sentences usable (by hand) | **28/30** | 24/30 |
| Sentence CER / WER | **4.3% / 19%** | 9.1% / 25% (v2 prompt: 7.5% / 23%) |
| Single words usable | 16/20 | 15/20 |
| Synthetic consonant mistakes caught (by hand) | 3/15, ح/ه 0/6 | 2/15 |
| Free limit (read from this account's response headers) | **2,000 requests/day**, 7,200 audio-s/hour, one fixed model | flash-lite: no cap hit in ~270 calls; stronger models: 20/day |

## Options considered
1. **Stay on Gemini flash-lite (ADR 0013).** It works, but it's weaker on dialect, and the better Gemini models are capped at 20/day.
2. **Groq `whisper-large-v3`.** Best transcription in our test, published free limits ~100× Gemini's stronger models, data not retained by default except up to 30 days of abuse/reliability logs (Groq docs). Risk: Groq retires models now and then.
3. **Groq `whisper-large-v3-turbo`.** Same family, faster. Not tested; no need, since speed wasn't a problem (all 80 calls went through without a single 429).
4. **Cloudflare Workers AI Whisper v3 turbo.** Same model family, less headroom (~214 audio-min/day). Rejected.
5. **Azure Pronunciation Assessment.** Rejected by Adam.

## Decision
- **Groq `whisper-large-v3` is the speech-to-text model** for every "did it understand you?" check: #45 (survival phrases), E14 (mic practice), E17 (voice in café conversations). Settings as in `spikes/gemini-speech/groq.mjs`: `language=ar`, `temperature=0`, a short Palestinian-dialect prompt.
- **One model, not a pool.** It sits behind the AI adapter (ADR 0004, E15) so it can be swapped by config if Groq retires it. Swapping is a deliberate decision, not automatic hopping.
- **Compare generously.** Before comparing the transcript with the target, normalise the way the spike does (diacritics, hamza and alef, ة/ه, ى/ي). Also accept ق written as ج/غ (this dialect says /g/) and digits for numbers.
- **Still no per-sound scoring.** Whisper fixed ح/ه mistakes away 6 out of 6 times and even wrote native ح as ه. Pronunciation feedback stays non-AI, as in ADR 0013: record-and-compare plus ear training.
- **Unchanged from 0013:** prefer sentences to single words, and Gemini still does text chat and cached TTS for E17.

## Consequences
- **Nothing is cut.** #45, E14 and E17 keep their mic features, with a stronger "understood" check.
- **A second provider and key.** `GROQ_API_KEY` joins `GEMINI_API_KEY` as a server-side secret (Vercel, M1 #15). Free sign-up; Adam already has it.
- **Data, still open for Adam:** in the app, an "understood" check would send the learner's audio to Groq instead of Google. Groq's default is better (no retention except up to 30 days of abuse logs; no training on it per third-party summaries, ⚠️ not on Groq's own page). The check stays **opt-in, off by default** until Adam decides.
- **Revisit** if Groq retires `whisper-large-v3`, changes its free limits, or a hosted free model does well on the synthetic-mistake test (trim the spoken TTS preamble first; see the analysis).
