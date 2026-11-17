# The Fellowship: how to build it safely

- **Status:** design for the builder (2026-11-16), written by Claude as manager for [PLAN](../process/PLAN.md) Phase 3 (#306). It adds the *how* to [fellowship.md](fellowship.md) (the *what*) and [ADR 0039](../decisions/0039-fellowship-answers.md) (Adam's answers). **Built so far (2026-11-17):** §2's first two tables, §3's functions except the feed, visits (§5), and tests 1–7 and 9 of §6 ([ADR 0042](../decisions/0042-the-fellowship-first-slice.md)). The feed, the square, challenges, gifts and live Morse are still to come.
- **Why this file exists:** the Fellowship is the first time one player's data reaches another player's screen. Every table today is "your own rows only". The mistakes below are easy to make and hard to see in a test with one player, so they are written down before anyone writes a migration.

## 1. Five traps, checked against today's code

| # | Trap | What is true today | The rule |
|---|---|---|---|
| 1 | **A view that skips the rules.** In Postgres a view runs with its owner's rights unless it is created `with (security_invoker = true)`. A plain view over `profiles` would show every player to every player. | No views exist yet. | Don't share through a view at all. Share through **functions** (§3) that name each column they return. A function can't be filtered or joined by the caller into showing more. |
| 2 | **Ranks live inside private state.** A player's ranks are in `subject_progress.state`, the same JSON that holds what they told the regulars, the Coach's tips and their name at the inn. | `state` is one blob per subject, and the platform never reads it (ADR 0003). | Never expose `state`, whole or in part, and never have the database reach into it. Ranks reach friends through the `rank-<id>` events that subjects already report (`subject_events`), which is the contract's public channel. |
| 3 | **A friend's avatar is another person's input.** `profiles.avatar` is JSON the owner can write freely (under 4 KB), and the avatar painter builds SVG that is put on the page as HTML. Gear slots accept any string, and `parseLook` trusts the *viewer's* list of owned wares. | Safe today, because you only ever paint your own avatar. | A friend's look is parsed with `lookSchema` exactly as your own is, and its gear is checked against **the catalog of items that exist**, never passed through. A test paints a look whose every field is a script tag and asserts the output contains none of it. |
| 4 | **Names are shown to others for the first time.** `display_name` is free text up to 40 characters. | Only its owner sees it. | Render it as text only (React does). Trim it, collapse spaces, and refuse control and bidirectional-override characters in the database, so a name can't reorder the line it sits in. |
| 5 | **Friend codes can be guessed.** A lookup that says "no such code" lets anyone walk the code space, and a request that can be repeated is a way to pester. | Nothing exists. | A code is never a search key the browser can query. One function takes a code and always answers the same thing ("If that code exists, a request was sent"). It is limited per player per day, counting failures. |

## 2. Tables

All three have row-level security on, **no policies for the browser to write**, and are changed only by the functions in §3 (the pattern of [ADR 0029](../decisions/0029-database-is-the-only-writer-of-rewards.md)).

- **`friend_codes`** — `user_id` (key), `code` (unique; 8 characters from an alphabet without 0, O, 1, I and L; made by the database from random bytes). A player reads their own row. `new_friend_code()` replaces it, which makes every old code useless.
- **`friendships`** — `low`, `high` (the two players, with `low < high` enforced, as the key, so a pair can exist once), `asked_by`, `accepted_at` (null while it waits), `created_at`. Both players read their own rows. Deleting a player deletes their rows.
- **`fellowship_feed`** — `id`, `user_id`, `kind` (a short code from a fixed list), `detail` (a short code such as a rank id; **never free text**), `at`. Written only by the database at the moment it already records the thing: a `rank-…` event, an achievement, a streak reaching 7, 30 or 100, a trial event. The words shown to friends are built in the app from `kind` and `detail`, so the feed can't carry anything a player typed. Rows older than 60 days are deleted by the same function that reads the feed.

`profiles` gains one column: `share_milestones boolean default true`. When it is false the database writes nothing to the feed for that player.

## 3. Functions (the only doors)

Each is `security definer` with `set search_path = ''`, takes no player id (it uses `auth.uid()`), and is granted to `authenticated` only.

| Function | Does | Limits |
|---|---|---|
| `my_friend_code()` | Returns your code, making one the first time. | — |
| `new_friend_code()` | Replaces your code. | 3 a day |
| `ask_friend(code)` | If the code belongs to someone who is not you, not already a friend and has no request waiting either way, adds a waiting row. Always returns the same answer. If they had already asked you, it accepts instead. | 10 a day, failures included; at most 5 waiting requests of yours; at most 20 friends each |
| `answer_friend(other, accept)` | Accepts, or deletes the row. A decline is silent: the asker is not told. | — |
| `remove_friend(other)` | Deletes the row, for either side, at any time. | — |
| `fellowship()` | Returns **one card per accepted friend, and your own**: display name, avatar look, title, level (computed from XP by the database; the XP itself is not returned), streak, worn pet, ranks (from `rank-…` events), achievements (ids). Nothing else. | — |
| `fellowship_requests()` | Waiting requests to you: the asker's name and avatar only. | — |
| `fellowship_feed(before)` | The last 50 feed rows of your friends and you. | — |

**The card is the whole of §3 of fellowship.md, and nothing else.** A test compares the exact set of keys `fellowship()` returns against a list in the test file. Adding a field means changing that test on purpose.

**Never returned to another player, by any function:** email, gold, gems, XP numbers, minutes, the daily goal, the time zone, `subject_progress.state`, review cards and logs, ratings, chat lines, partner replies, speech checks, saved sessions, owned items not worn, chests, contracts, licensee status.

## 4. What an unfriendly player could try, and what stops it

Friends are invited by Adam, so this is a small circle. It is still built as if one account were hostile, because a stolen password makes it so.

| They try | Stopped by |
|---|---|
| Reading another player's tables directly | Existing "own rows" policies stay untouched. No new select policy is added to any existing table. |
| Reading a non-friend's card | `fellowship()` joins on accepted `friendships` rows that include `auth.uid()`. Test: three players, A–B friends, C a stranger; C gets one card (their own). |
| Still reading a card after being removed | The function reads `friendships` on every call. Test: remove, then call. |
| Guessing codes | Same answer for hit and miss; 10 tries a day; 32⁸ codes. |
| Pestering with requests | 5 waiting at most; a decline is silent; a pair has one row, so a declined player can ask again only within the daily limit. If this proves annoying in practice, add a quiet block list then, not before. |
| A script in a name or an avatar | Traps 3 and 4. |
| Faking a milestone | The feed is written by the database from events that are already capped per day (`subject_event_kinds.daily_cap`). A rank event is still *reported by the subject in the browser*, so a determined friend could claim a rank they didn't earn. That is true of ranks today and is accepted for a friendly circle; say so in the ADR. Challenge scores (§5) are the exception and are checked. |
| Learning when a friend is online, or where they are | No presence, no "last seen", no time zone. The feed's `at` is shown as a day, not a time. |
| Making gold with gifts | §5. |

## 5. The later slices

- **Visits (3.2).** A friend's house is painted from their card alone. There is no second query for "their room": if a field isn't on the card, the house doesn't show it. No wardrobe controls are mounted on a visit (not hidden: not rendered).
- **Friends in the square (3.3).** Painted from the cards already loaded for the list. No extra request per friend, and a cap of eight figures so the square stays inside the speed budget.
- **Challenges (3.4).** A `challenges` table: from, to, kind, the challenger's score, the answer's score, `expires_at` (7 days). The score a player sends is **not trusted**: the database accepts a score only alongside the saved session that produced it, through the existing `save_session` path, and stores the session's own number. There is no loser: both scores are shown beside each player's personal best. At most 3 open challenges per pair.
- **Co-op quests (3.5).** A weekly goal row per fellowship pair or group, counted from `subject_events` rows that already exist. Each member's events count once (the count is a sum over the events table, not a counter the browser bumps). The reward is paid once per member by the function that pays contracts.
- **Gifts (3.5).** One function, in one transaction: check the giver's gold, check the friendship, check the receiver doesn't own the ware, take the gold, add the item for the receiver, write a feed row. Tests: a gift to a stranger fails; a gift of an owned ware fails and costs nothing; two gifts sent at the same moment cost twice and give once at most (or the second fails); gold can never go below zero. Wares that can't be bought (rank gear, finale gear) can't be given.
- **Live Morse (3.6).** Its ADR must answer, from Supabase's pages on the day: how a private Realtime channel is authorized (so that only the two friends can join a room; a channel name that is merely hard to guess is not enough), the free plan's connection and message limits, and what a client sees when the link drops. Send key-down and key-up as events with the sender's own clock time, and play them on the other side a fixed short delay behind, so network jitter doesn't change the rhythm. Nothing is stored. No free-text chat: the key is the only voice.

## 6. Tests that prove it (the "Done when" of 2.4 and 3.1, made exact)

The database tests go in `supabase/tests/`, beside `schema.test.ts`, which already applies the real migrations in PGlite and runs queries as each player. Realtime (3.6) can't be tested there: a fake channel in the browser tests proves our code, and the real thing is tried by Adam and a friend on the dev site.

1. For every table that exists, player B selecting, inserting, updating and deleting player A's rows gets nothing or an error. The list of tables is read from the database, so a new table can't be forgotten.
2. Every function in the database that is granted to `authenticated` is on a reviewed list in the test file. A new function fails the test until it is added on purpose.
3. The card's keys match the list exactly (§3).
4. The three-player test and the removal test (§4).
5. `ask_friend` returns the same value for a real code, a wrong code, your own code and an existing friend's code.
6. The limits: the 11th ask in a day, the 6th waiting request and the 21st friend each fail cleanly.
7. The hostile avatar and the hostile name (traps 3 and 4).
8. With `share_milestones` off, a rank event writes no feed row.
9. A player with no friends sees the Fellowship list's empty state and nothing else social anywhere (no empty feed, no empty square figures).
