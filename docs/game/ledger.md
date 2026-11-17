# The ledger: learning you can see (task 1.6, #314)

A panel in Your House that shows what you have learned, in numbers you can trust. It uses **only data already saved**: the review cards and their log (FSRS, ADR 0022), each subject's saved state, and the daily minutes. Nothing new is tracked.

Every number below is defined exactly, and each definition has a unit test (`src/core/player/ledger.test.ts`, `src/subjects/*/ledger.test.ts`).

## Words used below

- **A card** is one item in spaced repetition (a letter, a word, a Morse character), saved in `review_cards`.
- **Known**: a card whose current interval (FSRS's `scheduled_days`) is **21 days or more**. FSRS only waits three weeks for an item you have recalled several times, so "known" means remembered, not only seen. It can go down again: a forgotten card comes back with a short interval.
- **This week**: the last 7 days including today, counted from now (for reviews) or by the player's local day (for minutes).
- **Met this week**: a card with all of its reviews in this week, because its total review count (`reps`) equals its reviews in `review_log` this week. That means it was seen for the first time this week.

## The habit (every player)

| Line | Definition |
|---|---|
| Days practiced, last 30 | Days among the last 30 (today included) with any minutes in `daily_activity` |
| Minutes this week | The sum of `daily_activity.minutes` over the last 7 days |
| Longest run | The most days in a row with any minutes, ever. This is not the streak in the top bar, which counts days with the daily goal met and lets a shield cover a day. |

## Each road

The compass's own "Step 14 of 74" for each guild (task 1.3). "Finished" when every step is done.

## The Caravanserai (Arabic)

| Line | Definition |
|---|---|
| Letters met | Letters whose introduction you've done, of all the letters |
| Script lessons passed | Lessons before the one you're on, or all when the script is done |
| Words met | Distinct words you've met on the word path (saved state) |
| Words known | Cards whose id starts with `word:` and that are known |
| Word chapters passed | Chapters before the one you're on, or all when the path is done |
| Chats held | Chats with the regulars at the inn |
| Reviews due | Reviews due now, the number the compass uses |

**The trend line:** "This week: 12 new words met, 40 reviews." A week without reviews reads "No reviews this week yet."

## The Signal Tower (Morse)

| Line | Definition |
|---|---|
| Characters learned | Characters unlocked in the Koch lessons, of all of them |
| Copy speed | The lesson speed you've reached (effective words a minute, with the characters at 20) |
| Sending speed | Your fastest sending drill, as words a minute (1200 ÷ the dot's length in ms). "No drill yet" before the first one. |
| Recognition best | Your best Instant Recognition score |
| Contacts logged | Contacts in the Radio Room's logbook |
| Reviews due | Reviews due now |

**The trend line:** "This week: 3 new characters met, 25 reviews."

## Rules

- A new player sees honest zeros ("0 of 28"), never a blank, a dash or "NaN".
- If a subject's numbers can't be read, its block says so in one line and the rest of the ledger still shows.
- It fits a 320-pixel screen, with the house's wood and paper look.
