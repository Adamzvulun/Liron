# Free audio for phrases the deck lacks (2026-11-04)

**Question:** where can free, licensed recordings come from for the phrases the Lingualism deck lacks (السلام عليكم, صباح النور, إن شاء الله) and the "to a woman" forms? Adam asked for a web search with every source fact-checked. No purchases (ADR 0012).

**Answer so far:** nothing is ready to use yet. One lead is worth finishing: **Lingua Libre's South Levantine recordings** on Wikimedia Commons. The voice models are out, for the reasons below.

| Source | Licence (checked at the source) | Palestinian? | Verdict |
|---|---|---|---|
| **Sofelia-TTS-82M** (Hugging Face, hamdallah) | `apache-2.0` in the model card. There's no LICENSE file (404). The base Kokoro-82M is Apache-2.0 | Says "Palestinian Arabic". One female voice, "Eliaa". Training data source not stated | **Out.** Its own code (`sofelia_frontend.py`) maps ħ → ʰ and ʕ → ʁ, because Kokoro has no symbols for them. So ح comes out as a breathy h and ع close to غ. That would teach the wrong sounds: عليكم and صباح both have them |
| **Sofelia-TTS** (voice cloning, same author) | "Apache 2.0" on the card; trained on a "Private Dataset" | Says Palestinian | **Out:** voice cloning, unclear data, no samples |
| **Habibi-TTS** (SWivid) | Code MIT; weights CC BY-NC-SA 4.0 or Apache 2.0, by variant | No Palestinian. "LEV" is only an ID, with no released weights or samples | **Out** |
| **Forvo** | Changed in 2019 from CC BY-NC-SA 3.0 to its own restrictive licence | Mixed | **Out** |
| **LangMedia** (Five Colleges) | Site content CC BY-NC-SA 4.0 "unless otherwise noted" | Unknown | **Unverified:** the Levantine audio page is gone (404) |
| **Arabic Speech Corpus** | CC BY 4.0 | No: Damascene speaker, read sentences | **Out** |
| **Lingua Libre / Wikimedia Commons** | Per file. Seen: CC BY-SA 4.0 (Khalil.rantissi, Fjmustak) and CC0 1.0 (Akram, recorded by Fazlake) | Category "pronunciation-ajp" = South Levantine (ISO ajp, which covers Palestinian and Jordanian): 3,323 files | **The lead.** See below |

## Lingua Libre: what's checked and what isn't
- **Checked:** the ajp category exists with 3,323 recordings by about a dozen speakers (Khalil.rantissi 516+, Akram 345+, Muhammad 370+…). Licences are per file: CC BY-SA 4.0 needs credit, CC0 needs nothing. In the first ~1,500 file names there are greetings like *kīf l-ħāl* and *ʔahla fīk*, but none of our target phrases. The Arabic (ara) category has إن شاء الله by Fjmustak (CC BY-SA 4.0).
- **Found on a second pass (2026-11-04):** a colloquial إن شاء الله, *nšallah*, by Akram (recorded by Fazlake), 26 August 2023, **CC0 1.0**, labelled South Levantine (ajp). The Commons page states no place or dialect for the speaker. Akram also has *mašallah* and *biddo*. The second pass reached about 1,640 of the 3,323 names before Commons rate-limited it again: no *salām*, *ṣabāħ*, *nūr*, *fhimt* or feminine forms (*kīfik*, *tfaḍḍali*) among them.
- **Not checked yet:** each speaker's origin. That's on lingualibre.org, which didn't load (timeouts, then 503). Commons doesn't state it, and we don't guess from names. The other ~1,800 ajp file names weren't searched either, because Commons rate-limited this container.
- **Next:** when lingualibre.org loads, read each speaker's item (place, dialect), then search the rest of the names for the target phrases and the feminine forms. If a Palestinian speaker has them, bring the files to Adam with their licence and the credit line.

## Sources
- https://huggingface.co/hamdallah/Sofelia-TTS-82M (card, `inference.py`, `sofelia_frontend.py`)
- https://huggingface.co/hamdallah/Sofelia-TTS
- https://huggingface.co/SWivid/Habibi-TTS and https://github.com/SWivid/Habibi-TTS
- https://en.wikipedia.org/wiki/Forvo
- https://langmedia.fivecolleges.edu/content-license
- https://en.arabicspeechcorpus.com/
- https://commons.wikimedia.org/wiki/Category:Lingua_Libre_pronunciation-ajp
- https://commons.wikimedia.org/wiki/File:LL-Q13955_(ara)-Fjmustak-إن_شاء_الله.wav
- https://commons.wikimedia.org/wiki/File:LL-Q55633582_(ajp)-Khalil.rantissi-آلة.wav
- https://commons.wikimedia.org/wiki/File:LL-Q55633582_(ajp)-Akram_(Fazlake)-kīf_l-ħāl.wav
- https://commons.wikimedia.org/wiki/File:LL-Q55633582_(ajp)-Akram_(Fazlake)-nšallah.wav
