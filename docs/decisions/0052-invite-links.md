# 0052 — Invite links

- **Status:** Accepted (Adam, 2026-11-19: "Yes build it and do it so I won't need to do anything except sending the person a link").
- **Date:** 2026-11-19
- **Changes:** how a friend gets an account ([ADR 0016](0016-invite-only-password-login.md)). Waymark stays invite-only and sign-ups stay off; making accounts by hand in the Supabase dashboard ([FRIENDS](../process/FRIENDS.md)) is now the fallback, not the way.

## Context

Until now Adam made each friend's account in the Supabase dashboard, made up a password, and sent it with the email and the site's address. Supabase's built-in email reaches only the project's team, so an emailed invite never arrives (ADR 0016), and sending real mail would need a paid mail service that sees friends' addresses.

## Decision

1. **Settings → Invite a friend** (only for an inviter): **Create invite link** makes a link, `https://<site>/join#<code>`. **Share** opens the phone's share sheet (WhatsApp, Messages…); **Copy link** works everywhere.
2. **The link opens "Create your account":** the friend types their own email and a password (with Confirm password). `api/join.ts` makes the account with Supabase's admin API (`POST /auth/v1/admin/users`, `email_confirm: true`), so no email is sent. The page then signs them in.
3. **They're friends at once.** Joining makes the new player and the inviter friends in the Fellowship, unless either already has 20.
4. **Each link works once, for 7 days.** At most 20 open links per inviter. The code is 244 random bits; the database keeps only its SHA-256 (`public.invites`). The code sits in the link's fragment, so it never reaches a server log.
5. **Who may invite:** the project's first account, Adam's (`public.inviters`). Another inviter can be added by hand: `insert into public.inviters (user_id) select id from auth.users where email = '…';`.
6. **Only the server uses a link.** A visitor who isn't signed in calls no database function (the isolation test); the join page asks `api/join.ts`, which alone may call `invite_open`, `claim_invite`, `release_invite` and `finish_invite` (granted to `service_role` only).

## Amended 2026-11-20: a link that looks like it's from a friend

- The join page says who sent it: "Adam invited you to Waymark." The check in `api/join.ts` also calls `invite_from` (`service_role` only), which gives the inviter's chosen name while the link can still be used, and nothing for a used or expired one. Only whoever holds the link sees it, and the inviter chose to send it.
- The link shows a preview card in chat apps: `public/og-image.png` (the sign-in gate, drawn by `scripts/og-image.ts`) and Open Graph tags in `index.html`. Apps want the card's whole address, so Vite fills it from Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, which follows the live site's own domain once there is one.

## What it needs, once

**`SUPABASE_SECRET_KEY` in Vercel** (Settings → Environment Variables, no `VITE_` prefix): `waymark-prod`'s secret key for **Production**, `waymark-dev`'s for **Preview**. Until it's there, the join page says "Invites aren't set up on this site yet." and nothing else changes.

## What it costs and shares

- **Money:** nothing. One more Vercel function on the free plan; no mail service.
- **Data:** none new. The friend's email goes from their browser to our own function and on to our own Supabase project, as a sign-in already does.
- **The key:** the secret key can do anything in the project, so it lives only in Vercel's server-side variables, is read only by `api/join.ts`, and is sent only to the project's own URL. It is already a GitHub secret for the DB migrate run.
- **Lock-in:** none. Removing the function and the migration's tables brings back the dashboard way.

## Considered and not chosen

- **Supabase's `generateLink`** (an invite link without email): it ties the link to an email Adam must type first, and an old report says it can come back empty on a project without its own mail setup.
- **Turning sign-ups on, gated by a trigger that checks a code:** two auth settings to change on each project, and a mistake there opens sign-ups to anyone.
- **Writing the account straight into `auth.users`:** no key needed, but Supabase doesn't support it, and it can't be tested here against the real auth server.
