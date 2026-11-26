# Morse words and head copy (E12)

The Silent Beacon teaches the 41 characters one at a time. E12 is the next step: hearing **whole words**, the way operators do. The epic is [#149](https://github.com/Adamzvulun/Liron/issues/149) and the word lists are in [`content/morse/words.json`](../../content/morse/words.json) (#153).

*Written 2026-11-09 while Adam slept. The choices below are Claude's, made as Adam would likely make them, and are marked "my choice" where no source settles them. Adam can change any of them.*

## The short version (for Adam)
- **Three kinds of words**, all heard and never spelled out as dots and dashes:
  - **common English words** (170, most frequent first)
  - **operator shorthand**: 16 Q-codes (QTH, QSL, QRS…) and 38 abbreviations (CQ, DE, TU, 73, 5NN, FB…), each with its meaning
  - **4 prosigns**: AR, SK, BT and KN, each sent as one sound with no gap inside
- **A word only comes up once you know all its letters.** After chapter I (8 characters), 20 words are open; after chapter II, 57; with all 41 characters, all 228.
- **The Codebook, a reading stand in the tower hall, opens after the Gatekeeper** (chapter I’s trial). My choice: it gives the first trial a reward you can hear, and by then there are 20 words to work with.
- **Head copy:** a word plays once, then you type it. You get no feedback while it plays. You can ask for **AGN** (again) once, but a word you needed to hear twice counts as half right.
- **A round is 10 words.** Words you got wrong or that are due in spaced repetition come first. Up to 3 new words join each round, in frequency order.
- **Q-codes and abbreviations show their meaning after you answer**, so you learn the language of the radio, not just the sound.
- **The callsign rush is the Codebook’s second drill. It opens once you have a digit** (5, in chapter III), because every real callsign has one. Callsigns start at 20 wpm. Each one you copy makes the next 2 wpm faster, and each miss makes it 2 wpm slower. Your best speed is kept.

## Why words now
- Koch's method builds instant recognition of single characters. The next step is recognizing common words as one sound, which is what "head copy" means. CWops' CW Academy teaches it as the way to conversation speed.
- The Signal Tower's later ranks (discovery 04: Telegraphist, Signal Master) and the radio QSO (E16) both need it. A QSO is mostly shorthand: `CQ CQ DE …`, `UR RST 599`, `NAME …`, `QTH …`, `TU 73`.

## The lists (#153)
| Kind | Count | Example | Notes |
|---|---|---|---|
| Common word | 170 | THE, OF, AND… | Most frequent English words, in rough frequency order (`rank`), plus a few tower words (LAMP, TOWER, SIGNAL, RADIO) |
| Q-code | 16 | QTH: my location is… | ITU Q-codes as radio amateurs use them (ITU-R M.1172) |
| Abbreviation | 38 | FB: fine business, excellent | Common operator shorthand |
| Prosign | 4 | AR: end of message | Codes from ITU-R M.1677. Shown as `<AR>`. BT sounds the same as `=`, which Koch already teaches |

- The list is **our own**. A word's frequency rank is a fact, and the Q-codes and prosigns are an international standard, so nothing here is copied from a protected source (ADR 0008).
- Every item has a stable id: `word:the`, `abbr:qth`, `prosign:ar`.
- **When a word opens:** all of its characters are unlocked in the Koch path. A prosign opens when the letters that name it are unlocked (A and R for AR).

## Prosigns in the engine (#155)
- In text, a prosign is written in angle brackets: `CQ DE K1ABC <AR>`.
- The engine plays its code as one character, so there's no letter gap inside it. It is shown as `<AR>`.
- The send decoder reads `.-.-.` as `<AR>`, `...-.-` as `<SK>` and `-.--.` as `<KN>`. `-...-` stays `=`, as Koch taught it.

## The word drill (#154)
1. A word plays at your character speed (20 wpm to start; the dial in the Signal Tower sets 18–20 now, more as the ladder opens (12.2)) with your current Farnsworth spacing (ADR 0009). Since a single word has no gaps between words, only the letter gaps stretch.
2. Once the sound ends, type the word and press Enter (or tap the letter buttons on a phone). Nothing is marked while it plays.
3. **AGN** replays it once. A word copied right after AGN scores 0.5.
4. After you answer, you see what played. For Q-codes, abbreviations and prosigns, you also see the meaning.
5. The round's results:
   - each word is a spaced-repetition review: right is Good, right after AGN is Hard, wrong is Again
   - each word is a result in the `head-copy` rating skill (Glicko-2, ADR 0024), with common words seeded easier than shorthand (my choice: rank 1–50 at 900, the others at 1000, Q-codes and prosigns at 1100)
   - XP is 2 per right word, so a round of 10 takes about 1.5 minutes and pays about 10 XP a minute (economy guideline)
   - session events `words-round`, and `words-perfect` for 10 out of 10, which the daily contracts "Play 2 Codebook rounds" and "Copy a whole Codebook round right" count

## The callsign rush (#156)
- A run of 25 made-up callsigns, each played once. The shape is a real one, using only your unlocked characters: a 1–2 character prefix, a digit, then 1–3 letters, such as `K5AT`, `MI2RK`, `9A5WE`.
- It starts at 20 wpm, as a standard-spacing word (no Farnsworth: the rush is about speed). Each callsign copied right makes the next 2 wpm faster, and each miss makes it 2 wpm slower, never below 15. The cap is 50 wpm.
- **Score:** the sum of the wpm of each callsign copied right. You keep your best score and your top speed. Being fast and accurate scores most; the genre's classic is RufzXP.
- This is the drill behind the daily contract "Copy 3 callsigns above your speed" (discovery 04). It sends `rush-round`, `rush-best` (a new best score) and `rush-fast` (one per call copied above your lesson speed: 20 wpm to start; the dial in the Signal Tower sets 18–20 now, more as the ladder opens (12.2)) events. Callsigns are made up, so they aren’t rated or reviewed.
- **Contracts** (my choice of targets and gold): the Codebook's two and the rush's two ("Finish a callsign rush", "Copy 3 callsigns above your speed") are offered only once you've played that drill on an earlier day, so a locked drill never gives you a contract.
- The made-up callsigns can match real ones by chance. That's harmless: we never send anything.

## Not in E12 (kept for later, not dropped)
- Sentences and short QSO exchanges come with E16 (radio QSO).
- ~~Sending words with the key follows the send drill (E7) once the word drill exists.~~ **Built (2026-11-11):** the telegraph table offers "Key 5 words" once five of the 200 commonest words (2 to 5 letters) use only letters you've learned, which is about the eighth letter. It is scored, rated and paid like a letter drill, and the result also says how many words the tower read (`keyableWords`, `wordDrillText` in `send/drill.ts`).
