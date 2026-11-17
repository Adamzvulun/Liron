/**
 * "What's switched on" (#316): a Vercel function that tells a signed-in player which of the
 * site's AI services have a key, so Settings can say "ready" or "not set up on this site"
 * before they walk to a station that can't answer.
 *
 * GET /api/services, `Authorization: Bearer <the player's Supabase access token>`. Answers
 * `{ say, talk, radio }`, three booleans. It never answers a key, part of a key, a key's length
 * or which provider is behind a service. Errors answer `{ error }`.
 *
 * It spends nothing: no AI call is made. The one request it sends asks Supabase whose token this
 * is, which is what keeps strangers out; the answer may be kept by the browser for five minutes,
 * so a player's page asks rarely.
 *
 * Self-contained on purpose: Vercel compiles this file on its own, so it imports nothing from
 * src/ (whose imports end in `.ts`).
 */

export interface Env {
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

/** What the site can do today. */
export interface Services {
  /** "Say it": the check that hears what you said (api/understood.ts). */
  say: boolean;
  /** Sit and talk at the inn, and the Coach (api/partner.ts). */
  talk: boolean;
  /** The Radio Room's operators answering in their own words (api/partner.ts). */
  radio: boolean;
}

export type ServicesFailure = 'method' | 'signed-out' | 'not-set-up' | 'failed';

const STATUS: Record<ServicesFailure, number> = {
  method: 405,
  'signed-out': 401,
  'not-set-up': 503,
  failed: 502,
};

const fail = (error: ServicesFailure) =>
  new Response(JSON.stringify({ error }), {
    status: STATUS[error],
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

/** Which services have what they need. The same rules as the functions that use the keys. */
export function servicesOf(env: Env): Services {
  const groq = Boolean(env.GROQ_API_KEY);
  return { say: groq, talk: groq, radio: groq || Boolean(env.GEMINI_API_KEY) };
}

/** The handler, with its environment and `fetch` passed in so tests can fake both. */
export async function handle(
  request: Request,
  env: Env,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'GET') return fail('method');
  const token = /^Bearer (\S+)$/.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!token) return fail('signed-out');
  const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY } = env;
  if (!VITE_SUPABASE_URL || !VITE_SUPABASE_PUBLISHABLE_KEY) return fail('not-set-up');
  let res: Response;
  try {
    res = await fetchFn(`${VITE_SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
    });
  } catch {
    return fail('failed');
  }
  if (res.status === 401 || res.status === 403) return fail('signed-out');
  if (!res.ok) return fail('failed');
  return new Response(JSON.stringify(servicesOf(env)), {
    headers: {
      'Content-Type': 'application/json',
      // The player's own browser may keep it a few minutes; nothing shared may keep it at all.
      'Cache-Control': 'private, max-age=300',
      Vary: 'Authorization',
    },
  });
}

export default {
  fetch: (request: Request) => handle(request, process.env),
};
