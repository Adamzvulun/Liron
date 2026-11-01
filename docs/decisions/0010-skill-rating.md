# 0010 — Skill rating (Elo/Glicko-style) alongside ranks

- **Status:** Accepted in principle (2026-11-01); exact thresholds tuned in M3
- **Date:** 2026-11-01

## Context
Adam wants an Elo-like system that goes hand in hand with the guild ranks.

Ranks are **milestones**: earned once and never lost. A rating is a **live measure of current skill**: it moves up and down with performance. Chess puzzle trainers and adaptive learning apps already use this pattern. Both the *learner* and each *exercise item* carry a rating, and every answer updates both.

## Decision (proposed)
- **Algorithm:** Glicko-2, which is Elo plus an uncertainty value. New players and new items converge fast, and the rating stays stable once known.
- **Ratings per subject, broken into sub-skills:**

  | Subject | Sub-ratings | Overall |
  |---|---|---|
  | Morse | Receive · Send · Head copy | Signal Rating |
  | Arabic | Reading · Listening · Vocabulary · Conversation | Caravanserai Rating |

- **Items have ratings too.** Every character, word, sentence, and drill gets a difficulty rating learned from answers (across friends, once social exists). That lets the app pick exercises near your level.
- **How it fits with ranks:**
  - A rank needs its mastery milestone *and* a minimum rating (e.g. Operator = first QSO + Send ≥ 1400).
  - Your rank title shows what you've achieved; your rating shows your current form.
- **Friendly use:**
  - Ratings show on profiles and drive opt-in challenges (fair matches between friends of different levels).
  - There are no leagues or demotions; ranks can't be lost.
  - Small drops after a bad day are expected and shown gently (e.g. a trend line rather than red numbers).
- **Partners and trials:** a trial (boss) has a rating. Beating it is a "win" against a strong opponent.

## Consequences
- We need careful item calibration at the start. Seed ratings by curriculum order, then let them learn from answers.
- Ratings and spaced repetition (FSRS) do different jobs and must not fight:
  - **FSRS** decides *when* to review an item you already know.
  - **The rating** decides *which new or practice items* fit your level, and measures you.
