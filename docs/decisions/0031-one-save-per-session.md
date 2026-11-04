# 0031 — One all-or-nothing save per session

- **Status:** Accepted (Claude's call, under Adam's "do what you think is best" for the 2026-11-04 review's items)
- **Date:** 2026-11-04
- **Amends:** [0019](0019-subject-contract.md) (the subject API), [0029](0029-database-is-the-only-writer-of-rewards.md)

## Context
The architecture review (2026-11-04, "architecture before E10") found that a finished session is saved as many separate requests, one after another:
- the subject's state;
- a read and a write for each spaced-repetition review;
- two reads and a write for each rating;
- then XP and minutes.

A script lesson of 18 answers makes about 60 requests. The same sequence is written out in six places (the script lesson, the slate, the coffee corner, Koch runs, Instant Recognition and the sending drill). This causes two real problems:
1. **A dropped connection half-way loses part of a session.** The state can be saved while the XP isn't, or the reviews saved while the minutes aren't.
2. **Trying again counts twice.** Repeating a save that partly failed adds the XP, the minutes and the review-log rows again.

E10 adds contract events to every session. Adding them as one more call in each of the six copies would make both problems worse.

## Decision
- **One database function, `save_session`, saves a whole session in one transaction**: the state, every review, every rating, then XP and minutes. Either all of it is saved or none of it is.
  - It calls the existing functions (`save_subject_state`, `record_review`, `record_result`, `record_progress`), so each rule, check and cap stays in one place.
  - Limits: at most 200 reviews and 200 results per session.
- **A session has an id** (a UUID the app makes when the session ends). `save_session` records it in a new table, `saved_sessions (user_id, session_id)`. If the same session is sent again, nothing is applied twice; the call returns `{"duplicate": true}`. A retry is therefore always safe.
- **The subject API gets `saveSession(report)`**:
  - The report holds `state`, `reviews` (item and grade), `results` (skill, item, score), `xp` and `minutes`.
  - The platform reads the cards and ratings it needs in **one read per kind**: one for the cards, and one per skill for the ratings.
  - It works out the new FSRS cards and Glicko ratings in order, in memory, so two answers to the same item build on each other as before.
  - Then it sends the single `save_session` call.
- **The old single calls stay** (`recordReview`, `recordResult`, `awardXP`, `recordPractice`, `saveState`) for one-off actions, such as saving a toggle or paying a trial's XP. A finished session uses `saveSession`.
- **No new technology:** a Postgres function and a table, in a normal migration (ADR 0018).

## Consequences
- **Requests:** a session's save drops from about 20–60 requests to 3–5: the reads, plus one write.
- **Failures:** a failed save leaves nothing half-written. The app shows "couldn't save" as before, and saving again is safe.
- **For E10:** contract events will ride the same call (their ADR adds them to the report). This ADR doesn't decide their shape.
- **Not covered:** the functions still trust what the app reports, as before (ADR 0029). A player who writes their own requests can still report practice they didn't do, up to the daily XP cap.
- **Tests:**
  - `supabase/tests/schema.test.ts` checks that a session is applied whole, that a bad review rolls the whole session back, and that a repeated session id changes nothing.
  - The unit tests check that ratings and cards chain within one report.
  - `e2e/fake-supabase.ts` answers `save_session` the way the database does: it applies each part and records it as the matching call.
