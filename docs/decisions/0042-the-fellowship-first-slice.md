# 0042 — The Fellowship's first slice: codes, cards and visits

- **Status:** Accepted (Claude, 2026-11-17, tasks 3.1 and 3.2, #326 #327; built to [fellowship-build.md](../game/fellowship-build.md), which carries Adam's answers in [ADR 0039](0039-fellowship-answers.md). The few choices that document left open were made as Adam would, and are listed below for him to overturn.)
- **Date:** 2026-11-17

## Context

Friends are the first time one player's data reaches another player's screen. fellowship-build.md sets the rules: no views, functions that name every field, five traps and nine tests. This ADR records how the first slice (friend codes, the Fellowship list, visiting a house) was built to those rules, and the choices made along the way.

## Decision

1. **Three tables, read-only to their players, written only by functions** (migration `20261230000000_fellowship.sql`):
   - `friend_codes` holds your code;
   - `friendships` holds one row per pair (`low < high`);
   - `fellowship_limits` holds the day's asks and new codes.
2. **The doors are seven functions:** `my_friend_code`, `new_friend_code`, `ask_friend`, `answer_friend`, `remove_friend`, `fellowship` and `fellowship_requests`. Each uses `auth.uid()` and takes no player id except the friend it acts on.
3. **The card holds exactly nine fields:** `id`, `me`, `name`, `look`, `title`, `level`, `streak`, `ranks` and `achievements`. The pet is part of `look`. The level is computed from XP in the database, and XP itself never leaves. `ranks` are read from the `rank-…` events, never from subject state. A test compares the keys exactly.
4. **Codes are 8 characters from 31**, with no 0, O, 1, I or L. They're drawn from random bytes. A code reads as `ABCD-EFGH` and can be typed in any case, with or without the dash or spaces.
5. **Choices the design left open, made here:**
   - **Your own waiting requests are never listed to you.** If they were, asking would reveal whether a code was real (trap 5). The answer to a request says so: "If that code is right, they’ll see your request."
   - **Asking someone who already asked you makes you friends** at once, without a second step.
   - **The limits** fail with a plain reason and say nothing about the code: 10 asks a day (wrong codes count), 5 of your requests waiting, 20 friends, 3 new codes a day.
   - **Names:** a new name with control or direction characters is refused (`profiles_display_name_plain`, `not valid` so old names don't block the migration), and every name is cleaned on its way to a friend.
   - **A friend's look** goes through the same schema as your own, and gear is kept only if it exists in the catalog in the right slot (`parseOthersLook`). Ownership isn't checked for a friend's look.
   - **A friend's house is `/house/visit/<id>`.** It is painted from their card alone. No wardrobe is rendered, and the room has no buttons. A player who isn't a friend finds "This door is closed."
   - **The test stand-in now grants what Supabase grants by default** (task 2.4), so a forgotten `revoke` on any of these fails a test.
6. **Accepted, as fellowship-build.md §4 says:** a rank event is reported by the subject in the browser, so a determined friend could claim a rank they didn't earn. That is acceptable for a circle of friends.

## Consequences

- Two players can link by code, see each other's cards, visit, and unlink from either side. A stranger reads nothing (the three-player test).
- No email is involved: Adam makes each account by hand ([FRIENDS.md](../process/FRIENDS.md)).
- The feed, friends in the square, challenges, gifts and live Morse (3.3–3.6) build on these tables and functions. Each new function joins the reviewed list in `isolation.test.ts`.
