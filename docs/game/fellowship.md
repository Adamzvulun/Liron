# The Fellowship: friends in Waymark (M5), a proposal

- **Status:** proposal (2026-11-14), questions answered by [ADR 0039](../decisions/0039-fellowship-answers.md) (2026-11-15): option (a), §3 as written, visits before challenges, live Morse last, built after v1.0.0. Nothing is built yet.
- **Builds on:** the vision ("friends can join … friendly, no demotion leagues"), [discovery 04 §7](../discovery/04-world-and-lore.md), [ADR 0016](../decisions/0016-invite-only-password-login.md) (invite-only login), and the roadmap's E18–E20.

## 1. What it is
Friends join Adam's Waymark by invitation and become his **Fellowship**. They learn their own subjects at their own pace. What they share is the city: they see each other in the square, visit each other's house, read a party feed ("Adam reached Operator!"), take on opt-in challenges ("beat my callsign run"), share co-op goals ("together, 10 chats at the inn this week"), and, last, key Morse to each other live in the Signal Tower. There are no leagues and no demotions: personal bests come first.

## 2. Getting a friend in without paying for email
Supabase's built-in email only reaches the project's team members, at 2 emails an hour (ADR 0016). So an invite email can't reach a friend unless we add a mail service. There are two ways:

- **(a) No email (my pick, free):** Adam creates the friend's account himself in the Supabase dashboard (Authentication → Add user → create, already confirmed), with a starting password he gives them in person. They log in and change it in **Your House → Change your password** (new: one form, `supabase.auth.updateUser`). If they forget it, Adam sets a new one in the dashboard. The admin API documents this pattern: `createUser` with `email_confirm: true` sends no email ([Supabase docs](https://supabase.com/docs/reference/javascript/auth-admin-createuser)). The dashboard's checkbox label may differ, so we try it once on the dev project.
- **(b) A mail service, so invites and resets arrive by email:** Supabase takes custom SMTP on the free plan (it then allows 30 emails an hour). The free mail services need **a domain of our own** to send from: Resend gives 3,000 a month and 100 a day, for one verified domain. Waymark has none (it lives on `vercel.app`), and a domain costs money every year. Since that's a cost and a lock-in, I'd only do this if (a) proves annoying.

## 3. What a friend can see of you, and what they never see
- **Seen by your Fellowship:** your name in Waymark, your avatar and gear, your level, your ranks and titles, your streak, your achievements, your pet, the party feed of your milestones, and (since v1.4) your room as arranged, with (since v1.5) its coziness, a count of the different things it has ever held.
- **Never seen:** your reviews and answers, your chats at the inn (lines, what you told the regulars, the Coach's tips), your recordings, your email, anything from the Lingualism deck (ADR 0011), and your gold.
- **How:** a `friendships` table (two players, accepted or not) and a database view of the shared fields only. Row Level Security lets you read that view for your friends and yourself, and nothing else of theirs. The tables that exist today stay "your own rows only".

## 4. In what order (ordering is not cutting)
1. **E18 Invites:** the no-email path (a), Change your password, a friend code to link two accounts ("Add a friend": type their code, they accept), and the Fellowship list in Your House with each friend's avatar, level and ranks.
2. **E19 Social, in slices:** visiting a friend's house (their avatar, gear and trophies). Then the party feed on the Notice Board. Then friends' avatars in the square. Then opt-in async challenges built on existing scores (a callsign run, a word round), each showing both personal bests. Then co-op Fellowship quests on the daily-contract machinery (ADR 0032). Then gifting gear from the Market.
3. **E20 Live Morse:** two friends in the Signal Tower key to each other. The keying goes through Supabase Realtime, which the free plan allows: 200 connections at once and 100 messages a second ([limits](https://supabase.com/docs/guides/realtime/limits)), far more than a few friends need. Each side's key-down and key-up are sent with their timing, and the other side plays them as tones.
4. **The Arena** (A7) opens with the challenges, as their home in the square.

## 5. What it costs and shares
- **Money:** nothing with (a). Supabase's free plan holds a few friends easily (500 MB). The one cost is (b), if Adam picks it: a domain each year.
- **Data:** friends' accounts live in our Supabase like Adam's. Each friend's email is seen by Adam (he creates the account) and by Supabase. What friends see of each other is §3. Nothing new goes to an AI provider: a friend who sits and talks at the inn sends their own lines to Groq, the same as Adam does, and is told so on the same screen.
- **Lock-in:** none new.

## 6. Questions for Adam
1. **Invites:** (a) you create each friend's account and hand them a password (free, my pick), or (b) a mail service and a domain, so invites and resets come by email (yearly cost)?
2. **What friends see:** is §3's list right? In particular: your **streak** and your **pet**, yes or no? And your **level**, or only your ranks?
3. **Who first:** how many friends, roughly, and do they learn Arabic, Morse, or something else? That decides whether challenges come before the visits.
4. **Live Morse:** worth building early (it's the most fun, and the hardest), or last as ordered?
5. **When:** after v1.0.0 (my pick, so friends join a released Waymark), or now on the dev site?
