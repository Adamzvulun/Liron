# CI (issue #14)

`.github/workflows/db-migrate.yml` applies database migrations on pushes to `dev` and `main` that touch `supabase/migrations/`, `sources/`, `scripts/content/` or `src/core/content/` (ADR 0018), or when run by hand. The `migrate` job takes well under a minute. A second job, `content`, then uploads the private content (ADR 0023); it has a 20-minute limit, and the first full upload took about 26 minutes.

`.github/workflows/ci.yml` runs on every pull request and on pushes to `dev` and `main` (branch flow: [ADR 0015](../decisions/0015-branches-and-environments.md)). It has one job: `npm ci` → lint → typecheck → unit tests → build → Playwright smoke test (Chromium, desktop and phone).

## Cost (checked 2026-11-02 on docs.github.com)
- The repo is **private**. GitHub Free for personal accounts includes **$12/month of Actions compute**. On the standard Linux runner ($0.006/min) that's about **2,000 minutes/month**.
- One CI run takes roughly 2–4 minutes (estimate; check the first real runs). Even 10 runs a day stays under ~1,200 minutes a month.
- To keep it cheap: one job, Chromium only, and a newer push to the same branch cancels the older run.
- **If the allowance runs out:** with no payment method on the GitHub account, runs are **blocked, not billed**, until the next month. With a payment method on file, spending is limited by the account's budgets. Check *Settings → Billing → Budgets* and set the Actions budget to $0 if you never want to pay.

## "A red check blocks merging": not available on our plan
GitHub's plan page lists **protected branches for private repositories as a GitHub Pro feature** (paid). Rulesets are described for Team and Enterprise. GitHub Free for personal accounts doesn't list either for private repos. So on Free, GitHub itself **can't** block merging on a red check in this repo.

**Decided (Adam, 2026-11-02): option 1, the process rule.**

1. **Process rule (free, chosen):** a PR with a red check doesn't get merged. Claude never merges or asks to merge one. The red ✗ still shows on the PR.
2. **GitHub Pro** (paid): then turn on the rule as below.
3. **Make the repo public:** not possible while copyrighted sources live in `sources/` (ADR 0011).

### Steps if the plan ever allows it
1. GitHub → the repo → **Settings → Branches → Add branch protection rule** (or **Settings → Rules → Rulesets → New branch ruleset**).
2. Branch name patterns: `main` and `dev`.
3. Turn on **Require status checks to pass before merging**, and pick the check **`check`** (the CI job name). It only appears in the list after CI has run once.
4. Optionally turn on **Require a pull request before merging**. Save.

## The speed budget (#137, #315; set 2026-11-16)

What a player feels when the site loads, each with a ceiling that CI enforces in `e2e/load-budget.spec.ts`. Times are taken on the production build, in a phone-sized window with the CPU slowed 4×.

| What | Measured 2026-11-16 | Ceiling |
|---|---|---|
| Script downloaded on the first visit (gzipped) | 172.9 kB | 199 kB (plus 15%) |
| The square is drawn and a place can be clicked, first visit | about 1.0 s | 13× the yardstick |
| The same on a later visit (the code is cached) | about 0.6–0.7 s | 13× the yardstick |
| Back to the square from a hall | about 0.5–0.6 s | 9.5× the yardstick |

- **The yardstick** is a fixed piece of work (sorting 60,000 numbers) timed on the same page in the same minutes: 71–80 ms here at its best. A shared runner can be slow for a whole test, so times are compared with it, not with a stopwatch. Each figure is the best of four rounds. Over eight runs the square read 7.3–9.9× and the way back 5.6–7.1×.
- **Why the time ceilings are not "plus 15%":** the same code read 7.3× and 9.9× in runs minutes apart. A 15% ceiling would fail at random, and a test that fails at random gets ignored. The ceilings sit about a third above the slowest reading, which still catches the square becoming half as slow again as usual.
- **Drawn and clickable are one moment today:** places are links, usable as soon as they are on screen. The test still measures both.
- **Frames while the square is open** have their own budget in `e2e/city-speed.spec.ts` (#123).
- **If it fails:** the log line `load budget: …` has every round's raw times. If one number rose and the yardstick didn't, something got slower: find what the PR added to the square or to the startup script. Don't raise a ceiling to get green without writing the reason here.
- **CI stays on one Playwright worker.** Two would halve the run, but the timed tests need a quiet machine; the job has 20 minutes and takes about 12.

## Locally
The same steps are `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e` (see the README).

`npm run coverage` shows which lines the unit tests reach (summary in the terminal, HTML in `coverage/`). It is a report, not a CI step or a gate ([ADR 0030](../decisions/0030-coverage-reports.md)).
