# The milestone check: learning against your own goals (13.3)

- **Status:** Planned (2026-11-23), not built. Research: [next-work-2026-11-23.md](../research/next-work-2026-11-23.md), Part 2, A3.
- **Epic:** Phase 13 in [PLAN.md](../process/PLAN.md).

## Why

- **What the ledger shows.** Activity: cards known, minutes, steps.
- **What the vision's goals are.** Abilities: *understand and speak the Arabic around you*, and *copy Morse without thinking*.
- **What's missing.** Nothing checks the second against the first.
- **The standard way to describe them.** The CEFR self-assessment grid, in can-do statements (listening, spoken interaction, reading, writing). We write our own statements in its spirit, for Palestinian Arabic and for Morse. We don't copy its text.

## What it is

Once every 4 weeks, the compass offers **The milestone check**, in Your House, next to the ledger. It takes about 5 minutes and is optional.

1. **Can you?** Six statements per subject, each answered *not yet*, *with help* or *yes*. Arabic examples:
   - "I can follow a slow, simple sentence about someone's family."
   - "I can order food and pay."
   - "I can read a shop sign."

   Morse examples:
   - "I can copy a callsign at 20 wpm."
   - "I can follow a QSO's name and town by ear."
2. **Show it.** A short fixed probe that shows where you are right now:
   - **Arabic:** 6 *Hear it* sentences and 6 Read words, chosen at random from the chapters you've passed.
   - **Morse:** one Long Copy at your speed, once Phase 12 is built. Before that, 10 characters at 20 wpm.
3. **The line over time.** The ledger draws each check as a point: your can-do answers and your probe score. You see the trend from month to month.

## Requirements (EARS)

1. When 28 days have passed since the last check (or since the first finished chapter), the compass shall offer the milestone check once. It shall not offer it again for 7 days if skipped.
2. The check shall save one row per subject: the date, the six answers and the probe's score. It's the player's own row, under RLS.
3. The ledger shall show every saved check as a point, with the can-do answers next to it.
4. The probe shall not change any review or rating. It's a measurement, not practice.
5. The statements shall be our own words, in American English, stored in `content/`.
6. When the check is done, the system shall send `milestone-check`, with no reward beyond a small one-time chest. Measuring shouldn't be farmed.

## Acceptance criteria

- **Given** a player 28 days past their last check, **when** they open the square, **then** the compass offers the milestone check.
- **Given** a finished check, **when** they open the ledger, **then** a new point is shown, and no review card has changed.
- **Tests:** unit tests for the schedule and the scoring; a database test for the row and its RLS; a browser test of one check.
