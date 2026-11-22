# 0054 — The repo goes public

- **Status:** Accepted (Adam, 2026-11-22: "I am not setting up a new repo. I want to make it public, make it happen.")
- **Date:** 2026-11-22
- **Amends:** [ADR 0008](0008-content-sourcing.md) ("the repo must stay private") and [ADR 0011](0011-technical-corrections.md) #5 (raw files in `sources/` in this private repo).

## Context

GitHub Actions minutes cost money on a private repo. Standard GitHub-hosted runners, the 2-core arm64 Linux runner CI uses among them, are free on public repositories ([GitHub, 2026 pricing changes](https://github.com/resources/insights/2026-pricing-changes-for-github-actions); [runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)).

The repo held one thing that may not be published: Adam's purchased copy of the Lingualism Palestinian Colloquial Arabic Vocabulary deck (the Anki file with its 4,823 recordings, the book PDF and the quick-start PDF) in `sources/`, and, in history only, an early speech spike's results and synthesized clips built from deck sentences (`spikes/`). Everything else was written to be public from the start: `content/` holds only deck ids and our own words (ADR 0011), the site's bundle is public anyway, and the database is protected by row-level security, not by the repo's privacy. A scan of the whole history (2026-11-22) found no keys or tokens, and every commit uses a GitHub noreply address.

Claude recommended a fresh public repo, because old commits stay reachable on GitHub through pull-request references even after history is rewritten. Adam chose to keep this repo.

## Decision

1. **Raw sources are never committed.** `.gitignore` keeps everything in `sources/` out except each source's `README.md` and the folders' `.gitkeep`; `tests/sources.test.ts` fails if any other file there is tracked, or any `.apkg` anywhere. The files stay on the machine that imports them; the deck's content keeps reaching players only from Supabase, behind login (ADR 0008, ADR 0050).
2. **History is rewritten** with `git filter-repo` to remove the three deck files and `spikes/`, and every branch is force-pushed.
3. **Before the switch to public,** GitHub Support is asked to dereference the pull requests whose commits still hold the old files and to purge cached views ([Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)). Only Adam can file that request. Until Support confirms, the repo stays private.
4. Adam switches the repo to public in Settings.

## Consequences

- **Cheaper:** CI's minutes are free.
- **Public:** every doc, ADR, issue and pull request, with Adam's name on them. The deck's content is not: it stays in the database.
- **Harder:** a fresh checkout has no deck. The tests that read it (`tests/lesson-words.test.ts`) skip in CI and run where the file is present; re-importing needs Adam's own download from lingualism.com put back in its folder.
- **Every commit id changes** with the rewrite. Any other clone (Adam's, a cloud session's) must be cloned again, not pulled.
- **No licence file** means others may read the code but not reuse it. A licence is Adam's call.

## Amendment (2026-11-22)

Steps 1 and 2 are done. Adam chose to make the repo public without steps 3 and 4: the `v1.0.0` tag still points at the old history, and GitHub Support was not asked to dereference the old pull-request refs. Both still reach the deck. Deleting the tag, or asking Support later, would close that.
