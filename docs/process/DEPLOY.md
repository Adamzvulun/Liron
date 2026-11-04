# Deploying (issue #15)

Waymark is hosted on **Vercel's free Hobby plan**, connected to this GitHub repo. Branch roles follow [ADR 0015](../decisions/0015-branches-and-environments.md):

| Branch | Vercel environment | Who sees it |
|---|---|---|
| `main` | **Production**: the live site, **https://waymark-phi.vercel.app** | Anyone with the link (the app itself will require login, #16) |
| `dev` | **Preview**, at the stable branch URL **https://waymark-git-dev-adamzvuluns-projects.vercel.app**: the live dev site | Only people logged into the Vercel account (Deployment Protection) |
| feature branches / PRs | **Preview**, one URL per push, plus a stable per-branch URL | Same as `dev` |

`vercel.json` pins the build: framework Vite, `npm ci`, `npm run build`, and **only `dist/` is published**. That matters because the repo also holds `docs/`, `spikes/` and the copyrighted `sources/` (ADR 0011). Without a build, Vercel would serve the repo's files as they are. `package.json` pins Node `22.x`, the same as CI. Without that, Vercel would pick its newest Node.

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
| `GEMINI_API_KEY`, `GROQ_API_KEY` | ✓ | ✓ | Added with the AI adapter (E15). **No `VITE_` prefix**: server-only, used inside the Vercel function, never sent to the browser. |

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

## Security headers
`vercel.json` sends a strict Content-Security-Policy and the other security headers (security review M3, 2026-11-04). Scripts and styles come only from our own site, with no inline styles and no eval. The only outside host is Supabase (`https://*.supabase.co`, and `wss://` for realtime).
- **Adding anything from another host** (a font, an API, an analytics script) means adding it to the CSP, or the browser blocks it.
- **Painted SVG markup** must use classes, not `style="…"` attributes: the CSP blocks inline styles.
- `e2e/headers.spec.ts` loads the app with these exact headers and fails on any violation, so CI catches a break.
- The Vercel toolbar on preview deployments (comments) isn't allowed by the CSP, so it may not load there. The site itself is unaffected.
