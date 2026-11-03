# Morse receive lessons (E6)

How the Signal Tower teaches you to hear Morse: the Koch lessons (#31) and how they connect to speed (ADR 0009), spaced repetition (ADR 0022), skill ratings (ADR 0024) and the Instant Recognition game (#32). The letter order and the unlock gate are in [ADR 0028](../decisions/0028-morse-koch-order-and-gate.md).

## The short version (for Adam)
- **You only ever hear Morse and see letters.** No dot-dash charts, no "dah-di-dah" spelled out. That is Koch's core idea and the reason the method works (sound patterns, not counting).
- **Characters always play at 20 wpm.** What slows down for a beginner is the *gap between* characters (Farnsworth). The gap closes by itself as you get better (ADR 0009).
- **A lesson is a few short runs.** One run is 2 minutes of sound, in groups of 5 characters (about 100 characters at 10 wpm overall). You copy what you hear as it plays. A good Morse day is about 10 minutes (3–4 runs); research and practitioners agree that short daily sessions beat long rare ones.
- **A new character unlocks after two runs in a row at 90% or better.** Two runs are about 4 minutes of copy, close to the 5 minutes of continuous copy that older Koch guides use as the test.
- **When a character is new, you meet it first:** it plays three times with its letter shown big, then a 20-second "this one or that one?" drill against characters you already know. Then it joins the runs.
- **Weak characters come up more often.** Each character's accuracy and its spaced-repetition record decide how often it appears. Nothing you've unlocked ever disappears from the mix.
- **On a phone you tap big buttons**, one for each unlocked character. On a computer you type.
- **We measure from day one:** accuracy per character, minutes practised, characters unlocked, and the effective speed. The M2 retro answers "is it teaching Adam?" with these numbers.

### Where I had to choose without a source
I checked; these points aren't settled by research I could find, so they're my choices, marked so we can revisit them with real numbers:
- **Two runs in a row** (rather than one test, or three). One 2-minute run is shorter than Koch's 5-minute test, so one run alone is too easy to pass by luck. Three felt slow for a game; one learner's rule of thumb uses three.
- **The new character appears more often** (about 1 in 4 characters in its first lessons). I found no source that confirms or rejects this.
- **The meeting drill** for a new character. Koch tools usually just add the character to the random mix. A short introduction fits a game better and still uses sound only.
- **The Farnsworth steps** (below). ADR 0009 says "automatic"; the step sizes are mine.

## A lesson, step by step
1. **Warm-up (returning players).** If you've been away a day or more, the first run uses only characters you already have, with the ones due in spaced repetition weighted up. It can't unlock anything; it gets your ear back.
2. **Meet the new character** (only the first time it appears). It plays three times with the letter shown large. Then 10 quick "which was it?" choices between it and two characters you know, with an instant replay when you miss.
3. **Runs.** 2 minutes of sound in groups of 5, from all unlocked characters. You type or tap as you hear. A character you don't catch can be skipped (space on a keyboard, the "?" button on a phone). Guessing is fine.
4. **After each run:** your score, a side-by-side of what played and what you copied, and replay buttons for every miss. If you passed the gate, the next character is announced and the meeting starts.

## Scoring and the gate
- **Per character, like LCWO.** What you copied is aligned to what played (edit distance), so one missed character doesn't shift the rest out of line. Each played character counts as right or wrong.
- **Run accuracy** = right ÷ played.
- **Gate:** two runs in a row at ≥ 90% unlocks the next character (ADR 0028).
- **No going backwards.** A bad day never re-locks a character. Low accuracy slows the gaps instead (below).

## Speed (Farnsworth, ADR 0009)
- Character speed: 20 wpm, fixed (you can raise it later in settings; it never drops below 18).
- Effective speed starts at **10 wpm** and changes after each run:
  - ≥ 95%: up 1 wpm
  - 85–95%: unchanged
  - < 85%: down 1 wpm
  - Bounds: 6 wpm up to the character speed (then there's no extra gap at all).
- A new character doesn't reset the speed. Accuracy dips when it joins and recovers; that's expected in Koch training.

## Choosing characters (FSRS and ratings)
- **The Koch gate decides what's unlocked. FSRS only decides the mix.** Every run includes all unlocked characters, so spaced repetition never hides one.
- Each character's weight in a run comes from: its FSRS due date (overdue weighs more), its recent accuracy (weak weighs more), and the new-character boost. No character goes below a small floor, so all of them keep coming.
- **After each run, every character that played is recorded:**
  - **FSRS** (`recordReview`, item `char:K` etc.): *Again* if missed at least once, *Good* if always right, *Easy* if always right at the fastest speed you've reached.
  - **Receive rating** (`recordResult('receive', 'char:K', score)`): the score is that character's accuracy in the run (0 to 1).
- **Instant Recognition (#32)** uses the same items: one character plays, you press it, and your reaction time joins the score. It rates items (Glicko) and favours the slow ones.

## Input
- **Computer:** type the letter. Space skips one you missed.
- **Phone:** a grid of big buttons, one per unlocked character, always in Koch order so their places don't move. 48 px or larger, the same tap-target size as elsewhere. Plus a "?" skip button.
- iOS mutes Web Audio when the silent switch is on. Deferred (Adam, 2026-11-03); it belongs with #30 later.

## Sound engine (#30)
`src/subjects/morse/player.ts` plays text as Morse; `timing.ts` holds the maths.
- **Timing:** PARIS standard (a dit lasts 1.2 ÷ wpm seconds). Farnsworth gaps use the ARRL formula (Jon Bloom, KE3Z, QEX 1990): only the gaps between characters and words stretch, in a 3:7 ratio.
- **Accuracy:** every key-down is scheduled on the audio clock, not with timers. Measured in Chromium (offline render, 2026-11-03), every tone started within the 2 ms measuring window of its planned time.
- **No clicks:** each key-down rises and falls over 5 ms.
- **Settings:** character speed, effective speed, pitch (default 600 Hz) and volume.
- **Browsers:** sound starts only from a tap or click (`unlock()` or `play()` in the handler). Android Chrome uses the same engine as desktop Chrome. It has not been tried on a real phone yet; that happens when Adam tries the first lesson.
- **Later (E16):** `route` lets noise, fading and interference sit between the tone and the speakers. Nothing is built for it yet.

## What we record (measuring learning)
Per run: date and time, length, characters played, accuracy overall and per character, effective speed, and whether it passed. From these:
- characters unlocked over time
- accuracy per character (and which ones are weak)
- minutes of Morse practice per day (`recordPractice`)
- effective speed over time

XP follows the economy guideline (about 10 XP per minute): a run pays about 1 XP per 5 characters copied right (about 18 XP for a good 2-minute run), plus a bonus for unlocking a character.

## Quests and rewards (E10): where they go
**My recommendation: E10 is its own sprint, after the Arabic sprint.** Reasoning:
- **It fits the sprint rule.** Quests, chests and the Market belong to the whole city, not to Morse or Arabic. Building them inside the Morse sprint would mix themes.
- **Rewards should reward learning, so the learning comes first.** Daily contracts like "pass a Koch run at 90%" or "practise Arabic 15 minutes" need both subjects to exist; built earlier, they'd be rebuilt.
- **The habit loop already exists.** M1 gave us XP, levels, gold, the streak and the daily goal. That's enough motivation for the first playable release, and the extra layer can be tuned with real data on what Adam actually does.
- **What stays in the subject sprints:** each subject's story (#34 "The Silent Beacon" ch. 1–2 is Morse content), and each lesson reports simple events (run passed, character unlocked, minutes) so E10 can hook into them later without changes.

## Sources
- [Koch 1936, executive summary (Long Island CW Club)](https://longislandcwclub.org/wp-content/uploads/2022/11/EXECUTIVE-SUMMARY-KOCH-1936.pdf): start with two distinct sounds; 90%; sound, not charts.
- [LCWO forum: lesson scoring](https://lcwo.net/forum/2656/Lessons-and-code-group-scoring-system-flawed): Koch lessons are scored per character.
- [LCWO forum: when to move on](https://lcwo.net/forum/2140/Whats-a-good-strategy): one learner moves on after three tests in a row above 90%.
- [The Koch method (KB5WCK)](https://www.qsl.net/kb5wck/morse-.html): random groups; accuracy dips and recovers after each new character; ~5 minutes of continuous copy as the test.
- [Morserino help](https://om0rx.com/morserino/help.html): 15–20 minutes daily beats long, rare sessions.
- [Radiopreppers Koch course](https://radiopreppers.com/index.php/topic,1355.0.html): 5-minute lessons.
- [LCWO / CW Academy ICR guidelines](https://cwa.cwops.org/wp-content/uploads/LCWO-ICR-Guidelines-1.6-CA.pdf): keep characters at 20 wpm, adjust Farnsworth spacing.
- Earlier research: [ADR 0009](../decisions/0009-morse-speed-policy.md), [fact-check 2026-11-01](../research/fact-check-2026-11-01.md).
