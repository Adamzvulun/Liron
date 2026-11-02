# 0016 — Login: invite-only, email + password, with an emailed link for first time and resets

- **Status:** Accepted (part of #16; Adam can still switch to links only)
- **Date:** 2026-11-02

## Context
Progress lives in Supabase from day one, so you log in (ADR 0005, amendment). Sign-up is invite-only: just Adam for now, friends in M5 (ADR 0008, E18). No email notifications (ADR 0011), but Supabase's own login emails are fine (#16).

Supabase's built-in email sends at most **2 emails per hour**, and only to the project's team. A login that emails a link every time would hit that limit quickly across two devices and two projects.

## Options considered
1. **Magic link only:** no password, but every new login needs an email. Rejected because of the 2/hour limit.
2. **Email + password, with an emailed link only for the first time and for resets.** Chosen. Day to day it needs no email.
3. **Social login (Google, GitHub):** needs OAuth setup per project and shares login data with another provider. Not needed for one user.

## Decision
- **Sign-ups off** in both Supabase projects. People are invited from the dashboard.
- **Login screen:** email + password. "First time, or forgot your password? Email me a link" sends Supabase's reset email. It always answers the same way, so it doesn't reveal which emails have accounts.
- **Invite and reset links** open a "Choose a password" screen (at least 8 characters), then the lobby.
- **Sessions persist** in the browser and refresh themselves (supabase-js defaults, checked in its source), so you log in once per device. **Sign out** ends the session on that device.
- Client: `@supabase/supabase-js`, configured by `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` per Vercel environment ([SUPABASE](../process/SUPABASE.md)).

## Consequences
- Adam's one-time steps are in [SUPABASE](../process/SUPABASE.md).
- **Friends (M5)** need a custom SMTP server, because the built-in email only reaches team members. That may cost money, so it comes to Adam as a question then.
- Tables added later need Row Level Security, since the publishable key is public.
