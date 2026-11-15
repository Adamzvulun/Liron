# Supabase setup (issue #16)

Two free projects ([ADR 0015](../decisions/0015-branches-and-environments.md)): **`waymark-prod`** for the live site (`main`) and **`waymark-dev`** for the dev site and PR previews. Login works as described in [ADR 0016](../decisions/0016-invite-only-password-login.md).

Facts checked on supabase.com on 2026-11-02:
- The free plan has 2 active projects, a 500 MB database and 50,000 monthly active users. **Projects pause after 1 week without activity**; you restore them in the dashboard and the data is kept.
- The **publishable key** (`sb_publishable_…`) is made for browsers: "safe to expose", and Row Level Security decides what it can reach. The older `anon` key is being phased out by the end of 2026, so we use the publishable one.
- Supabase's **built-in email** only sends to members of the project's team, at most **2 emails per hour**, and is "not meant for production". That's fine while Adam is the only user, since he owns the projects. Friends (M5, E18) will need a custom SMTP server; that's a decision for then.

## Steps for Adam (do both projects)
1. supabase.com → **New project**.
   - Name: `waymark-prod`, then again for `waymark-dev`.
   - Region: the one closest to you, e.g. Central EU (Frankfurt).
   - Database password: save it in your password manager. Waymark itself never needs it.
2. **Authentication → Sign In / Providers:**
   - **Email** on.
   - **Allow new users to sign up: off.** That's what makes it invite-only.
   - Leave "Confirm email" on.
3. **Authentication → URL Configuration → Site URL:**
   - `waymark-prod`: `https://waymark-phi.vercel.app`
   - `waymark-dev`: `https://waymark-git-dev-adamzvuluns-projects.vercel.app`
   - Under **Redirect URLs**, also add `http://localhost:5173` for running it locally.

   Emailed links send you back here.
4. **Connect** (top of the project page): copy the **Project URL** and the **publishable key**. They aren't secret, but they go in Vercel, not in git.
5. In **Vercel → waymark → Settings → Environment Variables**, add both variables. Uncheck "Development".
   - ⚠️ The names must start with **`VITE_`**. Supabase's Connect dialog suggests `NEXT_PUBLIC_…` names (that's for Next.js). Vite ignores those, and the site then says "Not set up yet". This happened on 2026-11-02. After renaming, **redeploy**, because variables only apply to new builds.
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` with the **`waymark-prod`** values, environment **Production** only.
   - The same two names with the **`waymark-dev`** values, environment **Preview** only.
6. After Claude's #16 PR is merged into `dev`, the dev site shows the login screen.
7. In **`waymark-dev`**: **Authentication → Users → Add user → Send invitation**, with your email. Open the link in the email and choose a password on the screen it opens.
   - If the invite refuses because sign-ups are off (Supabase's official docs don't say; third-party guides say an admin invite still works), switch sign-ups on, send the invite, and switch them off again. Since [ADR 0029](../decisions/0029-database-is-the-only-writer-of-rewards.md), an account made in that window still can't read the deck: only licensees can.
   - If the link lands on the login screen instead, type your email there and use **"Email me a link"**.
8. At the next release, do step 7 in **`waymark-prod`** too.

### Adding a licensee
Only accounts listed in `content_licensees` can read the Lingualism deck ([ADR 0029](../decisions/0029-database-is-the-only-writer-of-rewards.md)). Every account that existed when that migration ran was added, and so is the first account a fresh project ever gets. Since `20261221000000_harden_licensee_and_allowances.sql`, that applies only while no other account exists: if the licensee's row is ever deleted, add it back by hand, because nobody who signs up later gets it. To add someone else, in that project's **SQL editor** (this is data, not a schema change, so it's fine to run by hand):

```sql
insert into public.content_licensees (user_id)
select id from auth.users where email = 'their@email';
```

Only add people the deck's licence covers (ADR 0011).

## Migrations
Database changes are SQL files in [`supabase/migrations/`](../../supabase/migrations/), applied in name order. Never edit one that's already applied; add a new file instead. Schema: [ADR 0017](../decisions/0017-player-data-schema.md). (The first migration's header still says "Apply with the Supabase SQL editor": that predates ADR 0018 and is wrong, but the file stays as it was applied.)

**They apply themselves** ([ADR 0018](../decisions/0018-automatic-db-migrations.md)), and the [private content](#private-content) uploads right after: merging into `dev` updates `waymark-dev`, and a release to `main` updates `waymark-prod`, through `.github/workflows/db-migrate.yml`. **Never paste a migration into the SQL editor.** The migration history wouldn't know about it, and the next automatic run would fail.

**One-time setup (Adam), for each project:**
1. Supabase → the project → **Connect** → **Session pooler**, and copy the connection string. It looks like `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-…pooler.supabase.com:5432/postgres`.
   - Use the session pooler, not "Direct connection": GitHub's runners only have IPv4, and the direct connection is IPv6-only on the free plan.
2. Replace `[YOUR-PASSWORD]` with the project's database password, the one from project creation.
   - Forgotten it? Use **Project Settings → Database → Reset database password**.
   - If the password contains symbols such as `@ : / ? # %`, they must be percent-encoded (e.g. `@` → `%40`). A letters-and-digits password avoids this.
3. GitHub → Liron → **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_DEV_DB_URL` = the `waymark-dev` string
   - `SUPABASE_PROD_DB_URL` = the `waymark-prod` string

   Never paste these into chat; they contain the password.

If a run fails because a secret is missing, add it and start the workflow again: **Actions → DB migrate → Run workflow** on the right branch, or ask Claude, who can start it.

## Private content
Copyrighted content (the Lingualism deck) is uploaded to each project automatically, right after migrations ([ADR 0023](../decisions/0023-content-format-and-private-pipeline.md)). Only the licensee can read it (see above). The workflow needs each project's **secret key**.

**One-time setup (Adam), for each project:**
1. Supabase → the project → **Project Settings → API Keys** → **Secret keys** → copy the default secret key (`sb_secret_…`), or create one named `github-actions`.
2. GitHub → Liron → **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_DEV_SECRET_KEY` = the `waymark-dev` key
   - `SUPABASE_PROD_SECRET_KEY` = the `waymark-prod` key

   Never paste these into chat. A secret key bypasses row-level security and gives full access to the project.

If the content job fails because a key is missing, add it, then **Actions → DB migrate → Run workflow** on the right branch, or ask Claude to start it.

## Running it locally
Create `.env.local` (git-ignored) from [`.env.example`](../../.env.example) with the `waymark-dev` values. Without it, the app shows a "Not set up yet" screen that names what's missing.

## Tests
`supabase/tests/schema.test.ts` runs the migrations in PGlite (Postgres in WebAssembly, inside Vitest) and checks row-level security as a signed-in user, another user and a logged-out visitor.

The tests never touch a real project. The e2e build points at a fake address, and `e2e/fake-supabase.ts` answers the auth calls (login, logout, reset, set password). So CI needs no Supabase secrets.
