# 0023 — Content format, and copyrighted content behind login

- **Status:** Accepted (part of #23; Adam approved storing the deck in Supabase and the two secret keys, 2026-11-02)
- **Date:** 2026-11-02
- **Builds on:** [0011](0011-technical-corrections.md) #5 (copyrighted content only behind login), [0008](0008-content-sourcing.md), [0018](0018-automatic-db-migrations.md) (automatic deploys)

## Context
Content is data, not code (CLAUDE.md). #23 asks for one schema for items, lessons and media, used by both subjects and validated in CI. Our own content goes in `content/`. Copyrighted content (the Lingualism deck: 4,823 notes with MP3s) must never be bundled into the public site; it goes to Supabase and is served only to signed-in users. An import script turns a source into content records (E9, #44).

## Options considered
- **Schema:**
  - JSON Schema + Ajv: two languages to keep in sync with the TypeScript types.
  - **Zod**: chosen. The TypeScript types come from the schema itself, and the same code validates in tests, scripts and the app. `zod` 4.6.7: MIT, no dependencies, released 2026-10-12.
- **Private audio:**
  - Serve it through a Vercel function: an extra hop, and it would need the secret key at runtime.
  - **Supabase Storage, private bucket, read policy for signed-in users**: chosen. The browser fetches a short-lived signed link.
- **Uploading:**
  - By hand in the dashboard: rejected (Adam: nothing by hand unless impossible).
  - **A GitHub Actions job after migrations**: chosen.

## Decision
- **Format** (`src/core/content/schema.ts`):

  | Record | Holds |
  |---|---|
  | **Pack** | One file: subject, source, licence, items, lessons |
  | **Item** | `id` (stable forever), subject, `type` (the subject's own), `data` (the subject's own fields), `media`, `tags` |
  | **Lesson** | `id`, title, `order`, item ids |
  | **Media** | `kind` (audio, image), `store` (`public` or `private`), `path` |

  `checkPack` adds the rules across records: unique ids, one subject per pack, lessons point at real items, and **no private media in public content**.
- **Our own content** lives in `content/<subject>/*.json`. Every file is validated on each test run.
  - `content/morse/characters.json`: the 41 characters in LCWO Koch order (26 letters, 10 digits, `. , ? / =`) with their ITU codes, and 40 Koch lessons (K M, then one more character each).
  - `content/arabic/letters.json`: the 28 letters, ids from their Unicode names, with Arabic and Latin names, alphabet position and whether they connect forward. The Hebrew bridge and the teaching order come with #38 and #39; ADR 0002 marks the bridge details as still proposed.
- **Copyrighted content** (migration `20261103010000_private_content.sql`):
  - `content_items` and `content_lessons` tables: readable by signed-in users only; nobody writes them through the API.
  - A private `private-media` bucket (MP3 only, at most 5 MB per file). Its read policy allows signed-in users only.
- **Import:** `scripts/content/lingualism.ts` reads the `.apkg` directly. It uses only Node's built-ins: zstd and SQLite, plus a 60-line zip reader. It cleans the HTML fields and builds a pack:

  | Deck | Pack |
  |---|---|
  | Each note | an item `pcav:<order>` of type `vocab`: Arabic, pronunciation, English, section, CEFR tag, private audio |
  | Each of the 57 sections | a lesson |

- **Upload:** `scripts/content/upload-private.ts` checks the packs and enforces a **500 MB audio budget** (Supabase's free plan has 1 GB of storage per project; the deck is 35.8 MB). It then:
  - upserts the rows, and removes ones the source no longer has;
  - uploads only audio files the bucket doesn't have yet, 8 at a time (one at a time, the first full upload took about 26 minutes, over the job's 20-minute limit).

  It runs as the `content` job of the "DB migrate" workflow, after migrations, on pushes to `dev` (→ `waymark-dev`) and `main` (→ `waymark-prod`) that touch sources, content scripts, the schema or migrations.
- **Secrets:** `SUPABASE_DEV_SECRET_KEY` and `SUPABASE_PROD_SECRET_KEY`, Supabase's secret keys. They are used only in that job, never in the browser. The project URL is read from the database URL secret, so there's nothing else to configure.
- **Reading:** `loadPrivatePack` (items and lessons, paging past 1,000 rows) and `privateMediaUrl` (a one-hour signed link) in `src/core/content/privateContent.ts`.
- **Boundaries:** a subject may import its own `content/<id>/` files, but not another subject's (boundary test).

## Consequences
- **A copy of the deck sits in both Supabase projects** (Adam approved, 2026-11-02). Removing it means emptying the tables and the bucket; that could be a workflow step if ever needed.
- **The secret keys give full access to their project.** Only workflows on this repo's `dev` and `main` can read them; pull requests can't.
- **Friends (M5) would be able to read the deck too**, because any signed-in user can. Lingualism's terms are personal use, so this needs a per-user rule before friends join (E18).
- #44 is mostly done by this change. What's left there is choosing the first survival phrases (#45).
