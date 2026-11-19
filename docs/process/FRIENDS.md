# Friends: giving someone an account (task 2.3, #324)

For Adam. Waymark is invite-only (sign-ups are off in Supabase, [ADR 0016](../decisions/0016-invite-only-password-login.md)), so every friend's account is made by you, by hand, in the Supabase dashboard of **`waymark-prod`**. Do the same in `waymark-dev` if a friend should try the dev site.

**Why not an email invite?** Supabase's built-in email only reaches members of the project's team (you), at most 2 an hour ([SUPABASE](SUPABASE.md)). An invite or a "forgot your password" email to a friend never arrives. Sending to anyone would need our own mail server (custom SMTP), which is a decision for you: it may cost money and it shares your friends' addresses with a mail provider. Until then, you give friends a password yourself. The login screen says so: "Nothing after a few minutes? Ask whoever invited you to set a new password."

Every step below is **untested**: nobody has done it on the real projects yet. Each is on Adam's checklist in STATUS.md. Fix this page if a button has moved. Checked against the code on 2026-11-18 (v1.1.0): the login screen's line, Settings' password change, the friend code, the licence trigger and the cascade on every table that names a player.

## Your first friend, in order (task 3.7)

1. **v1.1.0 is live:** you merged its release PR and the **DB migrate** run on `main` is green. That run makes every account a licensee.
2. **Realtime:** on both projects, **Realtime → Settings → Allow public access** is off ([RUNNING](RUNNING.md#friends)). Check it once; it stays off.
3. **Their account:** "Make a friend's account" below. That's all: the deck opens for them by itself.
   - **To check, if you like:** Supabase → `waymark-prod` → **SQL Editor**, run `select email from auth.users where id not in (select user_id from public.content_licensees);`. No rows means every account reads the deck. It only reads; it changes nothing.
4. **Become friends in the game:** you both open **Your House → Fellowship**. One of you types the other's friend code; the other accepts the request.
5. **Try the wire, on two devices:** both open the Signal Tower's **Sending** and press **Key to a friend**, pick each other, and key a few letters. Then tell Claude what you heard and saw (release checklist §6).

## Make a friend's account

1. Supabase → `waymark-prod` → **Authentication → Users → Add user → Create new user**.
2. Their email, and a password you make up (at least 8 characters; a password manager's generator is fine). Tick **Auto Confirm User**, so no email is needed.
3. Send them the address of the site, their email and the password, in a private message or in person, never in a group.
4. Tell them: sign in, then **Settings → Change your password**. From then on only they know it.

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
