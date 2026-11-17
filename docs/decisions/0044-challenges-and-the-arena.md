# 0044 — Challenges and the Arena

- **Status:** Accepted (Claude, 2026-11-17, task 3.4, #329; built to [challenges.md](../game/challenges.md) and [fellowship-build.md](../game/fellowship-build.md) §5, under Adam's instruction to decide as he would)
- **Date:** 2026-11-17
- **Builds on:** [ADR 0042](0042-the-fellowship-first-slice.md), [ADR 0043](0043-the-party-feed.md)

## Decision

1. **A score belongs to a saved session** (migration `20270101000000_challenges.sql`). After a callsign rush or a Codebook round is saved, the subject calls `record_round_score(session, kind, score)`. The database refuses it unless all of these hold:
   - the session is the caller's, in the right subject, and saved in the last 15 minutes;
   - the session has no score yet;
   - the round's own event (`rush-round` or `words-round`) was counted today;
   - the score is in range: 0–1,250 for the rush, 0–10 for the Codebook.
2. **A challenge names a session, never a number.** `send_challenge(friend, session)` and `answer_challenge(id, session)` read the score the database stored. An answer must be a round of the same kind, played after the challenge was sent.
3. **Limits:**
   - Only friends can challenge each other.
   - At most 3 open challenges between two friends, and 10 sent a day.
   - A challenge expires after 7 days and stays readable for 30.
   - A removed friend's challenges vanish from both lists.
4. **Kinds are rows** (`round_kinds`), so Arabic adds its own when it has a scored round of the same shape.
5. **Taking a challenge on is remembered in the tab** (`sessionStorage`), not in the database. The next round of that kind answers it. The subject only records its round and offers it; the platform does the answering. If the tab is closed, the challenge simply stays open.
6. **On screen:**
   - The offer appears under a round's result, only for a player with a friend.
   - The Arena (`/arena`) has its own painting at dusk: warm, with no blue. It has three parts:
     - **For you**, with "Take it on" and "Let it go";
     - **Yours**;
     - **Done**: two scores side by side on a slate, each over its owner's best, with no crown.
   - A player who beat their own best gets one line saying so.
   - The square's sign is now a link named "The Arena". The "Locked" note is gone.

## Consequences

- A round is played in the browser, so a friend with a modified browser could report a better round than they played, within range. That's the same trust as ranks (ADR 0042), and it's accepted for a circle of friends.
- The rush and the Codebook make their own session ids now (`saveSession({ sessionId })`), so the platform can tie a score to a save.
- `round_scores` and `challenges` join the isolation test's tables, and the five new functions join its reviewed list.
