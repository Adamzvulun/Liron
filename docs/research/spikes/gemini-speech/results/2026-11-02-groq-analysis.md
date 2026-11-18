# Analysis: Groq Whisper vs Gemini flash-lite (2026-11-02)

Hand review of [`2026-11-02-groq-whisper-large-v3.md`](2026-11-02-groq-whisper-large-v3.md) (raw: [json](2026-11-02-groq-whisper-large-v3.json)). The same 50 native deck clips and the same 15 synthetic right/wrong pairs as the Gemini runs ([analysis](2026-11-01-analysis.md)). No recordings of Adam were sent.

- **Model:** Groq-hosted `whisper-large-v3`, `language=ar`, `temperature=0`, with a short Palestinian-dialect `prompt` (see `groq.mjs`).
- **Calls:** 80 (50 deck + 30 synthetic) plus 1 header check. No errors, no 429s.
- **Free limits, read from this account's response headers:** `x-ratelimit-limit-requests: 2000` (per day) and `x-ratelimit-limit-audio-seconds: 7200` (per hour). This confirms the research doc's numbers for the account itself (they were ⚠️ before).

## 1. Transcription

Raw scores (same normalising as run.mjs):

| Measure | Groq whisper-large-v3 | Gemini flash-lite v1 / v2 |
|---|---|---|
| Sentences: CER | **4.3%** | 9.1% / 7.5% |
| Sentences: WER | **19%** | 25% / 23% |
| Single words: CER | **13%** | 16% / 17% |

**Sentences (30), by hand**, with the same categories as the Gemini analysis:

| Verdict | Count | Examples |
|---|---|---|
| Exact (after normalising) | 17 | خلينا نقعد برّا · بلاش ننزل ع البلد هلقيت، الدنيا زحمة · هادي الشغلة بتفاجئني عن جد |
| Spelling only | 4 | عَ قدّي→عجدي and تقريباً→تجريباً (ق said as /g/, written ج) · عَ الحمّام→عالحمام · حوَلين→حوالين |
| Meaning intact, small slips | 7 | تلات→تلت · أخو→أخ · تلاتة ونص→ثلاثة ونصف (MSA drift) · بيكفّوا→بكفّه · بناخد→ناخد · هلقيت→هل جيت (/g/ again, split into two words) |
| Real word errors, meaning lost | 2 | فالت→فعلت ("loose"→"did") · الرعد صحّاني→الراعت صحّان ("thunder" lost) |

→ **28/30 (93%) usable** (Gemini: 24/30), and 28/30 keep the meaning (Gemini: 27/30). If you count هل جيت as a real error, it's 27/30, still ahead.

It also keeps dialect spelling much better than Gemini: هادي, تلت, هلقيت, بدّي, برّا, إشي come back as written in the deck. Gemini drifted to MSA (هذي, ثلاث) more often.

**Single words (20):** 12 exact. 3 spelling only: خمستاعش→"15" (digits), and قراية→غراية / قرش→جرش (ق as /g/). 1 small slip: بطفولتو→طفولتو (lost the ب- prefix). 4 wrong: نسكافيه→نسكفي, استماع→استمع, and two that matter for pronunciation: **حلو→هلو** and **الصومال→السومال**. On *native* audio Whisper wrote ح as ه and ص as س.
→ **16/20 usable** (15/20 if the dropped prefix counts as wrong). Gemini: 15/20. Words without context stay weaker than sentences.

## 2. Pronunciation: synthetic mistakes

The script's automatic verdict says 2/15 caught, 9 fixed back to the real word, and 0 false alarms. **Both automatic "catches" are artefacts:** in 0102 (wrong) and 1541 (both) Whisper dropped the target sentence and returned only the spoken preamble (below), so there's nothing to compare. By hand:

| Wrong-consonant audio came back as… | Count | Which |
|---|---|---|
| the correct word (mistake fixed away) | 8 | all 4 ح→ه, both ه→ح, ص→س 4453, ع→ا 0418 and 4410 |
| the wrong sound (caught) | 3 | ط→ت 0611 (ربّات, right audio heard as رباط) · ع→ا 4534 (أيش vs عيش on the right audio) · ع→ا 0636 (جيّ قدّي vs عأدي; borderline) |
| no usable answer (sentence dropped or garbled) | 4 | 0102, 1541, 1601, 4208 |

Gemini by hand: 2 caught (both ط→ت on garbled transcripts), 11 fixed.

**Conclusion:** no usable pronunciation signal. ح/ه, the confusion that matters most for learners, was fixed away 6 out of 6 times. On top of that, Whisper itself wrote native ح as ه (حلو→هلو). The 3 catches are ع-drops and one ط, too few and too noisy to back a per-sound score. ADR 0013 stands: no per-sound scoring.

**Caveat about the synthetic clips:** most of them start with the TTS reading out its own instruction ("قل هذا باللغة العربية الفلسطينية، بالضبط كما كتبت، بسرعة"). Gemini's v2 prompt skipped it, but Whisper transcribes it and sometimes drops the real sentence after it. The verdict compares against both texts, so the preamble adds the same noise to each side. If these clips are reused, trim the preamble first (e.g. with ffmpeg silence detection).

## Verdict
**Groq `whisper-large-v3` is good enough to be *the* speech model for "did it understand you?"** It beats Gemini flash-lite on every transcription measure (28/30 sentences usable vs 24/30). It keeps dialect spelling better. And its free tier allows 2,000 requests/day on one fixed model, against 20/day for Gemini's stronger models. It catches pronunciation mistakes no better than Gemini did, so pronunciation feedback stays non-AI (record-and-compare and ear training, ADR 0013). Decision: [ADR 0014](../../../../decisions/0014-groq-whisper-for-speech.md).
