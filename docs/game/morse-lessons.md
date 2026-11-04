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
  - **FSRS** (`recordReview`, item `char:K` etc.): *Again* if missed at least once, *Good* if always right. (*Easy* is not used yet; it may come once we track speed per character.)
  - **Receive rating** (`recordResult('receive', 'char:K', score)`): the score is that character's accuracy in the run (0 to 1).
- **Instant Recognition (#32)** uses the same items: one character plays, you press it, and your reaction time joins the score. It rates items (Glicko) and favours the slow ones.

## Input
- **Computer:** type the letter. Space skips one you missed.
- **Phone:** a grid of big buttons, one per unlocked character, always in Koch order so their places don't move. 48 px or larger, the same tap-target size as elsewhere. Plus a "?" skip button.
- **iOS silent switch:** Safari treats web audio as "ambient" by default, so the silent switch mutes it. Every audio context is made by `newAudioContext()` (`src/core/audio.ts`), which first asks for a "playback" session with the [Audio Session API](https://bugs.webkit.org/show_bug.cgi?id=264473) (Safari 16.4+, feature-detected; other browsers don't need it). So Morse plays through the switch like a music app. Done 2026-11-04; still to check on a real iPhone.

## Sound engine (#30)
`src/subjects/morse/player.ts` plays text as Morse; `timing.ts` holds the maths.
- **Timing:** PARIS standard (a dit lasts 1.2 ÷ wpm seconds). Farnsworth gaps use the ARRL formula (Jon Bloom, KE3Z, QEX 1990): only the gaps between characters and words stretch, in a 3:7 ratio.
- **Accuracy:** every key-down is scheduled on the audio clock, not with timers. Measured in Chromium (offline render, 2026-11-03), every tone started within the 2 ms measuring window of its planned time.
- **No clicks:** each key-down rises and falls over 5 ms.
- **Settings:** character speed, effective speed, pitch (default 600 Hz) and volume.
- **Browsers:** sound starts only from a tap or click (`unlock()` or `play()` in the handler). Android Chrome uses the same engine as desktop Chrome. It has not been tried on a real phone yet; that happens when Adam tries the first lesson.
- **Later (E16):** `route` lets noise, fading and interference sit between the tone and the speakers. Nothing is built for it yet.

## Where it lives (#31)
- `src/subjects/morse/lesson/`: `Lesson.tsx` (the screens), `progress.ts` (saved progress, the gate, warm-ups, weights, XP, and reporting a run), `score.ts`, `build.ts`.
- **Saved state** (the Morse subject's state, ADR 0019): letters unlocked, effective speed, recent run scores since the last unlock, letters met, each letter's smoothed accuracy, the last run's time and the number of runs. Unknown or broken values fall back to a fresh start.
- **After each run**, in order: state, then each letter's review (FSRS) and receive rating, then XP, then minutes.
- **The Signal Tower is the Morse subject's `Hall`**: the platform hands it the subject's API, so the lesson never touches the database directly.

## Instant Recognition (#32)
The Signal Tower's second tab (Adam approved the design on 2026-11-03). Code: `src/subjects/morse/recognition/`.
- **A round** is 60 seconds and uses only the letters unlocked in the Koch lessons.
- **Each letter** plays once, and the lamp starts dimming when the sound ends. You have 3 seconds to press it.
- **Points:** a right answer scores 10, plus up to 30 for speed (timed on the audio clock from the end of the sound). A wrong answer or a timeout shows and replays the right letter.
- **Letter choice:** slow letters come up more often, weighted by each letter's saved reaction time. The same letter never comes three times in a row.
- **After a round:**
  - The saved state keeps the personal best, the rounds played and each letter's smoothed reaction time. A letter never answered right counts as 3 seconds.
  - Each letter played gets one receive rating: the mean of its answers' scores, where right and instant is 1, right at the last moment is 0.5, and wrong is 0.
  - XP is about 0.4 per right answer (about 10 a minute), plus the round's minutes.
- **The result screen** shows points, a new personal best, right answers, average reaction time, XP, and each letter from slowest to fastest.

## The tower hall and "The Silent Beacon" (#33, #34)
Adam approved the hall, the story text and the trial rewards on 2026-11-03.
- **The hall** (`src/subjects/morse/hall/`) opens when you enter the tower. It is a **painted room** in the city's style (`paintTower.ts`, painted in the browser like the city, ADR 0025). Claude painted it overnight on 2026-11-03 while Adam was away, on his instruction to make the calls he would make; it awaits his review.
  - **Depth (2026-11-04, after Adam's review: "the room needs more depth"):** the room is painted in true perspective. `project()` maps every wall, stair and door point from the round tower (a cylinder, seen from just outside its open front) to the screen. So the stone courses curve, near blocks are bigger than far ones, the floor boards converge on the far wall, the ceiling beams radiate from a hub overhead, the stair is solid steps built out from the wall (treads seen from above below eye level, the slab's underside above it), and the Radio Room door sits deep in the wall.
  - **The questline:** a stone stair climbs around the back wall, with one brass lamp per letter of the current chapter (lit lamps glow, the next one flickers) and the trial's gate at the top. The gate glows, and a plaque opens the trial, when every lamp is lit.
  - **The scroll** on the left wall carries the chapter, the newest lamp's story line, and the trial.
  - **The guild's banner** on the right wall carries your rank (Initiate → Listener at all 26 letters, discovery 04), receive and send ratings, and speed.
  - **The stations** on the floor: the listening desk (the Koch lesson), the signal lamp (Instant Recognition), the telegraph table under a dust sheet (sending, E7) and the locked Radio Room door. The painting and its plaque are one button.
  - **Window shapes:** windows narrower than 16:9 show the whole room, and the ceiling fills the space above it; wider windows crop a little from the top and bottom. On an upright phone the room pans sideways (as the city does), and the scroll, the stations and the banner follow below it as cards. The same happens whenever the room is drawn too small to read.
- **The story** lives in `content/morse/questline.json`, a content pack: each chapter is an item (letters, intro, trial, outro), each lamp's line is an item, and each chapter is a lesson. Chapter I "Embers" covers K M U R E S N A; chapter II "The Upper Stair" covers P T L W I . J Z.
- **Trials hold the gate:**
  - When every lamp of a chapter is lit, the next letter stays locked until the chapter's trial is passed. Lessons can still be practised meanwhile.
  - The trial is 50 characters from all your letters, and passes at 90% or better.
  - Passing unlocks the next chapter's first letter and pays bonus XP: 50 for the Gatekeeper, 75 for the Warden of the Stair.
  - Failing costs only the attempt. The run still counts as practice (reviews, ratings, speed).
- **Ranks don't come from trials.** They follow discovery 04 (Adam, 2026-11-03).

## Sending at the telegraph table (#35, #36, #37)
Built overnight on 2026-11-03 while Adam was away (his instruction: keep going and make the calls he'd make). It awaits his review.
- **The drill:** key 5 groups of 3 letters, drawn from the letters you've learned to hear. Receiving comes first, the usual order. Letters light up teal when the tower reads them right and ember when it reads them wrong.
- **The key** (#35):
  - Hold the space bar on a computer. Auto-repeat is ignored, and leaving the window lets the key go.
  - On a phone, hold the big brass key. It doesn't scroll, zoom or open a menu while you key.
  - The sidetone's oscillator runs the whole time and only its volume switches, with a ~5 ms edge. That's the shortest path from press to sound in the browser. Times come from the input events' own timestamps.
- **The decoder** (#36, `send/decoder.ts`) reads every key-down as a dit or a dah, and every gap as an element, letter or word gap:
  - It judges each one against your own dit, with gap cut-offs at 2 and 5 dits, between the standard 1:3:7.
  - It re-reads the whole drill on every press. It sorts your key-downs into a short and a long group (two-means on their log lengths), so it finds your speed from the first dah and copes with dahs only twice a dit. Decoders that learn one element at a time can lock onto a wrong speed: a slow sender's first dit, read as a dah, teaches them a speed that's too fast.
  - Until you've keyed both kinds, it uses your speed from the last drill (12 wpm the first time).
  - Codes we don't teach read as "?".
- **Scoring:** the letters you keyed against what the tower read, with spaces ignored and the same alignment as the Koch runs. Each letter gets a **send** rating (Glicko, ADR 0010). XP is about 10 a minute.
- **Your fist** (#37, `send/fist.ts`):
  - Five measures, each drawn as a gauge against its ideal: dah ÷ dit (ideal 3, fine 2.5–3.6), gaps inside letters (1 dit, fine 0.6–1.7), between letters (3, fine 2.3–4.5), between words (7, fine 5–10), and steadiness (how alike your dits and dahs are).
  - One tip names the worst habit, e.g. "Your letters run together. Leave a gap of about one dah between letters."
  - A timing strip shows your last 8 seconds of keying as bars on a line. Nothing shows dots and dashes as a chart.
- **Saved:** the number of drills and your dit length, which sets your speed for the next drill and appears on the hall's sending station.

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
