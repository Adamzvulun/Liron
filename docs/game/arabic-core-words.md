# Arabic core words (E11)

- **Status:** drafted by Claude on the night of 2026-11-09, while Adam slept. He had said to keep going and make the calls he'd make. Every "my choice" below is his to change.
- **Epic:** [#150](https://github.com/Adamzvulun/Liron/issues/150), the second M3 sprint, after E12.

## The short version
- **The word path opens after the script course.** It starts once you pass "The Painted Sign" (chapter 1 of "The Long Road In"), when every letter is yours.
- **The first 300 words come from the deck's A1 words and verbs, in 10 chapters of 30, grouped by topic.** The most useful topics come first: greetings and people, then questions and family. Words 301–1,000 come later in E11: the rest of A1, then A2.
- **Each word is met with its native recording, its meaning, how it sounds in Hebrew letters, and a deck sentence when the deck has one.** The deck has few sentences, so this is the main open question (section 3).
- **Practice is the same four moves as the letters:** meet, listen, read, recall. FSRS schedules each word, and Glicko rates you in listen and read.
- **Each chapter brings a new regular to the innkeeper's table** ("The Long Road In" chapter 2 onward), with a trial at its end.
- **Grammar comes as short cards when a chapter needs it** (e.g. "no word for *is*" with the first sentences). They are built from the Madrasa beginners course's order and the deck's sentences, and every rule is checked against a free reference.

## 1. What the deck gives us (measured 2026-11-09)
The deck's own level tags (Lingualism's suggested CEFR levels, not an official list):

| Level | Items | Single words |
|---|---|---|
| A1 | 1,394 | 831 |
| A2 | 1,528 | 707 |
| B1 | 1,779 | |
| B2 | 122 | |

- Single words: the Arabic is one word, not counting a plural given in brackets.
- The other items are phrases ("dark brown hair"), verb pairs and sentences.
- **Sentences:** only **492** items in the whole deck are real sentences (3 words or more, with an end mark), e.g. "أنا عايِش في غزّة." (I live in Gaza.).
- **A1 verbs:** 151 items start with "to", 90 of them a plain past/present pair (شاف، يْشوف); the rest are phrases ("to wash one's face").
- **Of the 831 A1 words, 229 appear as they are in one of those sentences.** About 140 more appear with a prefix or suffix attached (a rough count).

## 2. Which words, in what order (#159)
- **The first 300:** A1 single words and verbs, picked by hand from the deck in topic chapters. A verb is learned as the deck gives it, past and present together (شاف، يْشوف *he saw, he sees*); the deck has 90 such A1 verbs. My choice of order puts the words you need to talk first:

| Chapter | Theme | Deck sections it draws on |
|---|---|---|
| 1 | Hello, me and you | Social Expressions, Pronouns, Names and Addressing People |
| 2 | Who, what, where | Question Words, Family |
| 3 | Counting the day | Numbers, Time |
| 4 | At the table | Food and Drink, Restaurant |
| 5 | Under one roof | The House |
| 6 | Out the gate | Getting Around, Around Town, Travel |
| 7 | Faces and hands | The Human Body & Describing People, Colors |
| 8 | Buying and selling | Shopping, Money |
| 9 | A day's work | Work, School and Education |
| 10 | Sun, wind and heart | Weather, Feelings, Likes and Dislikes |

- **Small words travel with every chapter:** prepositions, conjunctions, adverbs, common adjectives and verbs are spread across the chapters where they're needed, not saved for one chapter each.
- **Within a chapter, words that appear in a deck sentence go first,** so more of the 300 come with a sentence (my choice).
- **Glosses are ours:** the list stores each deck id with our own English gloss, as `content/arabic/lesson-words.json` does (#125). The Arabic and the audio stay in Supabase behind login (ADR 0011).
- **Left out, with a reason each,** as in #125: rude or adult words, near-duplicates, words that are mostly B-level in use.
- **Words 301–1,000:** the rest of A1, then A2, in the same kind of chapters. That's later in E11 (#163); it's ordered, not cut.

## 3. Sentences: the open question
The epic says "each shown in a sentence with audio". The deck can do that for about a third of the first 300 words. The choices:

1. **Deck sentence when there is one, the word alone otherwise** (my choice for now). Everything you hear is a native speaker. No new source and nothing to buy.
2. **Our own sentences for the rest, as text only.** They would be written by Claude and checked against the deck and the free references (ADR 0012), with no audio. The browser's Arabic voices aren't Palestinian, so I'd rather leave them silent.
3. **Our own sentences with recorded audio:** this needs a speaker, and none is available.

I build option 1 and keep option 2 ready as a follow-up (#164). Micro-stories made only of words you know come in a later epic (vision, Arabic track).

## 4. A word lesson (#160)
- **Where:** a new station in the courtyard, the innkeeper's table (my choice). It's locked until "The Painted Sign" is passed.
- **A session is 12 words:** due words first, then up to 5 new words from your chapter, then words you know (my choice, like the Codebook).
- **Meet**, for each new word: the Arabic with its marks, the native recording, our gloss, the sound in Hebrew letters, and the deck sentence if there is one.
- **Practice**, mixed:
  - **Listen:** hear the word, pick its meaning from 4.
  - **Read:** see the word, pick its meaning from 4. Vowel marks fade as in the letter lessons.
  - **Recall:** see the meaning, pick the Arabic from 4, then hear it.
- **Saving (ADR 0031):**
  - each word is an FSRS item `word:pcav:<n>`: right first time is Good, right after a miss is Hard, wrong is Again;
  - each answer is a result in the `listen` or `read` skill, so word practice moves the same ratings as the letters;
  - XP is about 10 a minute (economy);
  - events `word-session`, and `word-90` for 90% or better, for daily contracts.
- **The chapter gate:** like the letters, 90% in two sessions in a row, the second on a later day. Then the next chapter's words start coming.

## 5. The regulars ("The Long Road In", chapter 2 onward) (#161)
- After the Painted Sign, you're a guest. Each word chapter brings someone new to sit at the innkeeper's table: a carter, the baker's daughter, a schoolteacher, a spice seller and so on.
- Each one has an opening beat, milestones along the chapter, and a trial at its end: 30 of the chapter's words at 90%, like "The Painted Sign".
- The trial passed gives XP and a brass chest (ADR 0033), and the regular stays at the table.

## 6. Grammar cards (#162)
- **Just in time:** a card appears before the first practice that needs it, and stays in a small grammar book at the station.
- **Order:** the Madrasa "ערבית מדוברת: מתחילים" structure is a reference only (ADR 0012); Zaytuna and Learn Levantine are free cross-checks. Each card shows one or two deck sentences with their audio.
- **First cards (my draft):** no word for *is* in the present (ch. 1); possessive endings -i, -ak, -ik (ch. 2); numbers and counting nouns (ch. 3); the article il- and the sun letters (ch. 4).
- **Every rule is checked against a reputable source before it ships,** and anything uncertain is flagged to Adam (ADR 0012, point 5).

## 7. Not in E11's first pass (kept, not dropped)
- Words 301–1,000 (#163).
- Our own sentences without audio (#164, option 2 above).
- Speaking the word into the mic (E14, mic practice).
- Root and pattern badges (the Hebrew bridge, ADR 0002).
