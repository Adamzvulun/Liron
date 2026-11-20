/**
 * Joining by an invite link (ADR 0052): a Vercel function that makes a friend's account, so the
 * inviter only has to send a link. Sign-ups stay off in Supabase (ADR 0016); this is the one door,
 * and it opens only with a link an inviter made in Settings.
 *
 * POST /api/join, JSON:
 * - `{ action: 'check', code }` answers `{ open, from? }`: whether the link can still be used,
 *   and the inviter's chosen name, if they have one.
 * - `{ action: 'join', code, email, password }` makes the account with Supabase's admin API
 *   (email confirmed, so no email is sent), uses up the link, and makes the new player and the
 *   inviter friends. Answers `{ ok: true }`; the page then signs in with that email and password.
 * Errors answer `{ error }`.
 *
 * The link is taken before the account is made, so two people can't both use it, and given back
 * if the account can't be made (an email already taken, say).
 *
 * Needs `SUPABASE_SECRET_KEY` (server-only, never `VITE_`): the project's secret key, which may
 * make accounts. It is sent only to the project's own URL.
 *
 * Self-contained on purpose: Vercel compiles this file on its own, so it imports nothing from
 * src/ (whose imports end in `.ts`).
 */

export interface Env {
  VITE_SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
}

export type JoinFailure =
  'method' | 'bad-request' | 'not-set-up' | 'used' | 'email-taken' | 'weak-password' | 'failed';

const STATUS: Record<JoinFailure, number> = {
  method: 405,
  'bad-request': 400,
  'not-set-up': 503,
  used: 410,
  'email-taken': 409,
  'weak-password': 422,
  failed: 502,
};

/** The same as the app's (src/core/auth/password.ts). */
export const MIN_PASSWORD = 8;
const MAX_BODY = 2_000;
const CODE = /^[0-9a-f]{64}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
const fail = (error: JoinFailure) => json({ error }, STATUS[error]);

/** The handler, with its environment and `fetch` passed in so tests can fake both. */
export async function handle(
  request: Request,
  env: Env,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'POST') return fail('method');
  const { VITE_SUPABASE_URL: url, SUPABASE_SECRET_KEY: key } = env;
  if (!url || !key) return fail('not-set-up');

  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return fail('bad-request');
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fail('bad-request');
    body = parsed as Record<string, unknown>;
  } catch {
    return fail('bad-request');
  }
  const code = typeof body.code === 'string' ? body.code.trim().toLowerCase() : '';
  if (!CODE.test(code)) return body.action === 'check' ? json({ open: false }) : fail('used');

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  const rpc = async (fn: string, args: object): Promise<unknown> => {
    const res = await fetchFn(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`${fn}: ${res.status}`);
    const text = await res.text();
    return text ? (JSON.parse(text) as unknown) : null;
  };

  try {
    if (body.action === 'check') {
      if ((await rpc('invite_open', { p_code: code })) !== true) return json({ open: false });
      // Who sent it, for the page's first line; the link still works without it.
      const from = await rpc('invite_from', { p_code: code }).catch(() => null);
      return json(typeof from === 'string' ? { open: true, from } : { open: true });
    }
    if (body.action !== 'join') return fail('bad-request');

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!EMAIL.test(email) || email.length > 254) return fail('bad-request');
    // Supabase keeps at most 72 bytes of a password (bcrypt), so count bytes, not letters.
    const bytes = new TextEncoder().encode(password).length;
    if (password.length < MIN_PASSWORD || bytes > 72) return fail('weak-password');

    const inviter = await rpc('claim_invite', { p_code: code });
    if (typeof inviter !== 'string') return fail('used');

    const giveBack = () => rpc('release_invite', { p_code: code }).catch(() => {});
    let made: Response;
    try {
      made = await fetchFn(`${url}/auth/v1/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, password, email_confirm: true }),
      });
    } catch {
      // Supabase couldn't be reached: the link mustn't stay used up by an account never made.
      await giveBack();
      return fail('failed');
    }
    if (!made.ok) {
      await giveBack();
      const why = (await made.json().catch(() => ({}))) as { error_code?: string; msg?: string };
      if (why.error_code === 'email_exists' || /already been registered/i.test(why.msg ?? ''))
        return fail('email-taken');
      if (why.error_code === 'weak_password') return fail('weak-password');
      return fail('failed');
    }
    const user = (await made.json()) as { id?: unknown };
    if (typeof user.id !== 'string') return fail('failed');
    // The account exists now: even if this last step fails, they can sign in. Only the
    // friendship would be missing, and they can still ask each other.
    await rpc('finish_invite', { p_code: code, p_user: user.id }).catch(() => {});
    return json({ ok: true });
  } catch {
    return fail('failed');
  }
}

export default {
  fetch: (request: Request) => handle(request, process.env),
};
