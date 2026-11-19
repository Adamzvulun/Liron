# CI (issue #14)

`.github/workflows/db-migrate.yml` applies database migrations on pushes to `dev` and `main` that touch `supabase/migrations/`, `sources/`, `scripts/content/` or `src/core/content/` (ADR 0018), or when run by hand. The `migrate` job takes well under a minute. A second job, `content`, then uploads the private content (ADR 0023); it has a 20-minute limit, and the first full upload took about 26 minutes.

`.github/workflows/ci.yml` runs on every pull request (branch flow: [ADR 0015](../decisions/0015-branches-and-environments.md)). Since 2026-11-18 it has four jobs that run side by side:

| Job | What | Docs-only PR |
|---|---|---|
| `check` | lint, typecheck, unit and database tests | runs |
| `browser (1 of 2)`, `browser (2 of 2)` | the browser tests except `@timing`, split in two (`--shard`, with `fullyParallel` so each half gets an even share) | skipped |
| `browser (timing)` | the `@timing` tests alone on one worker | skipped |

`node_modules` and Playwright's Chromium are cached by the lockfile's hash, so a job doesn't spend 40 s on `npm ci` or download the browser again.

**The phone on dev PRs (Adam, 2026-11-18: "16 minutes is way too long").** On a PR into `dev`, the phone project runs only the specs that check the phone: those with phone-only steps or that measure the screen (`PHONE_SPECS` in `playwright.config.ts`; `tests/phone-specs.test.ts` fails if a spec with phone-only steps is missing from it). Every other spec runs on the desktop. A release PR into `main` sets `PHONE_ALL=1` and runs every spec on both, so nothing reaches the live site without the whole phone suite ([ADR 0005](../decisions/0005-stack.md)). Local `npm run e2e` runs everything on both, as before.

**Why this costs about the same:** each job pays its own set-up (about a minute with the caches), but the browser tests are the same work split three ways, and the phone half of a dev PR is about a third smaller. The wait is the longest job's, not the sum.

**Measured (#370, the first run, 2026-11-18, every cache cold):** 6 minutes from start to the last job, against 16 before. `check` 2.2 min; `browser (1 of 2)` 6.0 (its tests 4.7, 160 passed); `browser (2 of 2)` 4.7 (tests 3.4); `browser (timing)` 3.4 (tests 2.0). Nothing retried. Billed: about 16 runner minutes, about $0.08 at $0.005, the same as the one long job. With warm caches each job saves about a minute of `npm ci` and the browser download. The split is uneven (the first half has the slow Morse specs): a third browser job would bring the wait to about 4.5 minutes for about a cent more a run, not done without Adam's say.

## Cost (checked 2026-11-02 on docs.github.com)
- The repo is **private**. GitHub Free for personal accounts includes **$12/month of Actions compute**. On the standard Linux runner ($0.006/min) that's about **2,000 minutes/month**.
- One CI run bills about 16 runner minutes on arm64 (four jobs, measured above), about $0.08. The 2,400 arm64 minutes a month cover about 150 runs.
- To keep it cheap: Chromium only, the phone suite in full only on release PRs, docs-only PRs skip the browser, and a newer push to the same branch cancels the older run.
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

What a player feels when the site loads, each with a ceiling that CI enforces in `tests/e2e/load-budget.spec.ts`. Times are taken on the production build, in a phone-sized window with the CPU slowed 4×.

| What | Measured | Ceiling |
|---|---|---|
| Script downloaded on the first visit (gzipped) | 172.9 kB | 199 kB (plus 15%) |
| The square is drawn and a place can be clicked, first visit | about 1.0 s | 3× the yardstick |
| The same on a later visit (the code is cached) | about 0.7–0.8 s | 3× the yardstick |
| Back to the square from a hall | about 0.6 s | 2.6× the yardstick |

- **The yardstick** is a fixed piece of work (sorting 200,000 numbers) timed on the same page in the same minutes: about 350 ms here at its best. A shared runner can be slow for a whole test, so times are compared with it, not with a stopwatch. Each figure is the best of four rounds. Over four runs on 2026-11-17 the square read 1.9–2.2× and the way back 1.6–1.9×.
- **On the arm64 runner (from 2026-11-18)** the yardstick is quicker against the page than on x64: 321–348 ms, and the first run read drawn 2.5× and back 1.9× (x64 CI read 1.6× and 1.2× that morning). That is closer to the ceilings than on x64. If this test starts failing at random, look here first: compare against an x64 run before blaming the PR, and don't raise a ceiling without writing the reason here.
- **Why the yardstick is long:** Chrome slows the CPU in time slices. The first yardstick (sorting 60,000 numbers, about 80 ms) caught them unevenly and swung by a third between rounds, so the same code read anywhere from 7× to 13×.
- **Why the time ceilings are not "plus 15%":** the same code still reads 1.9× and 2.2× in runs minutes apart. A 15% ceiling would fail at random, and a test that fails at random gets ignored. The ceilings sit about a third above the slowest reading, which still catches the square becoming half as slow again as usual.
- **Drawn and clickable are one moment today:** places are links, usable as soon as they are on screen. The test still measures both.
- **Frames while the square is open** have their own budget in `tests/e2e/city-speed.spec.ts` (#123).
- **Only on one worker.** Run beside other tests, the same code read 17× (2026-11-17), so the timing test skips itself when Playwright runs more than one worker. It and the square's frame budget are tagged `@timing`, and `npm run e2e` runs them alone on one worker after the rest.
- **If it fails:** the log line `load budget: …` has every round's raw times. If one number rose and the yardstick didn't, something got slower: find what the PR added to the square or to the startup script. Don't raise a ceiling to get green without writing the reason here.
- **CI runs two Playwright workers (2026-11-18).** The runner has 2 CPUs. On one worker the browser tests took 18 to 20 minutes of a 20 to 23 minute job. On two CPUs locally, two workers ran the rest in 9.6 to 9.7 minutes and the `@timing` tests alone took 2.5, clean twice with no retries, and three starved the tests that wait in real time (Forty Winters, the walk to a door). The `@timing` tests run alone: the two speed budgets, and Forty Winters, which keys Morse at 20 wpm and failed once in two runs beside another worker. The job has 20 minutes. The first run on GitHub (#365, arm64, two workers) took 16 minutes in all: 10.5 for the suite and 2.5 for the `@timing` tests, nothing retried. At $0.005 a minute that is about $0.08 a run, against about $0.13 for 21 minutes at $0.006 before.

## Locally
The same steps are `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e` (see the README).

`npm run coverage` shows which lines the unit tests reach (summary in the terminal, HTML in `coverage/`). It is a report, not a CI step or a gate ([ADR 0030](../decisions/0030-coverage-reports.md)).
