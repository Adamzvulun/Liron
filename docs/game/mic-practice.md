# Mic practice: the echo well (E14)

- **Status:** design, written 2026-11-10 while Adam slept (he said to make the calls he'd make). Every "my call" below is easy to change.
- **Epic:** [#152](https://github.com/Adamzvulun/Liron/issues/152).
- **Decisions it rests on:** [ADR 0013](../decisions/0013-speech-on-free-gemini.md) (no automatic pronunciation score; record and compare in the browser) and [ADR 0014](../decisions/0014-groq-whisper-for-speech.md) (the opt-in "did it understand you?" check through Groq). E14 needs no new ADR: it uses the same browser recording and the same Groq function.
- **Already built:** record and compare, and the Groq check, on the coffee corner's "Say it" cards ([survival phrases](survival-phrases.md), §Speaking).

## 1. What E14 adds
Four ways to practice speaking and hearing, all in one new courtyard station, **the echo well** (my call: a well answers back, and the courtyard already has a fountain for listening).

| Practice | What you do | Where its audio comes from |
|---|---|---|
| **Hear the difference** | Ear training on the sounds a Hebrew or English speaker mixes up | the deck's recordings |
| **Shadowing** | Speak along with a sentence, at the same time as the speaker | the deck's sentences |
| **Record and compare** | Say a word or a sentence, then hear yourself next to the speaker | the deck's words and sentences |
| **Did it understand you?** | On a whole sentence: Groq writes down what it heard | your recording, only when you press the button |

There's still **no pronunciation score** (ADR 0013). You judge yourself, and the judgement sets the review's grade, as on the Say it cards.

## 2. Hear the difference (ear training)
The sounds that matter for a Hebrew speaker, from hardest to easiest:
1. **ح / ه** (ḥ and h). Hebrew has neither as a clear pair.
2. **ع / ء** (ʿayn and the glottal stop).
3. **خ / ح** (kh and ḥ). Hebrew's ח is closer to خ.
4. **غ / خ** (gh and kh).
5. **The emphatics:** ص / س, ض / د, ط / ت.
6. **ق / ك.** In the deck's Palestinian, ق is mostly said as **g** (galb, *heart*), so the pair a learner hears is g / k.

**What the deck has (checked 2026-11-10, ids only in the scratchpad):**
- **Real minimal pairs** (one sound apart, nothing else): about a dozen, for example عمّ / أمّ (*uncle* / *mother*), خالة / حالة (*aunt* / *case*), خدّ / حدّ (*cheek* / *someone*), قلب / كلب (*heart* / *dog*), غيمة / خيمة (*cloud* / *tent*), صورة / سورة (*picture* / *sura*), عرض / أرض (*width* / *land*).
- **None for ح / ه,** the most important pair.

**So the drill has two kinds of question (my call):**
- **Which one?** You hear one word of a minimal pair and pick between the two, shown with their meanings. These use the dozen real pairs.
- **Which sound?** You hear a word that has one of a pair's sounds, and pick which one: "ح or ه?". This works with any word, so every pair gets hundreds of examples. Hearing many different words is what trains the ear (high-variability phonetic training, as in the research on Japanese speakers learning English r / l).

- **Words:** only words whose sound is clear in the recording. The fountain's rule carries over: a word the speaker says with another letter's sound isn't asked.
- **One pair at a time,** in the order above. A pair is "heard" after 20 right in a row at 90% or better. Then the next one opens, and heard pairs come back mixed in.
- **Saved:** a **listen** rating per pair (`pair:ha-ha`), and the pairs heard (`pairsHeard`).
- **XP:** 1 per right answer (a question takes about 6 seconds, so about 10 XP a minute, as the economy asks).

## 3. Shadowing
You hear a short deck sentence, then press "Shadow" and speak **along with** the speaker while it plays again. The recording starts with the playback and stops with it.
- **Then you hear both:** yours alone, the speaker's alone, and the two together (yours a little to the right in stereo).
- **Slower first (my call):** the first time at 75% speed (the browser keeps the pitch), then at full speed.
- **Sentences:** the deck's shortest ones first (3 to 6 words), from the words you've learned. The word path already ties sentences to words.
- **You judge it:** "In step", "Close", "Lost". That sets the review's grade (good, hard, again), as on the Say it cards.
- **XP:** 3 per sentence shadowed.

## 4. Record and compare
It's built on the Say it cards. E14 brings it to:
- each word in the word path, after its first meeting (an optional "Say it" button);
- the sentences in the echo well.

The recording stays in the tab and is never uploaded (ADR 0013). The microphone is released when you stop.

## 5. Did it understand you? (sentences)
The same Groq check as on the Say it cards, now on whole sentences in the echo well.
- It stays **off until Adam adds `GROQ_API_KEY`** in Vercel. Without the key, the button says it isn't set up yet.
- **It sends a recording only when you press the button.** The privacy line under it says so.
- **Its answer is a hint, not a score:** "It heard: …", next to the sentence.

## 6. Rewards
- **Contracts:** two new kinds, `pairs-round` (a round of ear training) and `shadow-sentence`. Each needs a template and a migration, as for every contract kind.
- **Achievements (my call), added to the wall:** "Sharp ears" (all six pairs heard, 3 gems) and "Echo" (100 sentences shadowed, 3 gems).

## 7. What's out
- **A pronunciation score.** No free model does it reliably (ADR 0013).
- **Recordings we don't have:** ح / ه minimal pairs, and women's voices. These wait for Lingua Libre or another licensed source (the coffee corner's open question); nothing is used before Adam has seen it.

## 8. Tasks
1. The echo well station, and "Hear the difference" with its pairs data (`content/arabic/sound-pairs.json`: deck ids and our own labels only). — [#193](https://github.com/Adamzvulun/Liron/issues/193)
2. Shadowing: playback at 75% and 100%, recording in step with it, and the three ways to listen back. — [#194](https://github.com/Adamzvulun/Liron/issues/194)
3. Record and compare on the word path's words. — [#195](https://github.com/Adamzvulun/Liron/issues/195)
4. "Did it understand you?" on sentences. — [#196](https://github.com/Adamzvulun/Liron/issues/196)
5. Contracts and the two achievements. — [#197](https://github.com/Adamzvulun/Liron/issues/197)
