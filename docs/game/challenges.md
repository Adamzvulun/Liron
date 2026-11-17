# Challenges and the Arena (task 3.4, #329)

- **Status:** built (Claude, 2026-11-17; [ADR 0044](../decisions/0044-challenges-and-the-arena.md)), to [fellowship-build.md](fellowship-build.md) §5. Adam's standing instruction is to decide as he would; every choice below is listed in ADR 0044 for him to overturn.
- **What it is:** a friend sends you their score on a round you both know, and you play the same kind of round when you like. Both scores are shown, each beside its owner's personal best. There is no loser and no ranking. The Arena on the square, locked until now, becomes the place where challenges live.

## 1. The rounds

Two kinds to begin with, both on scores the game already counts:

| Kind | Round | Score | Range |
|---|---|---|---|
| `rush` | The callsign rush (Signal Tower, 25 calls) | The sum of the speeds of the calls copied right | 0 – 1,250 |
| `words` | A Codebook round (Signal Tower, 10 words) | Words copied right | 0 – 10 |

Arabic gets a kind of its own when it has a scored round of the same shape. Kinds are rows in a table, not code.

## 2. How a score is checked

A round is played in the browser, so the database can't watch it. What it can check, and does:

1. **The score belongs to a saved session.** After a round is saved (`save_session`), the subject calls `record_round_score(session, kind, score)`. The session must be the caller's, in the right subject, saved in the last 15 minutes, and scored only once. The round's own event (`rush-round` or `words-round`) must have been counted today.
2. **The score is in range** for its kind.
3. **A challenge takes a session, never a number.** `send_challenge(friend, session)` and `answer_challenge(id, session)` read the score the database stored for that session. A number typed into a call can't become a challenge.
4. **An answer must be played after the challenge was sent.**

A determined friend with a modified browser could still report a better round than they played, within range. That is the same trust as ranks (ADR 0042), and it's accepted for a circle of friends.

## 3. The life of a challenge

```
sent ──▶ answered      (the friend played a round after it was sent)
  │
  ├────▶ declined      (the friend let it go)
  │
  └────▶ expired       (7 days with no answer)
```

- **To send:** you must be friends, have no more than 3 open challenges with that friend, and send at most 10 a day.
- **To answer or decline:** only the challenged friend can, and only while it's open.
- **What both see:** both names, both scores, each one's personal best for that kind, and the state. A finished challenge stays visible for 30 days.

## 4. On screen

- **After a rush or a Codebook round** (only for a player with a friend), a line under the result says "Challenge a friend with this score", with the friends to pick from. Sending says "Sent to Basma."
- **The Arena (`/arena`)** gets its own painted backdrop: sand, stone tiers and banners. It holds:
  - **For you:** "Adam challenges you to a callsign rush: 534" with **Take it on** (it opens the rush, and the next rush you finish in that tab answers it) and **Let it go**.
  - **Yours:** the challenges you sent, with their state.
  - **Done:** finished challenges, each as two scores side by side with the bests ("Adam 534 · best 610 / You 498 · best 498"). The higher number gets no crown. A player who beat their own best gets a small line saying so.
  - **With no friends:** one line saying the Arena is for friends, and how to add one (Your House).
- **The sign** on the square stops saying "Locked". The Arena is a place like the others: walking in opens `/arena`.

## 5. Tests

- **Database:**
  - A score is refused for someone else's session, an old one, one already scored, a missing round event, or out of range.
  - A challenge is refused for a stranger or a fourth open one.
  - Answering, declining and expiry are each tested.
  - Only the two players see their challenge.
- **Browser:**
  - Send from a result.
  - Take one on, play, and see it answered.
  - Let one go.
  - The Arena at 320 pixels and on desktop, screenshotted.
