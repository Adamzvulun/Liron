# sources/: raw learning material

Original files (books, decks, audio, lists) exactly as obtained. **We never edit files here.** Processed, app-ready data goes in `content/` (created when we build the importer).

```
sources/
├── _inbox/        ← drop new files here; Claude sorts them
├── arabic/
│   └── <source-name>/   one folder per source: the files + a README.md
└── morse/
```

## Adding something new
1. **Upload it to `sources/_inbox/`:**
   - **Under 25 MB:** on github.com, open `sources/_inbox`, then *Add file → Upload files*.
   - **25–100 MB:** either use **GitHub Desktop** (copy the file into the folder, then commit and push), or split it with 7-Zip/WinRAR into parts under 25 MB and upload the parts.
   - **Over 100 MB:** GitHub blocks this. Tell Claude and we'll pick another route.
2. **Tell Claude.** Claude moves the file into the right subject folder, writes its `README.md` (what it is, where it came from, cost, license, structure), and removes it from the inbox.

## Rules
- **This repo must stay private**, because some sources are paid or copyrighted (ADR 0008).
- **Every source folder has a `README.md`** with: what it is, origin, date obtained, cost, license or terms, structure, and known caveats.
- **Avoid re-uploading big files.** Git keeps every version forever, so replacing a 35 MB file adds another 35 MB to the repo.
- **The website never serves these files directly.** The deployed site is reachable by anyone who has its URL, so content reaches users through the database, behind login (ADR 0008).
