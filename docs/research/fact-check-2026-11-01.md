# Fact-check of everything in the docs (2026-11-01)

- **Why:** Adam's rule: research before suggesting. Every factual claim made so far is re-checked here.
- **Method:** web search only. Direct page access is blocked by this environment's network policy, so results come from search snippets that quote the pages.
- **Legend:** ✅ verified · ⚠️ corrected · ❓ still unverified (and why)

## Arabic content
| Claim | Result | Evidence / correction |
|---|---|---|
| Lingualism *Palestinian Colloquial Arabic Vocabulary*: 4,500–4,800 words, 57 themes, Arabic script + transcription, native audio | ✅ | Product page and sample PDF. The Anki deck presents each item both ways (~9,600 cards). |
| Lingualism deck price | ✅ **$17.99** (eBook $20.99; bundle exists) | Shop listing as indexed by search. **Adam should confirm the live price before buying**, since I can't open the page. |
| Lingualism audio is free | ✅ | The book's audio by native **Gazan** speakers is free to stream or download (sample PDF points to lingualism.com/pcav). |
| Lingualism dialect | ⚠️ **Gaza dialect** (southern Palestinian) | In Gaza, ق is often pronounced [g] (or as a glottal stop in parts of the city). In the Galilee and the Triangle it's often ك or a glottal stop. The core everyday vocabulary is described as close to the broader Levantine family. Sources are of mixed quality. |
| Lingualism accuracy | ⚠️ | One Amazon reviewer flagged a translation error ("orange juice" given as ʿaṣīr laymūn). |
| "Elihay deck" | ⚠️ **Much weaker than first described** | Third-party deck *Levantine Arabic Conversations*. The dialect was standardized to **Jordanian**. Only 1,886 audio files for 4,500+ cards, mostly an **English computer voice**. Reviewers report many errors. |
| Elihay is "Israeli; series originated in Hebrew" | ⚠️ | Yohanan Elihay (born Jean Laraouh) was a French-born monk and linguist who lived in Israel from 1956 and died in 2020. He wrote Hebrew–Arabic dictionaries of colloquial Palestinian (Arabic in Hebrew letters) and the *Olive Tree Dictionary* (2007). That the *Speaking Arabic* series itself started in Hebrew is **unverified**. |
| Adros Verse Palestinian-Jordanian decks | ✅ | Level I (A1) deck **€2.99 on sale** (regular €9.99); book + deck bundle €7.99. 500+ notes with grammar and audio. Whether the audio is native or TTS is unknown. The dialect is Palestinian-Jordanian mixed. |
| Maknuune: 36K entries, 17K lemmas, 3.7K roots; diacritized Arabic, transcription, English | ✅ | Official download page and announcements |
| Maknuune license | ✅ **CC BY-SA 4.0** | Official download page. TSV (~2 MB, versioned) + PDF. |
| Maknuune audio | ❓ | One review mentions audio. Not confirmed. |
| Madrasa: free course for Hebrew speakers | ✅ | 95,000+ enrolled; free for Hebrew speakers; also a spoken-Arabic dictionary and a podcast |
| Madrasa uses Arabic script | ❓ Probably **Hebrew-letter transliteration** | One illustration shows Arabic phrases in Hebrew letters. Not confirmed. |
| Curras: Palestinian annotated corpus, 56K tokens | ✅ | Birzeit repository. A GitHub PR states Curras v2 is CC BY 4.0 (secondary source). |
| MADAR: 25 cities, including Jerusalem | ✅ | **License: non-commercial, registration required, no modification rights.** Previously not recorded. |
| Buckwalter & Parkinson: top 5,000, mainly MSA, dialect notes, 30M-word corpus | ✅ | Publisher listings |
| Sofelia-TTS-82M: Palestinian TTS on Kokoro-82M, one voice | ✅ | **Its own license is unverified.** The base Kokoro-82M is Apache-2.0. |
| Leva-TTS uses XTTS-v2, which has a non-commercial license | ⚠️ Partly | XTTS-v2 is under the Coqui Public Model License (CPML). Its non-commercial terms aren't confirmed by search. |
| Arabic speakers in Israel mix in Hebrew words | ✅ | Several academic studies of Arabic–Hebrew code-switching. Mostly lexical and informal, and context-dependent. |
| Hebrew transliteration of Arabic | ⚠️ Corrected | ج=ג׳, خ=ח׳, ث=ת׳, ذ=ד׳, ظ=ט׳, ض=צ׳, غ=ע׳ or ר׳. The two forms for غ are disputed; sources disagree on which one the Academy of the Hebrew Language prescribes. ط=ט and ص=צ without geresh. |
| Free FSI Levantine course with audio (public domain) | ✅ (new) | Old, pronunciation-focused, probably transcription rather than Arabic script. Not Palestinian-specific. |

## Morse
| Claim | Result | Evidence / correction |
|---|---|---|
| Learn at ~20 wpm character speed with Farnsworth spacing | ✅ | LCWO instructor guide: keep characters at 20 wpm and adjust Farnsworth spacing. Some advise 25–30 wpm if you catch yourself counting. |
| Koch: add a character at ≥90% | ✅ as common practice | It's a widely used guideline, not one universal rule |
| Slow learning causes a plateau around "10–12 wpm" | ⚠️ Corrected | Sources put the counting plateau at **~7–10 wpm**. Widely repeated by practitioners, but **not backed by rigorous studies**. |
| RufzXP: callsigns, speed rises on correct, falls on wrong | ✅ | 50 callsigns per run. It does **not** simulate QSB/QRM. |
| MorseRunner: contest simulator with QRM, QSB, QRN, flutter, pileups | ✅ | |
| CW Academy teaches head copy | ✅ | From Intermediate level onward. No official CW Academy speed rationale was found. |

## AI
| Claim | Result | Evidence / correction |
|---|---|---|
| Gemini free tier: Google may use data, and humans may review it | ✅ | Official terms (preview): unpaid usage can be read by human reviewers and used to improve products. Paid usage is not. |
| Gemini Flash models are free with rate limits | ✅ roughly | Exact models and limits vary by source and change often. Must check AI Studio at build time. |
| Gemini accepts audio input | ✅ | Audio files (MP3, WAV, OGG, FLAC) are accepted directly |
| Gemini understands **Palestinian** speech well | ❓ | **No published benchmark found.** It must be tested ourselves (roadmap 0.5). |
| OpenRouter free models as a backup | ⚠️ Weaker than implied | `:free` models allow **50 requests/day** per account unless **$10 of credits** were ever bought (then 1,000/day), at 20 requests/min. Data policies vary by model. |

## Platform
| Claim | Result | Evidence / correction |
|---|---|---|
| Supabase free projects pause after ~1 week inactive | ✅ | 7 days. Data is kept; you restore it manually from the dashboard. Also: 500 MB DB, 1 GB file storage, 2 active free projects, no backups on free. |
| Supabase can be invite-only | ✅ | Turn off "allow new users to sign up" and invite users server-side; or use the official "before user created" hook |
| Vercel Hobby is for personal, non-commercial use | ✅ | Official docs. Functions can run up to 300 s on Hobby, which is plenty for AI calls. |
| "A regular website can't send phone notifications" | ⚠️ **Wrong** | **Android and desktop browsers can receive web push from a regular website without installing anything.** iPhone (iOS 16.4+) needs the site added to the Home Screen first. |
| FSRS outperforms SM-2 | ✅ | Open benchmark: FSRS beats Anki's SM-2 for ~90%+ of users. `ts-fsrs` exists and tracks current FSRS versions. |
| Glicko-2 used for puzzle ratings in chess apps | ✅ (common knowledge, not re-searched) | |

## Sources
- Lingualism: https://lingualism.com/products/palestinian-colloquial-arabic-vocabulary · https://files.lingualism.com/wp-content/uploads/SAMPLE-Palestinian-Colloquial-Arabic-Vocabulary-Lingualism.pdf · https://www.amazon.com/Palestinian-Colloquial-Vocabulary-Matthew-Aldrich/dp/194965060X
- Adros Verse: https://www.adrosverse.com/product/arabic-palestinian-jordanian-level-i-anki-flashcards/
- Elihay deck: https://ankiweb.net/shared/info/15997591 · Elihay bio: https://www.tabletmag.com/sections/israel-middle-east/articles/monk-teaches-israelis-arabic
- Maknuune: https://sites.google.com/nyu.edu/palestine-lexicon/download
- Madrasa: https://madrasafree.com/?p=9233 · https://jpost.com/israel-news/article-689681
- MADAR: https://camel.abudhabi.nyu.edu/madar-parallel-corpus · Curras/OpenAccent: https://github.com/c2do/OpenAccent/pull/30
- Gaza dialect: https://medium.com/ypla/the-unique-feature-of-the-palestinian-dialect-6b619897facc · https://playaling.com/dialects/levantine-arabic/palestinian/
- Code-switching: https://ora.ox.ac.uk/objects/uuid:0f99963f-8877-45d5-a9e8-85e72f18ca9e/files/m88ba1e83ebce000ca1df07d081b9e8f8 · https://forward.com/culture/13312/israeli-arabs-and-hebrew-01791/
- Transliteration: https://en.wikipedia.org/wiki/Geresh
- FSI Levantine: https://fsi-language-courses.org/fsi-levantine-arabic-course
- Sofelia: https://huggingface.co/hamdallah/Sofelia-TTS-82M
- Morse: https://cwa.cwops.org/wp-content/uploads/LCWO-ICR-Guidelines-1.6-CA.pdf · https://www.amateurradio.com/cw-practice-with-rufzxp/ · https://github.com/VE3NEA/MorseRunner · https://www.qsl.net/n1irz/finley.morse.html
- Gemini terms: https://ai.google.dev/gemini-api/terms_preview · audio: https://theneuralbase.com/gemini-api/learn/intermediate/audio-input-native-audio-understanding/ · dialect ASR: https://arxiv.org/html/2605.16364v3
- OpenRouter: https://benchlm.ai/md/free-tier/openrouter.md
- Supabase: https://automationatlas.io/answers/supabase-free-tier-limits-2026/ · https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
- Vercel: https://vercel.com/docs/plans/hobby
- Web push: https://pushpad.xyz/blog/ios-special-requirements-for-web-push-notifications · https://blog.chromium.org/2015/04/reaching-and-re-engaging-users-on.html
- FSRS: https://forums.ankiweb.net/t/video-fsrs-vs-anki-s-default-algorithm-sm-2/37925.md
