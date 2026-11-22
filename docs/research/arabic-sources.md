# Research: existing sources for spoken Palestinian/Levantine Arabic

- **Date:** 2026-11-01
- **Question:** Are there enough good *existing* sources to teach spoken Levantine Arabic in Arabic script, without creating our own content?
- **Short answer: yes.** Spoken Palestinian Arabic is well covered, and a lot of it was made specifically for Hebrew speakers. The gaps are **licensing** (much of the best material is commercial) and **audio** (free TTS is mostly MSA, though open Palestinian TTS models now exist).

> ⚠️ **Several claims in this doc were corrected by the [fact-check](../research/fact-check-2026-11-01.md)**: Elihay deck quality and dialect, Elihay's bio, MADAR license, Sofelia license, XTTS license.

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

---

## 7. Verification round (2026-11-01, after choosing "start free")

**Method:** web search only. Direct page fetches were blocked by this environment's network policy (palestine-lexicon.org, arxiv.org, hadithunlocked.com, ankiweb.net, lingualism.com).

### Verified (via search results quoting the source page)
- **Maknuune license:** the official download page (sites.google.com/nyu.edu/palestine-lexicon/download) says the data is **CC BY-SA 4.0**. Available as TSV (~2 MB, versioned) and PDF. 36K+ entries, 17K lemmas, 3.7K roots. Attribution: *Dibas, Khairallah, Habash et al. (2022)*.
- **The "Elihay" Anki deck** is actually *Levantine Arabic Conversations (Jordanian & Palestinian)* (ankiweb.net/shared/info/15997591), a third-party deck based on Elihay's book:
  - 4,500+ phrases and sentences. **Arabic script was added by the deck's creator**; the book itself is mostly romanized.
  - The dialect was **standardized to Jordanian**, not Palestinian.
  - It has **1,886 audio files** for 4,500+ cards. Reviewers report **mostly an English computer voice**, with only occasional native audio.
  - Reviewers also report **numerous mistakes** in sentences and spelling. Last updated 2023-09-26.
  - **Conclusion: weaker than first described.** It's usable as a phrase source, but not as the main course or the audio source.
- **Lingualism Palestinian Colloquial Arabic Vocabulary:**
  - 4,800+ words and phrases in 57 themes, in Arabic script with transcription, in the **Gazan** dialect.
  - The Anki deck price was **not found**. Related Lingualism decks are listed at $7.99–$10.99.
  - Search results state that the **book's native-speaker audio (MP3) is a free download**. *Not verified on the page itself.*

### Not yet verified (needs page access)
- Whether Maknuune offers audio. One review article mentions free audio files, but it's unclear what that refers to.
- Lingualism's free MP3s: are they really free, and how are the files named and organized?
- Madrasa (madrasafree.net): the free online course for Hebrew speakers, with video lessons and exercises. Whether its content is in Arabic script or only Hebrew transliteration is **unknown**.
- Tfaddalu (tfaddalu.com/guides): Palestinian guides with audio on every word. License and size unknown.

### Sources
- https://sites.google.com/nyu.edu/palestine-lexicon/download
- https://ankiweb.net/shared/info/15997591
- https://lingualism.com/products/palestinian-colloquial-arabic-vocabulary
- https://lingualism.com/product/palestinian-colloquial-arabic-vocabulary-anki-flashcards
- https://arabic-for-nerds.com/dialects/dictionaries-palestinian-arabic/
- https://leichtag.org/madrasa/
- https://tfaddalu.com/guides

---

## 8. The purchased deck (from Lingualism's *Anki Quick Start* PDF, provided by Adam)
- **Lingualism *Palestinian Colloquial Arabic Vocabulary*, bought 2026-11-01 for $25.**
- 4,823 words, expressions, and example sentences. Cards go in both directions (Arabic→English and English→Arabic).
- **Audio is included** in the `.apkg` package (~35 MB).
- **57 topic subdecks**, matching the book's sections (food, travel, family…).
- **Each item has exactly one level tag: A1, A2, B1, or B2.** These are Lingualism's *suggested* CEFR levels, based on usefulness, not an official CEFR list. This gives us a ready-made learning order, with no frequency mining needed.
- **Kept in** `sources/arabic/lingualism-palestinian-vocabulary/` on the importing machine, along with the full 285-page book PDF, never committed (ADR 0054). The full inspection is in that folder's README.

---

## 9. Filling the two gaps: script and grammar (researched 2026-11-01, web search only)

### Gap 1: learning to read and write the Arabic script
| Option | What | Cost | Verified | Notes |
|---|---|---|---|---|
| **Madrasa: "הכתב הערבי"** ([course page](https://courses.madrasafree.com/courses/course-v1:madrasa+arabic_alphabet+2020_1/about)) | **In Hebrew.** ~12 interactive hours over a month. Videos on recognizing and reading letters, writing shown on a board, handwriting and typing exercises. | Free (Madrasa's online courses are free for Hebrew speakers) | Course exists and its contents are described on its page | The enrollment page itself couldn't be opened |
| שפה1 "קוראים וכותבים ערבית" ([page](https://safa1.co.il/readarabic/)) | In Hebrew. 28 letters + first 150 words, ~10 h self-study | Free | Page exists | The site looks old and may be inactive |
| English options (Arabic Quick, Learn Arabic Online, Madinah Arabic reading course) | Alphabet courses with audio | Free | Vendor claims only | Less suited: English-language, mostly MSA or Quranic pronunciation |

### Gap 2: grammar and structure of spoken Palestinian
| Option | What | Cost | Verified | Notes |
|---|---|---|---|---|
| **Madrasa: "ערבית מדוברת: מתחילים"** ([catalog](https://pop.education.gov.il/sherutey-tiksuv-bachinuch/students-online-courses/course-catalogue/spoken-arabic/)) | In Hebrew. 8 lessons, 54 units: videos, audio exercises, games. Ends with basic everyday conversation plus the most important grammar. Also a free podcast. | Free | Course structure described on its page | **Probably taught in Hebrew transliteration, not Arabic script** (unconfirmed) |
| **Lingualism: *Palestinian Arabic Verbs*** ([product](https://lingualism.com/products/palestinian-arabic-verbs)) | 100 conjugation tables with example sentences, a grammar reference, a 750-verb index. Arabic script + transcription. A1–B1. **Same Gaza dialect and same author team as our deck.** Native audio (free download, possibly needs an account). | **PDF price not confirmed.** One listing shows $22.99, another shows a $28.88 bundle. Paperback $23–28. | Contents verified via listings | Probably **over Adam's $20 line**. Search prices were already wrong once ($17.99 vs $25 paid). |
| Zaytuna Knowledge ([learnpalestinian.com](https://learnpalestinian.com/)) | Free Palestinian/Jordanian grammar, stories, dictionary | Free | Site description only | License unknown, so use as a reference only |
| Learn Levantine ([learnlevantine.com](https://learnlevantine.com/)) | 300+ Levantine lessons (includes Palestinian), dictionary with native audio, verb conjugator | Free to read | Site description only | Mixed Levantine, not only Palestinian |
| ~~Isleem, *Colloquial Palestinian Arabic*~~ | 384-page textbook | $40–65 | Listings | ❌ Readers report **no audio included**. Not recommended. |

### Outcome (2026-11-01, ADR 0012)
- **Option (b):** Waymark teaches the script and the grammar itself. The Madrasa courses serve as structure references; Zaytuna and Learn Levantine as free references; the deck's sentences as examples.
- **No more purchases**, so *Palestinian Arabic Verbs* is not bought.
