# Hearing the street: sentence listening in the echo well (Phase 11)

- **Status:** Planned (2026-11-23), not built. Research: [next-work-2026-11-23.md](../research/next-work-2026-11-23.md) §2.
- **Epic:** Phase 11 in [PLAN.md](../process/PLAN.md).

## Why

- **The goal.** The first one in the vision is to *understand* the Arabic spoken around Adam.
- **What there is today.** Every listening drill is a sound or a single word. The one sentence practice, shadowing, shows the text and lets you judge yourself.
- **What's missing.** No practice asks: you heard a sentence with no text in front of you, so what did it say?
- **What the deck offers.** 536 sentences of four words or more, each recorded by a native speaker. The word path already uses 241 of them.

## What it is

A fifth practice in the **echo well**, after hear the difference, shadowing, record and compare, and did it understand you: **Hear it** (my call, the plainest name).

A round is **8 sentences**. Each one goes like this:

1. **Hear.** The recording plays. There's no text. You can replay it as often as you like, and play it at **0.75× speed** (the browser's `playbackRate`, so the pitch stays the same).
2. **Pick the meaning** from 4 English meanings. The wrong three are meanings of other sentences from your chapters.
3. **Put it together.** A word bank holds the sentence's words shuffled, plus 2 spare words from your chapters. Tap them in the order you heard them. That trains word segmentation, telling where one word ends and the next begins. There's no typing, so it works the same on a phone.
4. **See it.** The sentence appears with its Arabic, Hebrew letters, Latin and English, and you can play it again.

**Which sentences:**
- deck sentences of 3 to 10 words;
- whose words are all taught by your chapter;
- due sentences first (FSRS), then new ones, then known ones;
- the same sentences the echo well and word path use. The pool grows past the 241 the word path uses, taking deck sentences from the chapters you've reached.

## Requirements (EARS)

1. The echo well shall offer *Hear it* once the player has passed the word path's first chapter.
2. When a round starts, the system shall choose 8 deck sentences whose words are all taught by the player's chapter: due ones first, then new, then known.
3. While a sentence is being asked, the system shall show no Arabic text until the player has answered both parts.
4. When the player taps *Slower*, the system shall replay the recording at 0.75× without changing its pitch.
5. When the player picks a meaning, the system shall mark it right or wrong at once, then show the word bank.
6. When the player has placed every word, the system shall mark each word in or out of place and show the sentence in full.
7. Each sentence shall be an FSRS item `hear:pcav:<n>`. Both parts right is Good, one part right is Hard, neither is Again.
8. Each answer shall count as a result in the `listen` skill, so it moves the listening rating.
9. When a round ends, the system shall send the event `hear-round`, and `hear-90` at 90% or better. The daily contract "Hear 2 rounds at the echo well" (15 gold) shall be offered once the player has finished a round on an earlier day.
10. Where the player has no deck (ADR 0050), the system shall show *Hear it* closed, with the same line as the other deck stations.
11. The content shall hold deck ids only, never a deck sentence's text (ADR 0011).

## Acceptance criteria

- **Given** a player past chapter 1, **when** they open the echo well, **then** *Hear it* is there. A player in chapter 1 sees it locked, with the line that says when it opens.
- **Given** a round, **when** the first sentence plays, **then** no Arabic is on the screen. *Again* and *Slower* both play it.
- **Given** the meaning is right and every word is in place, **when** the sentence is shown, **then** its review is saved as Good and the `listen` rating rises.
- **Given** a player without the deck, **when** they open the echo well, **then** *Hear it* is closed with the deck line.
- **Tests:**
  - unit tests for choosing the sentences, building the word bank and grading;
  - one browser test of a whole round on a phone-sized screen;
  - a content test that no deck text is in `content/`.

## Errors and edge cases

| Case | What happens |
|---|---|
| The recording fails to load | "This one won't play", then skip it. The round goes on with 7, and the skip isn't graded. |
| Fewer than 8 sentences qualify | The round has as many as qualify. With fewer than 4 it stays locked, with a line saying why. |
| The same word twice in a sentence | Either copy fits either place. |
| The player leaves mid-round | Nothing is saved for unanswered sentences (ADR 0031: one save per session). |

## Out of scope (kept, not dropped)

- Typed dictation. It needs an Arabic keyboard, and the research is mixed.
- Our own sentences and the tales, which have no recordings. They can join once the regulars' voices exist (#342).
- Listening at full conversation speed, as in the café (that's the AI regulars' work).
