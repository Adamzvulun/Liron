# Prompt for the next Claude session (written 2026-11-02)

Paste this as the first message of a new session:

---

We're continuing work on Waymark, my personal learning hub for Arabic and Morse (repo: Liron). Work on the default branch `claude/learning-hub-arabic-morse-20ckww`.

Before you do anything, read `docs/process/STATUS.md` and `CLAUDE.md`, and follow them.

Your task: finish the non-Gemini speech API test (GitHub issue #1).

Background: Gemini's free tier caps its stronger models at 20 requests/day, and I don't want to hop between models. I want **one hosted, free** speech model we can stick with. My rules:
- Nothing runs locally: no in-browser and no on-machine models.
- No paid tiers.
- No Azure.
- Never send recordings of my voice.

The research is in `docs/research/speech-apis.md`. Groq-hosted Whisper is the candidate, and I've added `GROQ_API_KEY` as an environment secret.

1. Check that `GROQ_API_KEY` is set, without printing it. If it's missing, stop and tell me. Never ask me to paste keys in chat.
2. In `spikes/gemini-speech/`, run `python3 -I prep.py`, then `node groq.mjs`. You may send the 50 deck clips and the synthetic clips in `synth-clips/` (computer voice, not mine) to Groq. Ask before sending anything else.
3. Read the side-by-side table, not just the scores. The deck spells dialect its own way, and this speaker says ق as /g/, so judge real errors versus spelling differences by hand, like `results/2026-11-01-analysis.md` does. Compare with Gemini flash-lite: 24/30 sentences usable, 15/20 single words, 2/15 synthetic mistakes caught.
4. Give me a plain-language verdict: is Groq good enough to be *the* speech model for "did it understand you?" (#45, E14, E17)? Also, does it catch any pronunciation mistakes? (Gemini didn't, so ADR 0013 has no per-sound scoring.) If it's not good enough, say so plainly and propose what's left that fits my rules. Research before suggesting.
5. Commit the results to `spikes/gemini-speech/results/`. Record the decision as an ADR (amending 0013). Update the spike README, the research doc, issue #1 (close it when decided) and `docs/process/STATUS.md`. Push.

After that, the next step is M1, starting with #12 (app scaffold). Don't start M1 until I say go.
