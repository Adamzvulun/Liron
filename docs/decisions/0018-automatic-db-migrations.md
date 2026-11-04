# 0018 — Database migrations apply themselves from GitHub Actions

- **Status:** Accepted (Adam, 2026-11-02: "I don't want to do things by hand unless impossible otherwise")
- **Date:** 2026-11-02
- **Amends:** [0017](0017-player-data-schema.md) (it had migrations applied by hand in the SQL editor)

## Context
Migrations live in `supabase/migrations/` (ADR 0017). We have two Supabase projects: `waymark-dev` for `dev` and `waymark-prod` for `main` (ADR 0015). Adam wants merges to apply them, not copy-paste.

Checked on 2026-11-02 in Supabase's and GitHub's docs, and by running the CLI here:
- `supabase db push --db-url <connection string>` applies the migrations a database doesn't have yet. It records each one in `supabase_migrations.schema_migrations`, has `--dry-run`, and needs no `supabase link` or account token.
  - Tested against a local Postgres 16 with our auth stand-in: the dry run listed the migration, the real run applied it and backfilled the existing user, and a second run said "Remote database is up to date".
- GitHub's runners only have IPv4. Supabase's direct connection is IPv6-only on the free plan, but the **session pooler** (port 5432) works over IPv4 on every plan and supports everything a migration needs.
- **GitHub Environments** (environment-scoped secrets) aren't available for private repos on GitHub Free, so the secrets are repository secrets.

## Options considered
1. **Supabase's GitHub integration** ("Deploy to production", works on any plan): no workflow to maintain. Rejected: Supabase's GitHub app would get read access to the whole private repo, including the copyrighted `sources/` (ADR 0011). Their docs also don't say whether one repo can feed two projects from two branches.
2. **Supabase's recommended Actions setup** (`supabase link` + `db push`): needs a personal access token in addition to the database password. That's more credentials than we need.
3. **Actions + `supabase db push --db-url`.** Chosen. Only a database connection string per project, stored as a GitHub secret.

## Decision
- `.github/workflows/db-migrate.yml` runs when a push to `dev` or `main` touches `supabase/migrations/`. It can also be started by hand.
  - `dev` goes to `waymark-dev` (secret `SUPABASE_DEV_DB_URL`); `main` goes to `waymark-prod` (secret `SUPABASE_PROD_DB_URL`).
  - It shows the pending migrations (dry run), then applies them. Runs never overlap and are never cancelled midway.
- The CLI version is pinned (2.121.0), and the action is pinned to a commit.
- **Never apply a migration by hand** in the SQL editor. The history table wouldn't know about it, and the next push would try to apply it again and fail.

## Consequences
- **Credentials in GitHub:** two repository secrets hold database connection strings, including the passwords. They give full control of each database, and only workflows in this repo can read them. Pull requests from forks don't get them. *Corrected 2026-11-04:* a workflow on any branch pushed to this repo can read them, so anyone who can push can reach them (security review M1).
- **Adam's one-time step:** add the two secrets (GitHub → Settings → Secrets and variables → Actions). It can't be automated: Claude has no tool to set GitHub secrets and must never receive passwords in chat. Steps: [SUPABASE](../process/SUPABASE.md#migrations).
- Merging a migration into `dev` changes the dev database; releasing to `main` changes production. The schema tests (PGlite) run in CI before either.
- Cost: a run takes well under a minute of the free Actions allowance ([CI](../process/CI.md)).
