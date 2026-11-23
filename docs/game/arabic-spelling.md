# Writing words: *Spell it* at the slate (Phase 14)

- **Status:** Planned (2026-11-23), not built. Research: [next-work-2026-11-23.md](../research/next-work-2026-11-23.md), Part 2, A4.
- **Epic:** Phase 14 in [PLAN.md](../process/PLAN.md).

## Why

- **The vision.** It asks for "basic speech, reading, and writing".
- **What there is today.** The slate teaches single letters, by tracing and then from memory. Nothing asks you to write a word.
- **The earlier objection.** [arabic-script-lessons.md](arabic-script-lessons.md) §5 says typing a word from its recording "can't be checked fairly", because the dialect leaves short vowels unwritten and ة sounds like ه.
- **Why this is fair.** Checking only the letters, with the marks dropped and ة/ه and the alef forms joined, is fair. It's how a message is actually written. The tales checker already does exactly this normalizing.

## What it is

1. **Spell it**, a second practice at the slate. It opens once all the letters are met. A round is 8 taught words. Each one goes like this:
   - you hear the word and see its meaning;
   - you type it on the on-screen Arabic keyboard from the inn (`chat/LineInput.tsx`), or on your own keyboard;
   - it's checked on the letters: marks dropped, ة = ه, أ إ آ = ا, ى = ي;
   - after a wrong try, the right spelling is shown letter by letter, with your wrong letters marked;
   - a second wrong try shows it in full.
2. **Writing at the inn.** Once you've passed 3 *Spell it* rounds at 80%, Sit and talk opens on the Arabic keyboard, not the Hebrew letters. Hebrew letters stay one tap away, and the choice is saved as it is now.

## Requirements (EARS)

1. The slate shall offer *Spell it* once every letter has been met.
2. When a round starts, the system shall choose 8 taught words: due ones first (FSRS item `spell:pcav:<n>`), then new, then known.
3. When the player submits, the system shall compare the letters only, after the normalizing above.
4. When the spelling is right first time, the review shall be Good. Right on the second try is Hard. Otherwise it's Again. Each answer is a result in the `write` skill.
5. The events shall be `spell-round` and `spell-90`, with one daily contract ("Spell 2 rounds at the slate", 15 gold).
6. When a player has passed 3 rounds at 80%, the inn shall default to the Arabic keyboard, unless they chose Hebrew letters before.
7. Deck words shall be stored by id only (ADR 0011). Friends without the deck practice on the lesson words only (`lesson-words.json`).

## Acceptance criteria

- **Given** a player who has met all the letters, **when** they open the slate, **then** *Spell it* is there.
- **Given** the word بيْت, **when** the player types بيت, **then** it's right (marks don't count).
- **Given** مدرسة typed as مدرسه, **then** it's right. **Given** مدرصة, **then** it's wrong, and ص is marked.
- **Given** 3 rounds passed at 80%, **when** the player next opens Sit and talk, **then** the Arabic keyboard is up.
- **Tests:** unit tests for the normalizing and the marking; a browser test of a round on a phone-sized screen.

## Out of scope (kept, not dropped)

- Handwriting whole words (the slate's check is per letter).
- Grading the short vowels.
