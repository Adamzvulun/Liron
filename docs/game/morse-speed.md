# Faster than thought: Morse past 20 wpm (Phase 12)

- **Status:** Planned (2026-11-23). 12.1 built: the speed model and the tower's dial. 12.2 built: the speed ladder (two days at 90%, standard spacing, at the top open speed; the title Ghost at 25 and the brass metronome at 30; the dial and the ledger show it; `ladder-rung`, `ladder-25` and `trial-ladder-30` events). 12.3 built: The Long Copy, a third Codebook drill (`content/morse/longcopy.json`; opens with all characters learned; a line of 9 or 11 words from the open Radio Room operators; below 28 wpm one extra hearing for half credit; from 28 wpm once, typed copy graded on the words in order; a `long-copy` result per speed in the head-copy skill; event `long-copy-round` and the contract “A Long Copy at your speed”). 12.4 built: the Radio Room operators key at their own speed plus how far yours is over 20 (`opWpm`), the room list, the turn line and the Signal Master check show that speed; the Far Station and Forty Winters stay at their fixed 20, as set pieces; the timing test already covers 30 and 35 wpm. Keeps [ADR 0009](../decisions/0009-morse-speed-policy.md)'s promise ("user can raise it to 25+", "manual override ... for all of the above"). Research: [next-work-2026-11-23.md](../research/next-work-2026-11-23.md) §1.
- **Epic:** Phase 12 in [PLAN.md](../process/PLAN.md).

## Why

- **The goal.** Adam's Morse goal is to copy without thinking.
- **Where the game stops.** Every lesson, drill and trial plays at 20 wpm (`CHAR_WPM`). Once your Farnsworth spacing reaches 20, nothing gets faster except the callsign rush.
- **Where real courses go.** CW Academy's Intermediate course aims at 20 wpm or more, with practice up to 25 and QSOs up to 30. Its Advanced course goes past 30, with head copy of longer exchanges and "copying behind".

## What it is

1. **Your speed, at the Signal Tower.** A speed dial in the tower's hall, not in Your House's Settings, since a subject keeps its own settings (ADR 0003). The character speed can be 18, 20, 22, 25, 28 or 30 wpm. It's set automatically, with a manual override, as ADR 0009 says:
   - every lesson, Instant Recognition, the Codebook and the trials play at it;
   - the Farnsworth spacing stays automatic below it;
   - the override may go down to 18 at any time (ADR 0009's floor), but only up to the highest speed the ladder has opened (requirement 1).
2. **The speed ladder.** It's a new line on the Signal Tower's road after Forty Winters, so it's part of the long evenings and the road's 75 steps stay as they are. It has five rungs:
   - the rungs are 22, 25, 28, 30 and 35 wpm;
   - each rung opens when you copy at 90% with standard spacing at the rung below, in two sessions on different days. That's Koch's gate, as in the lessons;
   - passing a rung raises your automatic speed to it, and gives a title at 25 (**Ghost**, from the road's own legend of the operator who becomes only a rhythm) and gear at 30.
3. **Head copy, then copy behind.** A new Codebook drill, **The Long Copy**:
   - it plays a QSO-like line of 6 to 12 words at your speed (callsign, name, town, weather, rig, all from the Radio Room's operators);
   - then it asks 3 questions about it ("Where is he?", "His name?"), with 4 choices each;
   - from 28 wpm the line plays once only, and you type it as you go, one word behind: that's *copy behind*;
   - Head copy is graded on the answers, copy behind on the words.
4. **The operators follow.** The Radio Room's operators, as ADR 0009 says, answer near your sending speed. Every listening turn, and the reading speed of your keyed turns, now play at your character speed, not the fixed 20.

## Requirements (EARS)

1. The Signal Tower's speed dial shall offer a character speed of 18 to 30 wpm. A speed above 20 shall be offered only once the ladder has opened it.
2. While the player's speed is above 20 wpm, every lesson, Instant Recognition round, Codebook drill and rank trial shall play at it.
3. When a player passes 90% with standard spacing at their speed in two sessions on different days, the system shall open the next rung.
4. When a rung opens, the system shall raise the automatic speed to it, unless the player has a manual override.
5. The ladder shall stay locked until Forty Winters is passed.
6. When *The Long Copy* plays, the system shall show nothing until the line has finished. Then it shall ask 3 questions with 4 choices each.
7. Where the player's speed is 28 wpm or more, *The Long Copy* shall play once only and take typed copy.
8. The rank trials shall be graded as now. Only their speed follows the setting. Exception: the Far Station and Forty Winters are set pieces at 20 wpm (#510).
9. The events `ladder-rung` and `long-copy-round` shall be sent, with one daily contract ("A Long Copy at your speed", 20 gold).
10. Saved progress shall keep the speed and the rungs. An old save with neither shall read as 20 wpm with no rungs.

## Acceptance criteria

- **Given** a player who has passed Forty Winters, **when** they copy at 90% with standard spacing at 20 wpm on two different days, **then** the 22 wpm rung opens and their lessons play at 22.
- **Given** a player with a manual override of 20, **when** a rung opens, **then** their speed stays at 20 and the dial shows the higher speed as available.
- **Given** an old save, **when** it loads, **then** everything plays at 20 wpm, as before.
- **Given** *The Long Copy* at 25 wpm, **when** the line ends, **then** 3 questions appear. Answering them saves a `long-copy` result in the copy skill.
- **Tests:**
  - unit tests for the speed model, the rung gate and the line builder;
  - a browser test of the speed dial and of one Long Copy round;
  - the timing check still passes at 30 wpm.

## Errors and edge cases

| Case | What happens |
|---|---|
| The player lowers their speed after a rung | Allowed (down to 18). The rungs already open stay open. |
| The audio can't keep up at 35 wpm on a slow phone | The timing test covers 35 wpm on the phone profile. If it fails, the top rung is 30 on that device, and the doc says so. |
| A friend's wire QSO | Unchanged: the wire plays what the friend keyed. |

## Out of scope (kept, not dropped)

- Speeds over 35 wpm except in the callsign rush.
- Contest-style runs.
- Sending speed. Your key's speed is measured already, and the QSO matches it (ADR 0009).
