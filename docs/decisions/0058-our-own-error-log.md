# 0058 — Our own error log

- **Status:** Accepted (2026-11-23). Adam chose our own log in Supabase over Sentry.
- **Date:** 2026-11-23
- **Research:** [next-work-2026-11-23.md](../research/next-work-2026-11-23.md) §3

## Context

Waymark reports no errors. A crash on a friend's phone is seen only if they tell Adam. Friends are coming (#332).

## Options

| | Our own log (Supabase) | Sentry, free Developer plan |
|---|---|---|
| **Cost** | Free, inside the 500 MB we have | Free: about 5,000 errors a month, one user, 30 days of history (a 2026-11-18 pricing review; not confirmed on Sentry's own page) |
| **Data** | Stays in our database | Pages, browsers and stack traces go to Sentry |
| **Tooling** | A small table, read in the Supabase dashboard | Grouping, alerts, source maps, releases |
| **Lock-in** | None | An SDK in the bundle (tens of kB) and an account |

## Decision

Our own log.

- **Writing.** A `window.onerror` and `unhandledrejection` handler, plus React's error boundary, send one row to `report_error()`. That's a `security definer` RPC, allowed to signed-in players only.
- **What a row holds.** The message, the first 10 lines of the stack, the route, the app version, the browser's user agent, and the time. **Never** anything the player typed or said.
- **Caps.** Each player can write 20 rows a day, and the same message is written once a day. The table keeps the newest 2,000 rows.
- **Reading.** No player can read the table (row-level security with no select policy). Adam reads it in the Supabase dashboard's Table Editor, which uses the service role. There's no in-game page: that would need a keeper role Waymark doesn't have.
- **If we ever switch.** Moving to Sentry would take a new ADR replacing this one; the handler would then send there instead.

## Consequences

- One migration, one RPC and the handler. No new page.
- `RUNNING.md` says where to look.
- No new vendor, so nothing new to agree to.
