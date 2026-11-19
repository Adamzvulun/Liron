# 0050 — Friends learn from the deck

- **Status:** Accepted (Adam, 2026-11-18: "my friends can have access to the deck").
- **Date:** 2026-11-18
- **Answers:** PLAN.md task 2.1 (#322), "What a friend may learn"
- **Changes:** who may be added to `content_licensees` ([ADR 0029](0029-database-is-the-only-writer-of-rewards.md); [SUPABASE](../process/SUPABASE.md#adding-a-licensee)). Until now that was Adam only.

## Decision

Every friend Adam invites can read the Lingualism deck, with the same Caravanserai he has: the script lessons, the fountain, the storyteller, the coffee corner, the echo well, the word path, the phrases and the inn.

This is Adam's call, and it is settled. Options (a) and (b) in task 2.1 (a friend buys their own copy; friends get only what is ours) are no longer needed.

## What stays as it was

- **The deck stays out of the code.** Deck text and analysis never go into `content/`, the site's bundle or commits ([ADR 0011](0011-technical-corrections.md)). It stays in `sources/` and in the database, where only signed-in licensees can read it.
- **Waymark stays invite-only** ([ADR 0016](0016-invite-only-password-login.md)). Only people Adam makes an account for get in, so "every account" and "Adam's friends" are the same people.

## To build (the next version)

1. **Every account reads the deck without a step from Adam.** For example, a migration adds each new `auth.users` row to `content_licensees`, and adds every existing account once. Tests in `supabase/tests` must show that a new account can read deck rows and someone signed out cannot.
2. **FRIENDS.md and SUPABASE.md** say so. The "Don't add them to `content_licensees`" line goes.
3. **The non-licensee path stays honest.** If an account ever has no licence (for example, its row was deleted by hand), it must still never see "haven't been loaded" or hit a dead end. That is the rest of task 2.1's "Done when", kept as a safety net.

## Built (v1.1.0, 2026-11-18)

1. `20270107000000_every_account_reads_the_deck.sql`: the trigger `every_account_is_licensee()` replaces `first_account_is_licensee()`, and a backfill adds every existing account. Anonymous sessions still read nothing (`is_content_licensee()` refuses them).
2. FRIENDS.md, SUPABASE.md and RUNNING.md say so.
3. The road keeps every step for an account without the deck; those at doors that read it wait (`WaitReason` `deck`), and the doors say why (PLAN 2.1 has the reasoning).
