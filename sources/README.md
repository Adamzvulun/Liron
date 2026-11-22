# sources/: raw learning material

Original files (books, decks, audio, lists) exactly as obtained. **We never edit files here, and they are never committed:** the repo is public (ADR 0054), so git tracks only each source's `README.md`. The files themselves stay on the machine that imports them, and their content reaches players only through the database, behind login. Processed, app-ready data goes in `content/` (created when we build the importer).

```
sources/
├── _inbox/        ← drop new files here; Claude sorts them
├── arabic/
│   └── <source-name>/   one folder per source: the files + a README.md
└── morse/
```

## Adding something new
1. **Send the file to Claude in the session** (attach it), or put it in `sources/_inbox/` on the machine doing the import. Never upload it to GitHub: the repo is public.
2. Claude moves it into the right subject folder and writes its `README.md` (what it is, where it came from, cost, license, structure). Only the README is committed; `.gitignore` keeps the file out, and `tests/sources.test.ts` fails if one gets in.
3. A paid or copyrighted source is imported into Supabase by script (`scripts/content/`), behind login, as before.

## Rules
- **Raw files are never committed.** The repo is public (ADR 0054), and some sources are paid or copyrighted. A fresh checkout has only the READMEs: to re-import, put the original file back in its folder (for the Lingualism deck, Adam's own download from lingualism.com).
- **Every source folder has a `README.md`** with: what it is, origin, date obtained, cost, license or terms, structure, and known caveats.
- **The website never serves these files directly.** The deployed site is reachable by anyone who has its URL, so content reaches users through the database, behind login (ADR 0008).
