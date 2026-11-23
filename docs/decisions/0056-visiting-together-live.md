# 0056 — Visiting together, live, on the wire's Realtime

- **Status:** Accepted (Claude, 2026-11-23, task 9.1, #482; Adam: "continue working", with in-game choices left to Claude)
- **Date:** 2026-11-23
- **Builds on:** [ADR 0046](0046-the-wire.md) (the wire: private Realtime channels per friendship), [ADR 0055](0055-a-walkable-home-drawn-in-the-page.md) (the walkable home)

## Context

The home's later list ([the-home.md](../game/the-home.md) §9) asks for friends to walk in one room together, live. It waited on the Realtime setting that the wire needs, "Allow public access" switched off. Adam did that on 2026-11-18 (HANDOFF 112). Realtime's free plan (200 connections, 100 messages a second, 2 million a month; ADR 0046) is far above a few friends walking at about four steps a second.

## Decision

1. **The wire's kind of channel, with its own name:** `visit:<low id>:<high id>`, private and broadcast only. `may_use_wire` accepts `wire:` and `visit:`, so the same two policies on `realtime.messages` let in the same two friends and nobody else. There is no new service, key or bill.
2. **Pairs, not a channel per house.** A house channel would let two guests who aren't friends see each other. Per friendship, you only ever see friends. A guest opens one line, to the host. A host at home opens one per friend, at most 40 (Realtime allows 100 channels a connection).
3. **What is said:** `{h, r, c, s?}`, meaning whose house, which room, the cell and the seat. It goes on each line as you join it (and once more 3 s later, in case the friend joined at the same moment), at once in answer to a newcomer, and every 5 s and on each step only to a friend in the same house. "bye" goes on leaving. An empty house sends nothing after joining: with Realtime's 2 million messages a month, a house left open with friends who aren't there must cost nothing (review, 2026-11-23). Nothing else: no names, no text. Each side draws the friend from their card.
4. **Live presence only replaces the still host.** A host who isn't home stands by the window as before. One who is home walks, and doesn't block the way.

## Consequences

- A friend learns you're home only while they're in a house themselves. FRIENDS.md says so.
- Two guests in one house don't see each other. A later step could open guest-to-guest lines between friends.
- Tested against the fake Realtime relay and the database shim, as the wire is. The real test is Adam with a friend on two devices.
