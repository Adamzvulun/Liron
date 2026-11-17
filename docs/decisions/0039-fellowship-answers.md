# 0039 — The Fellowship's five questions answered (M5)

- **Status:** Accepted (2026-11-15, by Claude; Adam said "the 5 fellowship questions, you can decide whatever you want". Each call is easy to change before M5 is built.)
- **Date:** 2026-11-15
- **Builds on:** [0016](0016-invite-only-password-login.md) (invite-only login) and the proposal in [fellowship.md](../game/fellowship.md).

## Context
The Fellowship proposal (2026-11-14) ended with five questions for Adam (§6). On 2026-11-15 he left them to Claude. He also said the next goal is v1.0.0: polish until he is satisfied, then release. So nothing here is built before v1.0.0.

## Decision
1. **Invites: no email (option a).** Adam creates each friend's account in the Supabase dashboard, already confirmed, and gives them a starting password in person. They change it in Your House. A mail service needs a domain, which is a yearly cost and a lock-in, so it comes back to Adam as a question only if option (a) proves annoying.
2. **What friends see: §3's list as written.** That means your level, ranks, titles, streak, achievements, pet, avatar and gear, and the feed of your milestones. Everything on it is something you earned, and none of it says how you learn. Your answers, reviews, chats, recordings, email, gold and anything from the deck stay private.
3. **Who first: unknown, so visits before challenges.** Visiting a house works whatever a friend learns. Challenges come after, built for both subjects (a callsign run and a word round). Once Adam knows who is joining, he can reorder.
4. **Live Morse: last, as ordered.** It is the most fun and the hardest part, and Supabase Realtime would be a new technology that needs its own ADR. Building it last means it lands on top of friendships and visits that already work.
5. **When: after v1.0.0.** Friends join a released Waymark, not the dev site.

## Consequences
- M5 (E18–E20) starts after v1.0.0. Until then, the work is polishing toward v1.0.0.
- `friendships` and the shared view still need their own migration and RLS tests when E18 is built.

## Undoing it
Each answer is a doc change until E18 starts. After that: switching to option (b) adds a mail service, and narrowing what friends see is a change to the shared view.
