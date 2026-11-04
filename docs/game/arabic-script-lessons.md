# Arabic script lessons (E8)

- **Status:** drafted by Claude overnight on 2026-11-03 and sent to Adam as files. On 2026-11-04 Adam told Claude to keep building and make the calls he'd make, so the sprint follows these picks. **They still await his explicit approval** (section 7).
- **The data:** [`content/arabic/letters.json`](../../content/arabic/letters.json) holds every letter with its Hebrew bridge, sound, shape family, lesson and note, and the 8 lessons.

## The short version
- **Learn letters in shape families,** 3–5 letters a lesson, in 8 lessons. Every lesson ends with real words you can read.
- **Each letter is met through the Hebrew letter you know,** with its four forms. You hear it in 2–3 short words spoken by the deck's native speaker.
- **Practice is sound first,** like Morse: hear a word, pick the letter; see a word, pick how it sounds (in Hebrew letters, which fade later). Writing by tracing comes after.
- **Audio: the Lingualism deck you already own.** No new source, nothing to buy. It has native words for all 28 letters, already uploaded to `waymark-dev` behind login.
- **Gate:** a lesson's letters are yours at 90% in two sessions in a row, the same rule as Morse. Then FSRS keeps them fresh.

## 1. Order: shape families (#39)
| Lesson | Letters | Why together | Words you can read after it (all in the deck, with audio) |
|---|---|---|---|
| 1 | ا ب ت ن ي | Alif plus the "teeth with dots" family: dots are the whole difference | أنا (I), إنتَ (you), تين (figs), يابا (dad), باي! (goodbye), بين (between) |
| 2 | ث و ر ز | ث completes the dotted teeth; و ر ز are the first that **don't join forward** | زيت, رُزّ (rice), توت (berries), زتون (olives) |
| 3 | د ذ م ل | د ذ also don't join; م and ل are very common | دمّ (blood), دار (home), يَمّا (mom) |
| 4 | س ش ك | the "saw" family; ك | سِتّ (grandma), ناس (people), شباب (youth) |
| 5 | ج ح خ ه | the cup family; ح against ه is the first throat pair | |
| 6 | ع غ ف ق | ع and ق need extra listening | |
| 7 | ص ض ط ظ | the heavy (emphatic) letters, taught against their light twins س د ت ذ | |
| 8 | ة ء ى لا | the extras you see everywhere | |

- **Readable words grow fast** (single deck words, vowel marks ignored): 18 after lesson 1, then 43, 137, 215, 262, 351, 183 and 406 new ones after lessons 2–8.

- **Basis:** grouping by shape family is the usual approach of script courses: issue #39, and the Cambridge worksheet among others.
- **Madrasa:** I could not verify Madrasa's own letter order; its course page didn't open in research, so this is my order, not theirs. If you can see their course, tell me the order and I'll compare.

## 2. A letter lesson
- **Meet** (one card per letter, concept card 1):
  - The letter big.
  - Its Hebrew bridge (ADR 0002): ب=ב, ت=ת, ن=נ, ي=י, ج=ג׳, خ=ח׳, ث=ת׳, ذ=ד׳, ظ=ט׳, ض=צ׳, غ=ע׳.
  - Its name, its four forms (alone, start, middle, end), and whether it joins the next letter.
  - 2–3 words with native audio, the letter coloured.
  - One short note where Hebrew misleads, e.g. "ب is always b, never v the way ב can be".
- **Listen** (concept card 2): hear a word, pick its first letter from the lesson's letters, about 12 per session.
  - **Minimal pairs for the sounds Hebrew lacks:** ع against ا, ح against ه, ق against ك, ص against س, ض against د, ط against ت, ظ against ذ. They come up more until they're right (issue #38).
    - The deck has few exact word pairs (13; none for ح/ه, ط/ت, ظ/ذ; the deck has 13 exact word pairs across these contrasts), so the twin is in the *options*, not in a second word. Exact pairs, where they exist, make a bonus round.
- **Read** (concept card 3): see a word made only of letters you know, pick how it sounds.
  - The options are in Hebrew letters with niqqud. That scaffolding fades: later the options become Latin, then disappear (type or say it).
  - After answering, you hear it and see its meaning.
- **Write** (#41, after Read): trace the letter with a finger or mouse, then draw it free, checked roughly against the stroke shape. No handwriting AI.

## 3. Vowel marks (#40), taught alongside
- **Lesson 1:** fatha, kasra and damma, because you can't read أنا without them. Long vowels ا و ي come as they're met.
- **Lesson 2–3:** sukun and shadda (بُنّ, دمّ).
- **Lesson 5:** tanween, as recognition only (it's rare in speech).
- **Fading:** from lesson 4, Read drills sometimes drop the marks. Real WhatsApp text and signs have none.

## 4. Dialect honesty (ADR 0002)
- **The sounds differ by region.** The deck's speakers are from Gaza, and Palestinian pronunciation of a few letters varies:
  - ق: a glottal stop (ʔ) in towns, k in villages, g in Gaza and among Bedouin.
  - ث ذ ظ: city speech says them t, d and ḍ, or s, z and ẓ in borrowed words; villages keep the "th" sounds.
- **Each card teaches the letter's standard sound** (the Hebrew bridge), and adds a short note when the deck's speaker says it differently. For example: "ث is written th, but you'll mostly hear t or s; here the speaker says sárwa."
- **Sources:**
  - [Abuamsha / Gaza women's ق study](https://unipub.unimas.my/ojs/index.php/ILS/article/download/1661/837/3666).
  - [Palestinian Arabic overview](https://playaling.com/dialects/levantine-arabic/palestinian/).
  - Both agree on the urban ʔ for ق, and on interdentals becoming t/d in cities.
  - The finer details (e.g. ذ→ض in Gaza) come from weaker sources, so the cards won't claim them.

## 5. Audio: the deck (#38's open decision)
- **What it has:** the deck has native audio for every letter: short words starting with each one.
  - The rare letters are thin: ذ 1 word (ذكاء), ظ 2 (ظريف, ظُرْبان), ث 4. Each still gets one or two words.
  - ا is heard in the middle of words, since it rarely starts a spoken word.
- **What's missing:** a recording of the letter's *name* (bāʾ, tāʾ). I propose no audio for names, because names matter far less than sounds. Free alternatives exist if you want them:
  - Wikimedia recordings: CC BY-SA or GFDL, mixed licences, and not native Palestinian.
  - Open Palestinian TTS: still to be verified.
- **Licence:** personal use, behind login, already handled by ADR 0008/0011.

## 6. Saving and measuring
- **Spaced repetition:** each letter is an FSRS item, `letter:beh`. Reads and listens feed it (#39, #41).
- **Ratings:** a Glicko rating per skill, "read" and "listen" (ADR 0010).
- **The questline:** "The Long Road In" (#43) wraps lessons 1–3 in story beats, with a trial that grants ضيف (Guest), the same pattern as the Silent Beacon.
- **Measured for the M2 retro:** letters learned over time, accuracy per letter (especially the throat and heavy letters), and minutes a day.

## 7. My picks, for you to change
1. **Shape-family order** as in the table above.
2. **Read options in Hebrew letters first,** fading to Latin, then none.
3. **No audio for letter names.**
4. **The 90%-twice gate,** the same as Morse.
5. **Writing comes after reading** in each lesson, not before.
