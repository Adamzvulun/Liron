# Friends: giving someone an account (task 2.3, #324)

For Adam. Waymark is invite-only (sign-ups are off in Supabase, [ADR 0016](../decisions/0016-invite-only-password-login.md)), so a friend gets in only through you: send them an invite link from the live site (below, [ADR 0052](../decisions/0052-invite-links.md)), and they make their own account. Making the account by hand in the Supabase dashboard of **`waymark-prod`** is the fallback.

**Why not an email invite?** Supabase's built-in email only reaches members of the project's team (you), at most 2 an hour ([SUPABASE](SUPABASE.md)). An invite or a "forgot your password" email to a friend never arrives. Sending to anyone would need our own mail server (custom SMTP), which is a decision for you: it may cost money and it shares your friends' addresses with a mail provider. Invite links need no email; a forgotten password still does, so until then you reset a friend's password by hand. The reset screen says so: "Didn't get it within a few minutes? Ask whoever invited you to reset your password."

Every step below is **untested**: nobody has done it on the real projects yet. Each is on Adam's checklist in STATUS.md. Fix this page if a button has moved. Checked against the code on 2026-11-18 (v1.1.0): the login screen's line, Settings' password change, the friend code, the license trigger and the cascade on every table that names a player.

## Inviting a friend: send a link (ADR 0052)

1. **Once:** in Vercel → Settings → Environment Variables, add `SUPABASE_SECRET_KEY`: `waymark-prod`'s secret key (Supabase → Project Settings → API Keys) for **Production**, `waymark-dev`'s for **Preview**. Redeploy, or wait for the next release.
2. **Each friend:** on the site, **Settings → Invite a friend → Create invite link**, then **Share** (or **Copy link**) and send it.
3. They open it, choose their own email and password, and they're in: signed in, reading the deck, and already your friend in the Fellowship.

The page they open says who sent it (your name in the game, if you chose one), and the link shows a preview card in WhatsApp and Messages. Send links from the live site: the dev site is private to your Vercel account, so a friend can't open its links.

Only an **inviter** sees "Invite a friend". The release's migration makes the project's oldest account the inviter, which on `waymark-prod` should be yours. If Settings doesn't show it, make yourself one in Supabase → `waymark-prod` → **SQL Editor** (with your email):

```sql
insert into public.inviters (user_id)
select id from auth.users where email = 'you@example.com'
on conflict do nothing;
```

The same line, with a friend's email, lets that friend invite people too ([ADR 0052](../decisions/0052-invite-links.md) §5).

A link works once, for 7 days. If one expires, make another. The way below, by hand in the dashboard, still works, and is the fallback.

## Your first friend, in order (task 3.7)

1. **v1.1.0 is live:** you merged its release PR and the **DB migrate** run on `main` is green. That run makes every account a licensee.
2. **Realtime:** on both projects, **Realtime → Settings → Allow public access** is off ([RUNNING](RUNNING.md#friends)). Check it once; it stays off.
3. **Their account:** send them an invite link (above). Without the secret key in Vercel, "Make a friend's account" below. Either way the deck opens for them by itself.
   - **To check, if you like:** Supabase → `waymark-prod` → **SQL Editor**, run `select email from auth.users where id not in (select user_id from public.content_licensees);`. No rows means every account reads the deck. It only reads; it changes nothing.
4. **Become friends in the game:** with an invite link, you already are. Otherwise you both open **Your House → Fellowship**; one of you types the other's friend code, and the other accepts.
   - **What a friend sees of you:** your card (name, look, level, title, streak, ranks and achievements) and, since v1.4, how your room is arranged: which pieces stand where, the wallpaper and the floor. Not what you own but haven't placed. Since v1.5 they also see your room's coziness: how many different pieces, wallpapers and floors it has ever held, as a number and its name, never the list. Since v1.6, once you open your roof, they see how it's arranged too, and your coziness counts both rooms. A visit itself sends you nothing; since v1.5 a friend can choose to leave you a note at your letterbox, one from a fixed set (no free text), at most one a day. Only the two of you ever see it: you in your letterbox and on your Notice Board ("Basma stopped by your room"), they when they open your letterbox that day. Notes from someone who is no longer your friend are hidden, and every note is deleted after 60 days. Tell a friend this before they join.
5. **Try the wire, on two devices:** both open the Signal Tower's **Sending** and press **Key to a friend**, pick each other, and key a few letters. Then tell Claude what you heard and saw (release checklist §6).

## Make a friend's account

1. Supabase → `waymark-prod` → **Authentication → Users → Add user → Create new user**.
2. Their email, and a password you make up (at least 8 characters; a password manager's generator is fine). Tick **Auto Confirm User**, so no email is needed.
3. Send them the address of the site, their email and the password, in a private message or in person, never in a group.
4. Tell them: sign in, then **Settings → Change password**. From then on only they know it.

**Friends get the deck** ([ADR 0050](../decisions/0050-friends-learn-from-the-deck.md)). Since v1.1.0, every account becomes a licensee the moment it's made (`20270107000000_every_account_reads_the_deck.sql`), so there's nothing more to do.

## A friend forgot their password

The emailed link won't reach them, so you set a new one and tell them, as when you made the account.

- **Dashboard:** **Authentication → Users** → their row. If it offers a way to set a password, use it.
- **If it doesn't:** **SQL Editor**, then run (with their email and a new password):

  ```sql
  update auth.users
  set encrypted_password = extensions.crypt('the new password', extensions.gen_salt('bf'))
  where email = 'friend@example.com';
  ```

  Supabase keeps passwords as bcrypt hashes from `pgcrypto`, which this uses. Check it worked by signing in with it yourself in a private window, then sign out.

Then they change it again in Settings.

## You forgot yours

Your own "Forgot your password?" → "Send reset email" works, because you own the project. If it doesn't arrive, do the same as for a friend.

## A friend says the Arabic lessons are closed to them

The Caravanserai says "This account can't read the deck yet: ask whoever invited you." That only happens if their row in `content_licensees` was deleted by hand (or v1.1.0's migration hasn't run on that project). Add it back with the SQL in [SUPABASE](SUPABASE.md#adding-a-licensee); they reload the page. The rest of the city works for them meanwhile.

## Remove a friend, and everything of theirs

**Authentication → Users** → their row → **Delete user**. Their progress, wallet, reviews, chats, chests and allowances go with the account (`on delete cascade` on every player table). Nothing of theirs is kept.
