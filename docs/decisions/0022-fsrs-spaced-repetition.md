# 0022 — Spaced repetition: FSRS via ts-fsrs, scheduled in the browser, stored per item

- **Status:** Accepted (part of #21)
- **Date:** 2026-11-02
- **Builds on:** [0003](0003-hub-of-independent-subjects.md) (FSRS is a platform service), [0019](0019-subject-contract.md) (subject contract)

## Context
ADR 0003 makes spaced repetition a platform service any subject may use. #21 asks for a small API (schedule, record review, due items per subject), with a review log in Supabase per user and item, and says the subject never talks to the library directly.

**FSRS** (Free Spaced Repetition Scheduler) is the modern open algorithm; Anki has shipped it since version 23.10. **`ts-fsrs`** is its TypeScript implementation, from the same open-spaced-repetition group.

Checked on npm on 2026-11-02:
- **License:** MIT.
- **5.4.2:** released 2026-09-01, with no dependencies.
- **6.0.0:** released 2026-10-28, only 5 days ago. It breaks our rule of using releases at least two weeks old, and it removes the `elapsed_days` field.

## Options considered
1. **Write FSRS ourselves.** Rejected: a lot of maths to get right, for no gain.
2. **`ts-fsrs` in the browser, saving its results.** Chosen.
3. **`ts-fsrs` inside a database or server function.** Rejected for now. Postgres can't run it, and an Edge Function adds a service and a deploy step for one learner.

## Decision
- **`ts-fsrs` 5.4.2**, pinned. Only `src/core/srs/scheduler.ts` imports it; the boundary test fails if anything else does.
- **Settings:** 90% target retention (FSRS's default). **Fuzz on**, so items introduced together spread over nearby days. Fuzz is seeded from the card, so the same review always gives the same result. The default parameters are used until there's enough review history to fit personal ones.
- **Contract** (ADR 0019 gains three calls, each bound to the subject):

  | Call | Does |
  |---|---|
  | `recordReview(itemId, 'again' \| 'hard' \| 'good' \| 'easy')` | Records how well the learner knew an item; returns when it's due again. When a session asks about an item several times, `gradeFrom(right, asked)` turns the count into a grade (all right: good, at least half: hard, fewer: again) |
  | `dueItems({ limit })` | Items due now, most overdue first |
  | `reviewStatus(itemIds)` | Due date, phase (new, learning, review, relearning), reps and lapses; items never reviewed are missing |

  **Item ids** are the subject's own stable strings, up to 128 characters, e.g. `char:K`. **Turning results into grades** (for example, Morse: wrong → again, slow → hard) is the subject's job.
- **Storage** (migration `20261103000000_spaced_repetition.sql`), both under row-level security:
  - **`review_cards`:** one row per user, subject and item. It holds `due` and `state` for queries, plus FSRS's whole card as JSON, so a library upgrade needs no migration.
  - **`review_log`:** append-only (read and add, never change). It holds the grade, the time, and FSRS's log entry, which later lets us fit personal parameters.
  - `record_review` saves the card and its log entry in one transaction. It refuses times more than a day in the future.
- **Reviews don't award XP by themselves.** The subject decides what a review is worth (around 10 XP a minute, [economy](../game/economy.md)).

## Consequences
- As with XP (ADR 0017), the browser could write any schedule. That's fine for one learner; revisit before friends and leaderboards (M5).
- **Upgrading to ts-fsrs 6** once it's two weeks old is a separate change. Stored cards are JSON, and the tests pin the behaviour we rely on.
- **Fitting personal parameters** from `review_log` is a later improvement; it needs a few hundred reviews first.
