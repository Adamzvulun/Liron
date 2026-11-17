# Deploying (issue #15)

Waymark is hosted on **Vercel's free Hobby plan**, connected to this GitHub repo. Branch roles follow [ADR 0015](../decisions/0015-branches-and-environments.md):

| Branch | Vercel environment | Who sees it |
|---|---|---|
| `main` | **Production**: the live site, **https://waymark-phi.vercel.app** | Anyone with the link; the app requires login (#16) |
| `dev` | **Preview**, at the stable branch URL **https://waymark-git-dev-adamzvuluns-projects.vercel.app**: the live dev site | Only people logged into the Vercel account (Deployment Protection) |
| feature branches / PRs | **Preview**, one URL per push, plus a stable per-branch URL | Same as `dev` |

`vercel.json` pins the build: framework Vite, `npm ci`, `npm run build`, and **only `dist/` is published**, plus the functions in `api/` (Vercel builds each on its own, so they import nothing from `src/`). Every path except `/api/` falls back to `index.html`. That matters because the repo also holds `docs/`, `spikes/` and the copyrighted `sources/` (ADR 0011). Without a build, Vercel would serve the repo's files as they are. `package.json` pins Node `22.x`, the same as CI. Without that, Vercel would pick its newest Node.

## One-time setup (Adam, in the Vercel dashboard)
Do this only **after `main` contains the app** (the first release, `v0.1.0`). Importing while `main` has no app would publish the raw repo files.

1. vercel.com → **Add New… → Project → Import Git Repository**. Connect GitHub when asked: install the Vercel app with **Only select repositories → Liron**.
2. Pick **Liron**. Name the project **`waymark`**; the name becomes part of the URLs. Vercel reads the framework and build settings from `vercel.json`, so leave them alone. **Deploy.**
3. **Settings → Environments → Production → Branch Tracking:** check that it says **`main`**.
4. **Settings → Deployment Protection:** turn on **Vercel Authentication** with **Standard Protection**. That keeps every preview, including the dev site, private to you, while production stays reachable.
5. Send Claude the two URLs (they're not secrets): the production one (**Domains**) and the dev one.
   - **Where to find the dev URL:** it only exists after `dev` has deployed once, so after the first merge into `dev` following the import. Then go to the project → **Deployments**, filter **Branch: `dev`**, open the newest one, and under **Domains** copy the address that looks like `waymark-git-dev-<your-scope>.vercel.app`. That one never changes. The address with a random hash only shows that single deploy.
   - Vercel's bot also posts preview links on each PR.

After that, every push deploys automatically: `dev` updates the dev site, PRs get previews, and merging a release into `main` updates the live site.

## Environment variables
Set them in **Settings → Environment Variables**, never in git (`.env*` is git-ignored). Use the right environment for each:

| Variable | Production (`main`) | Preview (`dev`, PRs) | Note |
|---|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | `waymark-prod` project | `waymark-dev` project | #16, steps in [SUPABASE](SUPABASE.md). `VITE_` variables end up in the browser bundle. That's fine for the publishable key, which is designed to be public; Row Level Security guards the data. **Set them before merging the code that uses them**, or that deploy shows "Not set up yet". |
| `GROQ_API_KEY` | ✓ | ✓ | The "understood" check (ADR 0014), in `api/understood.ts`. **No `VITE_` prefix**: server-only, never sent to the browser. Use separate keys for Production and Preview if you can. The function also reads the two Supabase variables above, at run time. |
| `GEMINI_API_KEY` | ✓ | ✓ | The AI partner (E15, ADR 0036), in `api/partner.ts`: the Radio Room operators' news. Server-only, like the Groq key. A free AI Studio key; **don't attach a billing account** to its Cloud project (ADR 0036 keeps it on the free tier). The partner also uses `GROQ_API_KEY` as its backup and works with either key alone. Without both, operators keep their scripted lines. |

**The functions in `api/`** (each needs the two Supabase variables at run time, to check who is asking):

| Function | What it does | Keys it uses | What it spends |
|---|---|---|---|
| `api/understood.ts` | "Say it": writes down what it hears in a recording | `GROQ_API_KEY` | One of the player's 100 checks a day |
| `api/partner.ts` | The Radio Room operators' lines, Sit and talk, the Coach | `GEMINI_API_KEY` and `GROQ_API_KEY` (operators work with either; the inn needs Groq) | One of the player's lines for the day |
| `api/services.ts` | Tells a signed-in player which of the above are switched on (#316): three true-or-false answers, never a key or anything about one | Reads whether the two keys exist | Nothing: no AI call. It asks Supabase whose token it was sent, and the browser keeps the answer for five minutes |

After adding or removing a key, open **Settings → Services** on the site: it should say "ready" or "not set up on this site" for each line.

## Free-plan limits (checked 2026-11-02 on vercel.com/docs)
- 100 deployments/day, 1 build at a time, 45 min per build.
- 100 GB data transfer/month, 1,000,000 requests/month, 1,000,000 function invocations/month.
- Going over doesn't bill on Hobby. Vercel says you usually wait until 30 days have passed before you can use that feature again.
- Hobby is for personal, non-commercial use, which fits Waymark.

## Releasing
See [ADR 0015](../decisions/0015-branches-and-environments.md) and [WORKFLOW](WORKFLOW.md):
1. Check the dev site.
2. Open a PR from `dev` into `main` titled `Release vX.Y.Z`, with a short list of changes.
3. When CI is green, Adam merges it with a **merge commit**.
4. Tag `main` with `vX.Y.Z`.

### The first real release, v1.0.0
`main` still holds the M1 site (v0.1.0), so v1.0.0 carries everything since, every version on `dev` up to 3.0 ([ADR 0049](../decisions/0049-one-zero-ships-what-dev-holds.md)). When Adam says "release", these steps, in this order:
1. **Vercel, Production environment:** check that `GROQ_API_KEY` and `GEMINI_API_KEY` are set for **Production**, not only Preview (the table above). Without them the live site runs, but Sit and talk, the "understood" check and the operators' live news stay off.
2. **GitHub secrets:** check that `SUPABASE_PROD_DB_URL` and `SUPABASE_PROD_SECRET_KEY` are set ([SUPABASE](SUPABASE.md#migrations)). The DB migrate run stops at once without them.
3. **The release branch and PR.** Adam makes `release/v1.0.0` from `dev`'s head on GitHub (Code → Branches → New branch, source `dev`; Claude's session can push only its own branch). The release PR goes from it into `main`, titled `Release v1.0.0`, with the release notes as its text ([ADR 0040](../decisions/0040-versions-on-a-map.md), [ADR 0049](../decisions/0049-one-zero-ships-what-dev-holds.md)). CI runs on it as on any PR. When CI is green, Adam merges it with a merge commit.
4. **Watch the DB migrate run on `main`.** It applies every migration since v0.1.0 to `waymark-prod`, then uploads the private content. Check its log before signing in.
5. **Your account on `waymark-prod`:** if it doesn't have one yet, invite yourself (SUPABASE steps 7–8). Do this after step 4: the first account a project gets can read the deck. If you already had an account there, the licensee migration added it.
6. **Tag `main` with `v1.0.0`** in GitHub Releases (the session's git proxy refuses tag pushes).
7. **Realtime on `waymark-prod`:** Supabase → Realtime → Settings → switch **Allow public access** off ([RUNNING](RUNNING.md#friends)). Free; it keeps the wire between friends private.
8. **Play the live site** on a phone and a desktop.

**Your progress doesn't move.** `waymark-prod` and `waymark-dev` are separate databases (ADR 0015), so the live site starts you at level 1, with what you've learned on the dev site left behind there. Copying it across would be a one-off script; ask for one before the release if you want it.

## Security headers
`vercel.json` sends a strict Content-Security-Policy and the other security headers (security review M3, 2026-11-04). Scripts and styles come only from our own site, with no inline styles and no eval. The only outside host is Supabase (`https://*.supabase.co`, and `wss://` for realtime).
- **Adding anything from another host** (a font, an API, an analytics script) means adding it to the CSP, or the browser blocks it.
- **Painted SVG markup** must use classes, not `style="…"` attributes: the CSP blocks inline styles.
- `e2e/headers.spec.ts` loads the app with these exact headers and fails on any violation, so CI catches a break.
- The Vercel toolbar on preview deployments (comments) isn't allowed by the CSP, so it may not load there. The site itself is unaffected.
