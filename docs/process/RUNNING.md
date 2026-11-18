# Running Waymark: the keeper's handbook (task 4.7, #339)

How to look after Waymark without Claude. Each procedure says whether it has been done once for real. **Untested** means nobody has followed it yet, with the reason.

Where things live:

- **Code:** GitHub, `Adamzvulun/Liron`.
- **Site:** Vercel, project `waymark`. Production is `main`; the dev site is `dev` ([DEPLOY](DEPLOY.md)).
- **Data:** Supabase, projects `waymark-prod` and `waymark-dev` ([SUPABASE](SUPABASE.md)).
- **AI keys:** Groq and Google AI Studio, set in Vercel.

## Each month (about 20 minutes)

Open an issue from the **Monthly check** template (GitHub → Issues → New issue). It holds this list as checkboxes.

1. **The keep-alive.** GitHub → Actions → **Keep alive**. The last runs should be green. If one is red, see [When the keep-alive fails](#when-the-keep-alive-fails). *Untested: the schedule only starts once v1.0.0 is on `main`.*
2. **The usage pages.** Look at each, and note anything near its limit in the issue:
   - **Supabase:** each project → **Usage** (database size, storage, egress).
   - **Vercel:** the team → **Usage**. Going over doesn't bill on Hobby; the feature stops until the 30 days are up ([DEPLOY](DEPLOY.md#free-plan-limits-checked-2026-11-02-on-vercelcomdocs)).
   - **GitHub Actions:** your account → **Settings → Billing**. $12 of minutes a month are free; with no payment method, runs stop instead of billing ([CI](CI.md#cost-checked-2026-11-02-on-docsgithubcom)).
   - **Groq:** console.groq.com → **Usage**. **Google AI Studio:** aistudio.google.com → your key's project → usage.

   *Untested: Claude can't reach these dashboards. The page names were current on 2026-11-17; they move.*
3. **Settings → Services** on the live site. All three lines should say what you expect ("ready", or "not set up on this site" for a key you removed). *Untested until the release.*
4. **Play for ten minutes** on the live site. A broken thing goes in a **Bug** issue.

## Each year

1. **Dependency updates.** The steps are in the next section. Do them at least once a year, and sooner when GitHub shows a security alert (repo → **Security**). *Untested by Adam; Claude has done every update so far.*
2. **Rotate the keys** (see [Rotating a key](#rotating-a-key)): the Groq key, the Gemini key, and the two Supabase secret keys. *Untested.*
3. **Read the free tiers again.** Vercel, Supabase, GitHub, Groq and Google change their plans. Check that the numbers in DEPLOY.md and CI.md are still true, and fix the docs if not. *Untested.*

## Updating dependencies

Versions are pinned exactly in `package.json`, and a new version should be at least two weeks old before you take it (STATUS.md, "Pinning").

1. On your computer: `git checkout dev && git pull`, then `git checkout -b chore/deps-YYYY-MM`.
2. `npm outdated` lists what is behind. Take one package, or a few related ones, at a time: `npm install name@x.y.z --save-exact`.
3. Run the checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then `npm run e2e`. The first e2e run on a computer needs `npx playwright install chromium`.
4. All green: commit, push, and open a PR into `dev`. CI runs the same checks. Merge it when CI is green, check the dev site, then release as usual ([DEPLOY](DEPLOY.md#releasing)).
5. Red: undo that package (`git checkout package.json package-lock.json && npm ci`) and leave it for later, writing in an issue what failed.

A **major** version (the first number changes, e.g. React 19 → 20) usually needs code changes. Leave those for a session with Claude.

## Rotating a key

Rotate a key once a year, or **at once** if it may have leaked (pasted in a chat, shown on screen, committed). Make the new key first, then delete the old one, so the site never runs without one. *All untested.*

| Key | Where to make a new one | Where it goes |
|---|---|---|
| `GROQ_API_KEY` | console.groq.com → **API Keys** → Create | Vercel → **Settings → Environment Variables**, for Production and Preview. Then **redeploy** both (Deployments → the latest → Redeploy): variables only apply to new builds. |
| `GEMINI_API_KEY` | aistudio.google.com → **Get API key**. Keep it in the same Cloud project, and never attach billing (ADR 0036). | The same as Groq. |
| `SUPABASE_PROD_SECRET_KEY`, `SUPABASE_DEV_SECRET_KEY` | Supabase → the project → **Project Settings → API Keys** → a new secret key | GitHub → repo → **Settings → Secrets and variables → Actions**, the secret of that name |
| The database password (inside `SUPABASE_*_DB_URL`) | Supabase → **Project Settings → Database → Reset database password** | Rebuild the connection string ([SUPABASE](SUPABASE.md#migrations), steps 1–3) and replace the GitHub secret |

After a rotation:

1. Open **Settings → Services** on the site for the AI keys.
2. Run **Actions → Keep alive → Run workflow** for the database secrets.
3. Delete the old key at its provider.

## When the keep-alive fails

GitHub emails you. The steps are in [SUPABASE](SUPABASE.md#keep-alive):

1. Restore a paused project.
2. Fix a missing or changed secret.
3. Run the workflow again by hand.

## A paused project

The site shows its login screen but can't sign in, or the keep-alive fails. In Supabase, open the project. If it says **Paused**, press **Restore project** and wait a few minutes; the data is kept. Then run Keep alive by hand to check. *Untested: no project has been paused yet.*

## Friends

Waymark is invite-only: sign-ups are switched off in Supabase.

- **To add a friend, or reset their password:** [FRIENDS.md](FRIENDS.md). Supabase's own email doesn't reach friends, so you make the account with a password and hand it over; they change it in **Settings → Change your password**. Friends get the deck ([ADR 0050](../decisions/0050-friends-learn-from-the-deck.md)): until v1.1.0 does it by itself, add each one to `content_licensees` (FRIENDS.md has the line). *Untested.*
- **Before friends key to each other on the wire (v2.4):** in the Supabase dashboard, for each project (dev and live), open **Realtime → Settings** and switch **Allow public access** off. It's free. Waymark always asks for a private channel, which only the two friends may join ([ADR 0046](../decisions/0046-the-wire.md)); this setting stops anyone from opening a public channel instead. *Untested.*
- **To remove a friend:** the same page → their row → **Delete user**. Everything of theirs goes with the account: progress, wallet and reviews are deleted with it (`on delete cascade`). *Untested.*

## Releasing

[DEPLOY](DEPLOY.md#releasing):

1. Check the dev site.
2. Open a PR from `dev` into `main`.
3. Merge it with a merge commit when CI is green.
4. Tag it in GitHub Releases.

The first release has its own steps and a checklist ([release-checklist.md](release-checklist.md)). *Untested until v1.0.0.*
