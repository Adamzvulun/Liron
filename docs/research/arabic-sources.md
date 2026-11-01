# Research: existing sources for spoken Palestinian/Levantine Arabic


> 📚 **Historical record.** The current truth is [`vision.md`](../vision.md) and the ADRs, including the simplification pass [0011](../decisions/0011-simplification-pass.md).

- **Date:** 2026-11-01
- **Question:** Are there enough good *existing* sources to teach spoken Levantine Arabic in Arabic script, without creating our own content?
- **Short answer: yes.** Spoken Palestinian Arabic is well covered, and a lot of it was made specifically for Hebrew speakers. The gaps are **licensing** (much of the best material is commercial) and **audio** (free TTS is mostly MSA, though open Palestinian TTS models now exist).

> ⚠️ Licenses and current availability must be verified before anything is bundled into the app, especially once friends use it. The policy is in §5.

## 1. Vocabulary & lexicons
| Source | What | Script | License / cost | Use for |
|---|---|---|---|---|
| **Maknuune** (palestine-lexicon.org; NYUAD CAMeL Lab + UNRWA college) | 36K+ entries, 17K lemmas, 3.7K roots. Diacritized Arabic, phonological transcription, English gloss. TSV download. | Arabic + transcription | Described as "open"; **verify license** | ⭐ Backbone dictionary: spelling, roots, glosses |
| **Speaking Arabic** (Yohanan Elihay) + a shared Anki deck | 4,500+ phrases and sentences with audio, Palestinian/Jordanian. Elihay is Israeli; the series originated in Hebrew. | Transliteration (the book also has Arabic script) | Book is copyrighted; deck is a free community share | Curriculum ordering reference; personal import only |
| **Lingualism** Palestinian / Levantine vocabulary decks | ~4,500–4,800 cards with audio, A1–B1, plus verb conjugation decks | Arabic script (diacritized) | Paid | Personal import (BYO deck) |
| **Adros Verse** Palestinian-Jordanian levels I–IV | Graded A1–B2 decks with grammar and audio | ? | Paid | Personal import |
| **Buckwalter & Parkinson**, *A Frequency Dictionary of Arabic* | Top 5,000 words, mainly MSA, with dialect-usage notes | Arabic | Book, copyrighted | Cross-check of frequency only |

## 2. Corpora (for frequency and real sentences)
| Source | What | Notes |
|---|---|---|
| **Curras** (Birzeit / Jarrar, Habash et al. 2017) | 56K-token morphologically annotated Palestinian corpus: lemma, POS, gloss | Can produce a *Palestinian lemma frequency list*. Small but real. |
| **MADAR** (CAMeL Lab) | Parallel travel-domain sentences across 25 city dialects + English/MSA | Check whether a Palestinian or Levantine city is included. If so, it's a source of graded sentences. |

## 3. Courses (curriculum structure to learn from)
| Source | What |
|---|---|
| **Madrasa (מדרסה)** | Israeli community for spoken Arabic aimed at Hebrew speakers. Free learning portal, plus a free beginner MOOC on Campus IL (12–15 weeks, 3–4 h/week). |
| **Israeli school "spoken Arabic" curriculum** | Hebrew-transliteration based. A reference for which topics come first. |

We use these as **structure and ordering references**. We don't copy their content.

## 4. Audio / TTS
| Option | Notes |
|---|---|
| **Sofelia-TTS-82M** (Hugging Face) | Kokoro-82M fine-tuned for Palestinian Arabic. One female voice, with a dialect text frontend and lexicon. Reads numbers in MSA, so spell them out. Small enough to self-host. **Check license.** |
| **Leva-TTS** (PyPI) | XTTS-v2 fine-tune for Levantine/English code-switching, 10 speakers, streaming. XTTS has a restrictive (non-commercial) model license. Fine for a personal project; **verify**. |
| Azure `ar-SY` neural voices | Syrian (Levantine) voice, decent. Has a free monthly allowance. |
| ElevenLabs | Reports say its Palestinian voices lean MSA; v3 is better. Paid. |
| Deck audio (Lingualism / Elihay) | Native recordings. Personal use only. |

**Plan:**
- Generate audio for open content with Sofelia (or Azure as fallback), then cache it as static files so TTS isn't called at runtime.
- Native audio comes in through imported decks.

## 5. Policy proposal (superseded by ADR 0008)
1. **Bundled content** (shared with friends) comes only from openly licensed sources: Maknuune, Curras, and MADAR (if the license allows), plus our own lesson *sequencing* on top. Sequencing is "curating", not "creating sources".
2. **"Bring your own deck"**: users can import Anki decks they own (e.g., Lingualism). These stay private to that user.
3. **Frequency order** comes from the Curras lemma counts, cross-checked against Elihay/Madrasa topic order and the dialect notes in Buckwalter.

## 6. Still to research
- Speech-to-text for Palestinian Arabic (for the mic): Whisper variants, the browser Web Speech API with `ar-*` locales, and free tiers.
- The MADAR city list and license; the Maknuune license; the Sofelia license.
- Graded reading material in colloquial Arabic script (children's content, social media style).

## Sources
- Maknuune: https://arxiv.org/pdf/2210.12985 · https://nyuad.nyu.edu/en/news/latest-news/science-and-technology/2023/february/maknuune-palestinian-arabic-dialect.html
- Curras: https://fada.birzeit.edu/handle/20.500.11889/4507
- MADAR: https://camel.abudhabi.nyu.edu/madar/static/pdfs/2018-LREC-MADAR-Resources.pdf
- Elihay deck: https://hadithunlocked.com/blog/speaking-arabic
- Lingualism: https://lingualism.com/product/palestinian-colloquial-arabic-vocabulary-anki-flashcards
- Adros Verse: https://www.adrosverse.com/?p=14420
- Madrasa MOOC: https://pop.education.gov.il/sherutey-tiksuv-bachinuch/students-online-courses/course-catalogue/spoken-arabic/
- Sofelia TTS: https://huggingface.co/hamdallah/Sofelia-TTS-82M
- Leva-TTS: https://pypi.org/project/leva-tts/
- Palestinian TTS write-up: https://medium.com/@salahadawi/generating-palestinian-arabic-text-to-speech-tts-salah-adawi-c6b4aaa827c3
- Buckwalter & Parkinson: https://www.routledge.com/9780415444347
- Speech datasets: https://huggingface.co/datasets/moaead/dialectal-arabic-voices
