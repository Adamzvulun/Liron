# Survival phrases: the coffee corner (E9, #44, #45)

Written 2026-11-04 during the autonomous run. It still needs Adam's review: these are Claude's picks, made as he asked ("take the answer you think I would've picked").

## What it is
The Caravanserai's coffee corner teaches **phrases for a first week** of daily life in Israel. It runs alongside the script lessons and is open from day one, because it's taught by ear: you don't need to read Arabic for it.

## The sets
Nine sets of 10 phrases (set 6 has 11), each from the Lingualism deck with its native recording. `content/arabic/phrases.json` holds only the deck ids and our own titles. The phrases stay private (ADR 0011).

| Set | Title | From the deck's sections |
|---|---|---|
| 1 | At the door | greetings: hello, good morning, how are you, fine, welcome, bye, good night |
| 2 | Please and thanks | yes, no, please, thank you, you're welcome, here you are, sorry, excuse me, يعطيك العافية and its answer |
| 3 | Counting | one to ten |
| 4 | Questions | what, who, where, how, why, how much, "what's this?", "what do you want?", "where do you live?", "how old are you?" |
| 5 | At the shop | "how much is it?" (two ways), expensive, cheap, shekel, change, "do you want a bag?", the bill, "can you break this note?" |
| 6 | Getting to know you | "what's your name?", "where are you from?", "nice to meet you", "are you married?", "can you speak Arabic?", "I speak a little Arabic", slowly, again, "I didn't understand a word you said" (added 2026-11-04), "see you later" |
| 7 | At the coffee corner | coffee, Turkish coffee, tea, water, milk, sugar, without sugar, with a little sugar, "how would you like your coffee?", menu |
| 8 | Which way | right, left, "turn right/left!", "go straight!", near, bus, taxi, "I need the bathroom", "is there wifi here?" |
| 9 | Today and tomorrow | today, tomorrow, yesterday, now, later, "what time is it?", one and two o'clock, tomorrow morning, when |

Phrases with a blank in the deck ("My name is __.") are left out, because the blank can't be heard. No phrase is in two sets (a test checks).

Religious set phrases (prayers, hajj, condolences) and the long congratulations are left for later sets: they matter, but not in week one.

## Scheduled: what the deck doesn't have
Adam approved these on 2026-11-04 (full review, decisions 7 and 8). They're **scheduled, not built**: the deck has no recording of them, and a phrase you can't hear can't be taught by ear. Each one needs a sourced spelling and a recording before it goes into a set.

- **Phrases the deck lacks:** السلام عليكم and its answer وعليكم السلام, صباح النور (the answer to صباح الخير), إن شاء الله. Searched on 2026-11-04: none is in the deck. The deck does have ما شاء الله (pcav:4821), but only as "said about a child".
- **"I don't understand":** the deck has *mā fhímtiš íši min ílli gúltu* ("I didn't understand a word you said", pcav:4558), with a recording. It's now in set 6, so this one is done.
- **Forms for a woman:** the phrases that speak *to* someone ("how are you?", "what's your name?", "here you are", "see you later", "excuse me", "would you like a bag?", "where are you from?" and others) are in the masculine form in the deck. "I'm sorry" (آسف) is in the form a man says it. The deck has no feminine forms of any of them. Its only one is إنْتي, "you" said to a woman (pcav:4270). Until there's a recording, the session shows nothing for these.

**Where the audio could come from.** No purchases (ADR 0012) and no native-speaker helpers (vision). The free sources were searched and fact-checked on 2026-11-04 ([research](../research/phrase-audio-sources.md)):
- **Dialect TTS is out.** Sofelia, the only Palestinian model, is Apache-2.0, but its code turns ح into a breathy h and ع into something close to غ. That would teach wrong sounds.
- **Lingua Libre (Wikimedia Commons) is the lead:** 3,323 South Levantine recordings, CC BY-SA 4.0 or CC0 per file. Still to check: which speakers are Palestinian (their lingualibre.org pages didn't load) and whether they recorded our phrases. Nothing is used until Adam has seen the files and their licences.

The spelling of each line is checked against a reputable source before it ships (ADR 0012, point 5).

## A session
1. **Meet** each phrase once:
   - the recording plays;
   - the Arabic, the **Hebrew bridge**, the deck's Latin and the meaning;
   - **Record yourself** and play yourself and the speaker side by side.
2. **Understand** by ear: the phrase plays, and you pick its meaning from 4. Due phrases from earlier sets (FSRS) are mixed in, up to 5.
3. **Say it:** see the meaning, say it (recording optional), compare, and judge it yourself: "Close enough" or "Not yet".
4. **Pass:** understand 90% of the set's phrases to move on to the next set.

## The Hebrew bridge for phrases
It's written from the deck's **Latin**, not its Arabic script (`phrases/hebrew.ts`). The Latin has every vowel the Gaza speaker says, while the Arabic leaves most short vowels out. So the Hebrew reads the way the recording sounds:
- kēf ɧālak? → כֵּיף חַאלַכּ?
- gaddēš ɧággu? → גַדֵּיש חַגּוּ?

The rules:
- Each consonant uses the letter's bridge (ع ע, ح ח, خ ח׳, the Gaza ق as ג).
- Vowels are niqqud, and long vowels are written with a letter.
- A doubled consonant takes a dagesh.
- A final vowel is written with a letter (מַרחַבַּא), the way Israeli Arabic transliteration does it.

## Speaking, honestly (ADR 0013, ADR 0014)
- **The comparison:** record-and-compare runs in the browser only. The recording stays in the tab and is never uploaded, and the microphone is released when you stop.
- **No score:** there's no automatic pronunciation score. The free speech models can't judge sounds (spike #1), so you judge yourself, and that judgement only sets the review's grade:
  - understood and said → good;
  - understood but not said → hard;
  - missed → again.
- **The next step needs Adam's decision:** an opt-in "did it understand you?" check (Groq Whisper) would send his audio to Groq. It's still an open question for Adam in STATUS.

## Saved
- **State:** `phraseSet` (the set you're on) and `phrasesMet`.
- **Reviews:** an FSRS review per phrase, keyed by its deck id (`pcav:4757`).
- **Ratings:** a **listen** rating per phrase.
- **XP:** 1 per phrase understood, 1 per phrase said, and 20 for passing a set.
- **Practice minutes.**

## Picks for Adam to change
1. **Which phrases:** the nine sets above (sets 6–9 added on 2026-11-04).
2. **The order:** sets in order, each passed at 90% understanding, not twice in a row, since speaking is self-judged.
3. **Hebrew from the Latin** (the spoken form), not from the Arabic letters.
4. **Self-judged speaking** until he decides on the Groq check.
