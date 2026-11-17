# Two players, one database (task 2.4, #325), 2026-11-17

What was checked before friends join, and how. The tests are in `supabase/tests/isolation.test.ts`. They run the real migrations in PGlite, and every list is read from the database, so a new table or function fails them until someone reviews it.

## The stand-in now grants what Supabase grants

A Supabase project grants every new table, sequence and function in `public` to `anon` and `authenticated` unless a migration revokes it. The test stand-in (`supabase-shim.sql`) didn't, so a forgotten `revoke` would have passed. It now uses the same default privileges. All 170 database tests still pass, so every migration so far revokes what it should.

## What the tests prove

| Check | Result |
|---|---|
| Every table is either a player's own (20) or shared on purpose (11) | Pass |
| Every table has row-level security on | Pass |
| A logged-out visitor can read or write no table | Pass |
| A player writes no table directly except `profiles` (their name and look); everything else goes through the functions | Pass |
| Every policy names the player (`auth.uid()`) or the licence (`is_content_licensee()`) | Pass |
| For each of the 20 player tables, both ways round: the other player's rows can't be read, updated, deleted, moved to yourself, or written in their name, and they're unchanged afterwards | Pass |
| The functions a player can call are exactly the 26 reviewed ones, each with what it touches and its limit | Pass |
| A logged-out visitor can call only the pure ones (constants and arithmetic) | Pass |
| The other player's chest can't be opened | Pass |

The test file was checked against a deliberate leak: a migration adding an open policy, a direct insert grant and a new function made four tests fail, and a table created without a `revoke` made three fail.

## The per-player limits on the server functions

| Function | Limit |
|---|---|
| `api/understood.ts` | `claim_speech_check`: 100 a day each, the licensee only, plus the site's 1,500 (ADR 0041) |
| `api/partner.ts` (radio) | `claim_partner_reply`: 40 a day each, plus the site's 500 |
| `api/partner.ts` (inn, Coach) | `claim_chat_line`: 60 a day each, plus the site's 150 |
| `api/services.ts` | Reads only which keys are set; it calls no provider |
| `record_progress`, `save_session` | Bounded amounts per call, 3,000 XP a day, one save per session id |
| `buy_item`, `open_chest` | The caller's own gold and chests |

## Findings

- **Fixed:** the stand-in's missing default grants (above).
- **Accepted:** `site_ceiling` and the three `*_per_day` functions can be called by anyone. They return constants that are no secret.
- **Nothing else found.**

The Fellowship's own tables and functions (Phase 3) join these lists as they're built. fellowship-build.md §6 has the rest of its tests.
