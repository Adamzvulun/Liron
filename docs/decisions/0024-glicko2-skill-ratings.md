# 0024 — Skill ratings: our own Glicko-2, one rating period per answer, stored per skill and item

- **Status:** Accepted (part of #22)
- **Date:** 2026-11-03
- **Builds on:** [0010](0010-skill-rating.md) (Glicko-2 alongside ranks), [0019](0019-subject-contract.md) (subject contract), [0022](0022-fsrs-spaced-repetition.md) (FSRS works the same way)

## Context
ADR 0010 chose Glicko-2 for a live skill rating, for both the learner and every item. #22 asks for:
- a pure TypeScript implementation (or a small, checked library), tested against the published worked example;
- per-subject, per-skill learner ratings and per-item ratings in Supabase;
- a "provisional" flag until N results, with N documented.

Glicko-2 was designed for rating *periods*: a batch of games, then one update. Puzzle trainers such as Lichess's instead update after every puzzle, with the user and the puzzle as the two players. That is our situation too: one answer is one game.

## Options considered
1. **A Glicko-2 package from npm.** Rejected. The algorithm is about 100 lines with one numerical step (the Illinois method for the volatility). A package adds a dependency to vet and pin, for code we can check line by line against the paper.
2. **Our own implementation in `src/core/rating/glicko2.ts`.** Chosen. It follows the steps of Glickman's [*Example of the Glicko-2 system*](http://www.glicko.net/glicko/glicko2.pdf) and its test replays the paper's worked example. The result matches the paper to its rounding: rating 1464.05 (the paper rounds μ′ first and gets 1464.06), RD 151.52, volatility 0.059996.
3. **Ratings computed in a database function.** Rejected for now, for the same reason as FSRS (ADR 0022): the browser computes the result and one database function saves it.

## Decision
- **Numbers:**
  - Everyone and everything starts at **1000**, as #22 asks (Glickman uses 1500; the maths only shifts).
  - Starting **RD is 350** and starting **volatility is 0.06**, Glickman's values. **τ = 0.5**, inside his suggested range of 0.3 to 1.2.
- **One rating period per answer.** The learner's skill rating and the item's rating each play one game against the other, both computed from the values before the answer. A score of 1 means right and 0 means wrong; values between give partial credit.
- **Breaks raise uncertainty.** Each whole day without a result counts as an empty rating period: RD grows as Glicko-2 does for absent players, up to 350. After a long break, the next answers move the rating more. Ratings shown to subjects include that growth up to now.
- **Provisional until 30 results.** In a simulated new learner, RD fell to about 115 after 30 answers. Lichess marks ratings provisional while RD is above 110, so N = 30 lands near the same line. N is `PROVISIONAL_GAMES` in `src/core/rating/ratings.ts` and applies to learner and item ratings alike.
- **New items can start from a seed** (`itemSeed`), for example from curriculum order, as ADR 0010 suggests. Unseeded items start at 1000.
- **Skills per subject.** `SubjectInfo` gains an optional `skills` list (Morse will list `receive`, `send` and `head-copy`). When a subject lists its skills, a result for any other skill is refused, which catches typos.
- **Contract** (ADR 0019 gains three calls, each bound to the subject):

  | Call | Does |
  |---|---|
  | `recordResult(skill, itemId, score, { at, itemSeed })` | Rates one answer; returns the learner's and the item's new ratings |
  | `skillRatings()` | The learner's rating in each skill they have results in |
  | `itemRatings(skill, itemIds)` | Those items' ratings; items not yet rated are missing |

  Each rating comes with `rating`, `rd`, `games` and `provisional`. `chanceOfSuccess(learner, item)` in `glicko2.ts` estimates the chance of a right answer. Subjects can use it to pick items near the learner's level.
- **Storage** (migration `20261103020000_skill_ratings.sql`), all under row-level security:
  - **`skill_ratings`:** one row per user, subject and skill.
  - **`item_ratings`:** one row per user, subject, skill and item.
  - **`rating_log`:** append-only. Each result is stored with both ratings afterwards, for the trend line ADR 0010 asks for and for recalibrating later.
  - `record_result` saves all three in one transaction. It refuses future times, scores outside 0 to 1, and an RD outside (0, 350].

## Consequences
- **Item ratings are per learner for now.** With one learner, an item's rating says how hard it is *for Adam*. ADR 0010's shared item difficulty, learned across friends, needs a shared table written by a trusted function. That comes with social (M5); nothing here blocks it.
- **The overall rating per subject** (Signal Rating, Caravanserai Rating) and **rating minimums for ranks** are built on top of these, with the thresholds tuned in M3 (ADR 0010).
- As with XP and reviews, the browser could write any rating. That's fine for one learner; revisit before friends and challenges (M5).
- Ratings and FSRS stay separate: a subject may report one answer to both (`recordReview` for *when*, `recordResult` for *how good*).
