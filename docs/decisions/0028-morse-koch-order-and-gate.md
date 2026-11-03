# 0028 — Morse letters come in Koch order, unlocked by a 90% gate

- **Status:** Accepted
- **Date:** 2026-11-03

## Context
Before building the Koch lessons (#31), Adam asked why they start with K and M rather than with E and I, the two shortest letters. We had to settle two things: the order in which characters are taught, and the rule that unlocks the next one.

## Research (2026-11-03)
- **Koch (1936)** said to start with two sounds that are clearly different, such as K and M, and to add a character once you copy at about 90%. He taught by sound only, never from a dot-dash chart. His report gives no full order. The order K M U R E S N A P T L W I . J Z = F O Y , V G 5 / Q 9 2 H 3 8 B ? 4 7 C 1 D 6 0 X comes from G4FON's trainer and LCWO, which most Koch tools copy.
- **E, I, S and H are all dits** (1 to 4 of them). Learning them side by side pushes you to *count* dits, which is the habit Koch training exists to avoid (the "counting plateau" at about 7–10 wpm, ADR 0009). The Koch order spreads them out: E is 5th, S 6th, I 13th, H 34th.
- **CW Academy** starts with T, E, A and N, a different and also respected order. Some instructors say the order matters less than the speed.
- **LCWO scores per character:** a missed character in a group counts against that character only, not the whole group.
- **Moving on:** about 90% is the common guideline (not a universal rule). Some learners move on only after several tests in a row at 90% or more. Older guides use about 5 minutes of continuous copy as the test.

Sources are in [the lesson design](../game/morse-lessons.md#sources).

## Options considered
1. **Koch / LCWO order (K, M first).** Has the most tools and courses behind it, and keeps the look-alike dit letters apart. Starting letters are longer than E and I.
2. **CW Academy (T, E, A, N first).** Short, common letters early, so real words come sooner. Fewer self-study tools use it.
3. **E and I first.** The easiest letters to send, but both are only dits, so it invites counting.

## Decision
**Option 1 (Adam, 2026-11-03: "A").** We keep the order already stored in `content/morse/characters.json`.

**The gate:**
- Accuracy is scored per character.
- The next character unlocks after **two runs in a row at 90% or better**.
- One run is 50 characters, so two runs are about the length of Koch's 5-minute test.
- The details are in [the lesson design](../game/morse-lessons.md).

## Consequences
- #31's acceptance criteria stand as written (they already say K and M).
- The order lives in the content file, not in code, so it could change later without a rebuild of the lessons logic.
- Real words come late (the first vowel-rich mix arrives around lesson 7). E12 (words and head copy, M3) fills that gap.
