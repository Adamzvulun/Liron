# 0043 — The party feed and friends in the square

- **Status:** Accepted (Claude, 2026-11-17, task 3.3, #328; built to [fellowship-build.md](../game/fellowship-build.md) §2 and §5, under Adam's instruction to decide as he would)
- **Date:** 2026-11-17
- **Builds on:** [ADR 0042](0042-the-fellowship-first-slice.md)

## Decision

1. **The feed is written by the database alone, using triggers on the rows it already writes** (migration `20261231000000_fellowship_feed.sql`). The browser has no way to write it.
   - A `rank-…` or `trial-N` event in `subject_events` becomes a `rank` or `trial` row.
   - A new row in `player_achievements` becomes an `achievement` row.
   - A streak chest (granted exactly on days 7, 30 and 100) becomes a `streak` row.
   - Each milestone is written once ever (`unique (user_id, kind, detail)`).
2. **A row holds codes only:** for example `morse:rank-keyer` or `30`. The words are made in the app (`milestoneLine`), so the only thing a player typed that friends read is their name, which is cleaned (ADR 0042).
3. **`fellowship_feed()` returns the last 50 rows** of the caller and their accepted friends, newest first. Each row carries the day, never the time. The same function deletes rows older than 60 days.
4. **Sharing:** `profiles.share_milestones` (default on). With it off, nothing is written; it doesn't merely hide rows. The switch is in Settings, and only appears once the player has a friend, so a player alone sees nothing social.
5. **On the Notice Board, "Word in the square"** sits under the chests. It shows only to a player with a friend.
6. **Friends in the square:**
   - At most eight figures, painted from the cards the list already uses.
   - Each figure is a link to that friend's house.
   - They are read 400 ms after the square appears, so the first paint never waits for them.
   - The speed test now runs with five friends standing in the square: 2.0×, 2.0× and 1.5× on the first run, against ceilings of 3×, 3× and 2.6×.

## Consequences

- A rank is still reported by the subject in the browser (accepted in ADR 0042), so the feed is as trustworthy as the ranks are.
- Friends appear after a short beat on the square, as one moment rather than a flicker during load.
- The feed table joins the isolation test's player tables, and `fellowship_feed` joins its reviewed functions.
