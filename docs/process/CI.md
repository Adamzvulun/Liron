# CI (issue #14)

`.github/workflows/ci.yml` runs on every pull request and on pushes to the default branch. It has one job: `npm ci` → lint → typecheck → unit tests → build → Playwright smoke test (Chromium, desktop and phone).

## Cost (checked 2026-11-02 on docs.github.com)
- The repo is **private**. GitHub Free for personal accounts includes **$12/month of Actions compute**. On the standard Linux runner ($0.006/min) that's about **2,000 minutes/month**.
- One CI run takes roughly 2–4 minutes (estimate; check the first real runs). Even 10 runs a day stays under ~1,200 minutes a month.
- To keep it cheap: one job, Chromium only, and a newer push to the same branch cancels the older run.
- **If the allowance runs out:** with no payment method on the GitHub account, runs are **blocked, not billed**, until the next month. With a payment method on file, spending is limited by the account's budgets. Check *Settings → Billing → Budgets* and set the Actions budget to $0 if you never want to pay.

## "A red check blocks merging": not available on our plan
GitHub's plan page lists **protected branches for private repositories as a GitHub Pro feature** (paid). Rulesets are described for Team and Enterprise. GitHub Free for personal accounts doesn't list either for private repos. So on Free, GitHub itself **can't** block merging on a red check in this repo.

Options (Adam decides):
1. **Process rule (free, current default):** a PR with a red check doesn't get merged. Claude never merges or asks to merge one. The red ✗ still shows on the PR.
2. **GitHub Pro** (paid): then turn on the rule as below.
3. **Make the repo public:** not possible while copyrighted sources live in `sources/` (ADR 0011).

### Steps if the plan ever allows it
1. GitHub → the repo → **Settings → Branches → Add branch protection rule** (or **Settings → Rules → Rulesets → New branch ruleset**).
2. Branch name pattern: the default branch (`claude/learning-hub-arabic-morse-20ckww`).
3. Turn on **Require status checks to pass before merging**, and pick the check **`check`** (the CI job name). It only appears in the list after CI has run once.
4. Optionally turn on **Require a pull request before merging**. Save.

## Locally
The same steps are `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e` (see the README).
