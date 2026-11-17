# 0046 — The wire: live Morse on Supabase Realtime

- **Status:** Accepted (Claude, 2026-11-17, task 3.6, #331; built to [fellowship-build.md](../game/fellowship-build.md) §5 "Live Morse", under Adam's instruction to decide as he would). **One step is Adam's** (Consequences, first point).
- **Date:** 2026-11-17
- **Builds on:** [ADR 0042](0042-the-fellowship-first-slice.md) (friendships and `are_friends`), the sending table's sidetone and decoder (task 1.7)

## Context

Two friends should be able to key Morse to each other, live, each hearing the other's key as tones. That needs something that carries small messages between two browsers within a fraction of a second. We already use Supabase (ADR 0002), and Supabase Realtime comes with the same project. No new account, key or bill is needed.

These facts come from Supabase's own pages, read today (2026-11-17): the Realtime pages on limits, authorization and broadcast in Supabase's docs.

- **Free plan limits:**
  - 200 concurrent connections;
  - 100 messages a second;
  - 100 channel joins a second;
  - 100 channels per connection;
  - 2 million messages a month;
  - 256 KB per broadcast.

  When a limit is hit, the client sees errors such as `too_many_connections`, `too_many_joins` or `tenant_events`.
- **Private channels.** A channel joined with `config: { private: true }` is authorized by Row Level Security policies on `realtime.messages`. A `select` policy decides who may receive, and an `insert` policy decides who may send. Policies can read the channel's name with `realtime.topic()` and its kind with `extension` (`broadcast` or `presence`). Realtime checks them when the client joins, and keeps the answer for the life of the connection.
- **Public channels are still allowed by default.** A client that leaves out `private: true` gets a public channel with no policy check. Only the project setting **"Allow public access"** (Realtime → Settings), switched off, makes every channel private.
- **Client broadcasts are not stored.** They are relayed to whoever is on the channel and then dropped.
- **Dropped connections.** The client sends a heartbeat every 25 seconds and reconnects by itself, waiting 1, 2, 5 and then 10 seconds between tries. The channel reports `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT` or `CLOSED`.

At our size (Adam and a few friends), two keyers use 2 connections and at most a few dozen messages a second while both key fast. That is far below every limit.

## Decision

1. **Supabase Realtime Broadcast carries the wire,** on private channels. There is no new service and no new key. We use no Presence and no Postgres changes.
2. **One channel per friendship:** `wire:<lower user id>:<higher user id>`. Both friends get the same name from either side.
3. **Only the two friends may join** (migration `20270103000000_the_wire.sql`):
   - `may_use_wire(topic)` checks that the name has that exact shape, that the caller is one of the two ids, and that the two are friends now (`are_friends`).
   - Two policies on `realtime.messages`, "friends hear" (select) and "friends key" (insert), allow `broadcast` only, and only when `may_use_wire(realtime.topic())` is true.
   - A name that is merely hard to guess would not be enough; the policy is the gate.
4. **What goes over the wire:**
   - `key {d: 1|0, t}`: key down or up, with `t` in ms on the sender's own clock since their line opened.
   - `here`, every 5 seconds, and at once in answer to a newcomer, so each side knows the other is on.
   - `bye` when a player hangs up.

   There is no text, no name and no score. Nothing is stored, by us or by Realtime. There is no chat: the key is the only voice (fellowship-build.md §5).
5. **The friend's key is played 250 ms behind** (`WIRE_DELAY_MS`), timed by the sender's clock rather than by when each message arrived. Network jitter shorter than that doesn't change the rhythm, so the decoder reads it as it was keyed. The friend's tone is 760 Hz, a little higher than your own sidetone, so the two keys are easy to tell apart.
6. **The line's state is shown in words:**

   | State | What the player sees |
   |---|---|
   | connecting | "Opening the line…" |
   | waiting | "Your line is open. Waiting for Basma to open theirs." |
   | open | "Basma is on the line." The friend's "here" was heard within 16 s. |
   | dropped | "The line dropped. Reconnecting…" supabase-js retries by itself. |
   | lost | After 20 s without coming back: "The line is down." With **Try again**. |
   | failed | The join was refused or never got through: "The line couldn't be opened. Check your connection, and that Basma is still your friend." With **Try again**. |

   The player is never left guessing (Adam's "never feel lost").
7. **The way in is the sending table.** It shows **Key to a friend** only to a player with a friend. The wire's own door is `/signal-tower?open=wire`. A player without a friend who reaches it is pointed to Your House to add one.
8. **The same key works for both.** Your side reuses the sending table's `Keying`: the space bar, or the brass key on a phone. It gets an `onEdge` hook and a **Clear** button. Clear wipes only your strip; it doesn't restart your clock, because the friend's playback is timed by it.

## Consequences

- **Adam's step (free, a dashboard setting):** in the Supabase dashboard, Realtime → Settings, switch **"Allow public access"** off, for the dev project and the live one. Our app always asks for a private channel, so this doesn't change how it works. It stops a modified client from opening a public channel with the same name. Written in [RUNNING.md](../process/RUNNING.md#friends) and in [VERSIONS.md](../process/VERSIONS.md) 2.4.
- **What the tests prove:**
  - The policy is tested in the database (`fellowship.test.ts`, "the wire"), against a stand-in `realtime.messages` in the test shim. Friends may hear and key; strangers, a third player, a bad name and an ended friendship may not.
  - The app is tested against a fake Realtime socket (`e2e/fake-realtime.ts`), shaped by what supabase-js 2.118 was seen to send. Two pages key K to each other and read it. A dropped line recovers, a refused line can be tried again, and the phone's brass key keys too.
  - Neither test reaches real Realtime. **Adam's try with a friend on two devices is the real test** (VERSIONS.md 2.4).
- **Policies are kept for the connection's life,** so a friendship ended mid-call ends the line only when it reconnects. That is acceptable for a game between friends.
- If we ever outgrow the free plan's 200 connections, that is a question for Adam (money), not a quiet change.
