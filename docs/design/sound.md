# The city's sound and motion (task 4.6, #338)

Every sound is made in the browser with Web Audio, like the Morse tones: no audio files, nothing to license. The synthesizer is `src/core/sound/citySound.ts`. It loads on the player's first tap, so the square's startup code only carries the switches (`sound.ts`).

## What plays

| Sound | When | What it is |
|---|---|---|
| Click | Pressing a button, link or switch in the city | A short wooden tick, falling in pitch |
| Reward | Daily goal reached, a chest opened, something bought | Two bell notes a fifth apart |
| Level up | The level-up card | A rising arpeggio to the octave |
| Step | A step on the road is done | One soft bell |
| A place's bed | While you are in it, if switched on | Noise shaped into water (the square and the board), a hearth (Your House) or a far-off murmur (the market), swelling slowly |

Every sound is quiet: no note above a tenth of full volume, and no bed above 5% (tested).

## Rules

- **Nothing plays before the first tap** on a page: browsers require it, and a game shouldn't make noise you didn't ask for. Tested.
- **Two switches in Settings:** "Clicks and chimes" (on by default) and "Sounds of each place" (off by default: a bed is something you choose). They are kept on the device, like the first page, and stay across reloads. With both off, no audio context is ever made. Tested.
- **The halls are quiet.** Their sounds are the lessons: a click over a Morse character would get in the way of hearing it. The switches don't touch lesson audio; Settings says so. *Decision made in Adam's place, 2026-11-17: he can ask for the switch to silence lessons too.*
- **The silent switch on iPhone mutes the city's sounds,** as it does any app's clicks. Lessons ask to play through it (`src/core/audio.ts`); the city doesn’t.

## Motion

Motion answers the player and never runs by itself. All of it is off when the device asks for reduced motion.
