# 0009 — Morse speed policy

- **Status:** Proposed
- **Date:** 2026-11-01

## Context
Adam asked how operator and lesson speed should be set for the best learning, and how it's usually done.

## How it's usually done
- **Character speed is never slowed down.** Koch (LCWO, G4FON) and CW Academy teach at ~20 wpm character speed or faster from day one. Slow characters get learned as dot-counting, which becomes a plateau around 10–12 wpm that is hard to unlearn.
- **Farnsworth spacing:** to give the learner time, the *gaps* between characters and words are stretched instead. The "effective" speed starts low and the gaps shrink over time until effective speed equals character speed.
- **Accuracy gate:** move on at about ≥90% copy accuracy (Koch). Below that, stay; well above it, push.
- **Overspeed practice:** short drills slightly *above* comfort (RufzXP, Morse Code Ninja) raise the ceiling.
- **On the air:** the faster operator matches the slower one, and anyone can ask QRS ("send slower"). Good operators answer at about the speed you called them at.

## Decision
| Setting | Behaviour |
|---|---|
| **Character speed** | Fixed at 20 wpm to start (user can raise it to 25+). It never drops below 18. |
| **Effective (Farnsworth) speed** | **Automatic**, adapting to keep copy accuracy around 90%. It speeds up after strong sessions and backs off after weak ones. |
| **Operator speed (QSO)** | Each operator answers near **your sending speed**, as on real bands, adjusted by personality: the contester runs faster, the beginner slower. If you send QRS, they slow down (Farnsworth gaps only). |
| **Overspeed drills** | Games like callsign rush run 2–5 wpm above your level on purpose. |
| **Manual override** | Available in settings for all of the above, but auto is the default. |

## Consequences
- We need a per-user speed model (character wpm, effective wpm, recent accuracy).
- The QSO engine needs to measure the user's sending speed.
