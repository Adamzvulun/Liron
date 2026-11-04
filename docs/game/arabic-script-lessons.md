# Arabic script lessons (E8)

- **Status:** drafted by Claude overnight on 2026-11-03 and sent to Adam as files. On 2026-11-04 Adam told Claude to keep building and make the calls he'd make, so the sprint follows these picks. **They still await his explicit approval** (section 7).
- **The data:** [`content/arabic/letters.json`](../../content/arabic/letters.json) holds every letter with its Hebrew bridge, sound, shape family, lesson and note, and the 8 lessons.

## The short version
- **Learn letters in shape families,** 3–5 letters a lesson, in 8 lessons. Every lesson ends with real words you can read.
- **Each letter is met through the Hebrew letter you know,** with its four forms. You hear it in 2–3 short words spoken by the deck's native speaker.
- **Practice is sound first,** like Morse: hear a word, pick the letter; see a word, pick how it sounds (in Hebrew letters, which fade later). Writing by tracing comes after.
- **Audio: the Lingualism deck you already own.** No new source, nothing to buy. It has native words for all 28 letters, already uploaded to `waymark-dev` behind login.
- **Gate:** a lesson's letters are yours at 90% in two sessions in a row, **the second on a later day than the first** (Adam, 2026-11-04). Then FSRS keeps them fresh.
  - *Why a later day:* a session has only 18 questions, so 90% allows one mistake. A learner truly at 90% passes two sessions in a row only about 20% of the time, and two back-to-back sessions are massed practice. Research on successive relearning supports reaching the criterion in separate, spaced sessions ([Rawson & Dunlosky 2022](https://journals.sagepub.com/doi/full/10.1177/09637214221100484)). A second 90% on the same day keeps the first counted and says "come back tomorrow". Morse keeps its rule: a run has about 100 characters, so its gate is already gentle (ADR 0028).

## 1. Order: shape families (#39)
| Lesson | Letters | Why together | Words you can read after it (all in the deck, with audio) |
|---|---|---|---|
| 1 | ا ب ت ن ي | Alif plus the "teeth with dots" family: dots are the whole difference | أنا (I), إنتَ (you), تين (figs), يابا (dad), باي! (goodbye), بين (between) |
| 2 | ث و ر ز | ث completes the dotted teeth; و ر ز are the first that **don't join forward** | زيت, رُزّ (rice), توت (berries), زتون (olives) |
| 3 | د ذ م ل لا | د ذ also don't join; م and ل are very common; ل + ا always join as لا, so it's taught with ل | دمّ (blood), دار (home), يَمّا (mom) |
| 4 | س ش ك | the "saw" family; ك | سِتّ (grandma), ناس (people), شباب (youth) |
| 5 | ج ح خ ه ة | the cup family; ح against ه is the first throat pair; ة is ه's shape with ت's dots | |
| 6 | ع غ ف ق | ع and ق need extra listening | |
| 7 | ص ض ط ظ | the heavy (emphatic) letters, taught against their light twins س د ت ذ | |
| 8 | ء ى | hamza and alif maqsura | |

- **Readable words grow fast** (single deck words, vowel marks ignored): 18 after lesson 1, then 43, 137, 215, 440, 466, 252 and 44 new ones after lessons 2–8.
- **Changed 2026-11-04 (review, Claude's call at Adam's request):** لا moved from lesson 8 to 3 and ة from 8 to 5. لا already appeared in words from lesson 3 (the app reads it as ل + ا) before its shape was taught, and 178 words that waited only on ة now come at lesson 5. Before the move the counts were 262, 351, 183 and 406 for lessons 5–8.

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
4. **The 90%-twice gate,** the second pass on a later day (changed 2026-11-04, see Gate above).
5. **Writing comes after reading** in each lesson, not before.

## 8. What's built (2026-11-04)
Code: `src/subjects/arabic/`. Each step below is the design above, made real.
- **The hall** (`Caravanserai.tsx`) shows the scribe's table (your lesson, its letters, passes so far) and the coffee corner (phrases, soon). The painted courtyard (#42) replaces this simple hall. `?open=lesson` opens the lesson directly, for tests.
- **A session** (`lesson/ScriptLesson.tsx`):
  1. **Meet** each new letter once: the letter, "Like ב", its name and sound, its four shapes (made by the font with zero-width joiners), whether it joins the next letter, the note, and up to 3 deck words with their recordings. "Meet the letters again" brings the cards back.
  2. **Listen** (10 questions): the word plays, you pick its first letter from 4. The choices always include its twin or a shape sibling you know (`lookalikes` in `letters.ts`). Alif is never asked as a first letter, since in speech its hamza starts the word.
  3. **Read** (8 questions): a word you can read in full, with its vowel marks; you pick its sound from 4 choices **in Hebrew letters**. They're made from each letter's bridge (بيت → בית, short vowels left out, final forms at the end), the common Israeli way of writing Arabic. Wrong choices are other readable words of about the same length. After you answer, the word plays.
  4. **The result:** the score, how close you are to passing (90% in 2 sessions in a row, on different days), the letters to listen for again, and XP.
- **Saved and measured** (`lesson/report.ts`): the state (lesson, passes in a row, letters met); an FSRS review per letter (`letter:beh`, graded by `gradeFrom` from the answers that tested it: all right is good, at least half is hard, fewer is again); a Glicko **listen** rating per letter and a **read** rating per word; XP (1 per right answer, +30 for passing a lesson); practice minutes.
- **The words** come from the Lingualism deck through `api.privateContent('lingualism-pcav')` (signed in only, ADR 0011), and each recording through `api.mediaUrl`. Only single words made entirely of taught letters are used. If the deck isn't in the database, the lesson says so.
- **The courtyard** (`hall/paintKhan.ts`, `hall/Courtyard.tsx`, #42) replaces the simple hall. It's the approved concept, painted in the browser at 1920×1080 with one perspective camera:
  - **Scribe's table:** your lesson.
  - **Fountain:** a Listen-only round of 12. It's practice: it feeds reviews, ratings and XP but never passes a lesson.
  - **Storyteller:** a Read-only round of 12, the same kind of practice.
  - **Slate:** writing, soon.
  - **Coffee corner:** phrases, soon.
  - On an upright phone, the courtyard pans and the same things follow below it as cards.
- **"The Long Road In", chapter I** (#43, `content/arabic/questline.json`, `questline.ts`):
  - The road has a milestone per lesson. Each passed lesson lights one, and its story beat shows on the scroll.
  - When all 8 are lit, the gate opens on **the Painted Sign** (`lesson/Trial.tsx`). You read 30 words from every letter, and 90% passes.
  - Passing pays +50 XP and makes you ضيف (Guest) on the house banner. Before that you're غريب (Stranger).
  - The chapter covers all 8 lessons, not 1–3 as section 6 first said: one milestone per lesson reads better on the road.
- **Vowel marks** (#40, `content/arabic/marks.json`, `marks.ts`):
  - **Taught as the design above says:** fatha, kasra and damma in lesson 1; sukun in 2; shadda in 3; tanween in 5. Each is a "Meet a vowel mark" card after the lesson's letters. The card shows the mark on ب ت ن, its Hebrew twin (patah, hiriq, kubutz, shva, dagesh), a note and deck words that carry it.
  - **Read words show only the marks you know.** The Hebrew choices carry them as niqqud: بِنْت → בִּנְת. One wrong choice is often the same word with a vowel changed (בַּנְת), so you have to read the mark, not just the letters. ب and ك always get a dagesh, since they're always b and k.
  - **Fading:** from lesson 4, every other Read word is shown bare with bare choices, because real signs and messages have no marks.
  - **Reviews:** each mark is its own FSRS item (`mark:kasra`), reviewed by the Read answers that showed it.
  - **Dialect honesty, taken from the deck itself:**
    - It leaves most fathas out (118 of 1,803 single words have one), so an unmarked letter usually takes a.
    - It writes a sukun over و/ي for the Palestinian ō and ē (موْت mōt, عيْلة ēla).
    - It has 127 words that start with two consonants, which textbook Arabic never does: لْسان lsān for lisān.
- **Writing at the slate** (#41, `write/Slate.tsx`, `write/trace.ts`):
  - **The session:** 5 letters you've met, newest lesson first. You trace each one over a faint guide, then write it from memory, with a finger or the mouse.
  - **The check is a rough shape check, not handwriting recognition:**
    - Both the font's letter and your ink are read onto a 64×64 grid.
    - It passes if you covered enough of the letter (75% tracing, 55% from memory) and kept your ink near it (at most 25% or 40% outside, with a margin for a shaky hand).
    - There's no stroke order. That's honest about what a rough check can tell, and it keeps us free of handwriting AI.
  - **Saved:** a **write** rating per letter (a pass from memory counts more than a traced one), 2 XP per good shape, and practice minutes. Like the fountain and the storyteller, it's practice: it never passes a lesson.
- **Hebrew choices fade to Latin** (`LATIN_AFTER` in `lesson/questions.ts`):
  - **When:** once every letter of a word was taught at least 2 lessons ago, its Read choices are the deck's own romanisation (bint, tīn, bēt).
  - **The key:** each Latin question shows a key for the deck's special letters in its choices, e.g. 3 = ع, ɧ = ح, ʂ = ص, and g = ق, the Gaza speaker's ق. Those letters carry a `latin` field in `letters.json`.
  - So new letters are read with the Hebrew bridge, and old ones without it.
- **Not built yet (ordered, not dropped):** the last fade, to no choices at all: typing or saying the word. That needs the speech decision (#45, ADR 0014), so it comes with E9.
