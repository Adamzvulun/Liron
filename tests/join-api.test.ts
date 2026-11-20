import { describe, expect, it, vi } from 'vitest';
import { handle, type Env } from '../api/join.ts';

// Joining by an invite link (ADR 0052): api/join.ts against a fake Supabase.

const ENV: Env = {
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_test',
};
const CODE = 'ab'.repeat(32);
const ADAM = '00000000-0000-0000-0000-0000000000a1';
const NEW = '00000000-0000-0000-0000-0000000000c3';

const post = (body: unknown, method = 'POST') =>
  new Request('https://waymark.example/api/join', {
    method,
    ...(method === 'POST' && { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });

const join = (over: Record<string, unknown> = {}) =>
  post({
    action: 'join',
    code: CODE,
    email: ' Friend@Example.com ',
    password: 'a long one',
    ...over,
  });

/** A fake Supabase: each path answers from `answers`, and every call is recorded. */
function supabase(answers: Record<string, () => Response>) {
  const calls: { path: string; body: unknown; headers: Record<string, string> }[] = [];
  const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const path = String(url).replace('https://project.supabase.co', '');
    calls.push({
      path,
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : null,
      headers: init?.headers as Record<string, string>,
    });
    const answer = answers[path];
    if (!answer) throw new Error(`unexpected ${path}`);
    return answer();
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

const ok = (body: unknown) => () => Response.json(body);
const happy = {
  '/rest/v1/rpc/claim_invite': ok(ADAM),
  '/auth/v1/admin/users': ok({ id: NEW }),
  '/rest/v1/rpc/finish_invite': () => new Response(null, { status: 204 }),
  '/rest/v1/rpc/release_invite': () => new Response(null, { status: 204 }),
};

describe('POST /api/join (ADR 0052)', () => {
  it('makes the account, confirmed, uses up the link and befriends the inviter', async () => {
    const { calls, fetchFn } = supabase(happy);
    const res = await handle(join(), ENV, fetchFn);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls.map((c) => c.path)).toEqual([
      '/rest/v1/rpc/claim_invite',
      '/auth/v1/admin/users',
      '/rest/v1/rpc/finish_invite',
    ]);
    expect(calls[0]?.body).toEqual({ p_code: CODE });
    expect(calls[1]?.body).toEqual({
      email: 'friend@example.com',
      password: 'a long one',
      email_confirm: true,
    });
    expect(calls[2]?.body).toEqual({ p_code: CODE, p_user: NEW });
    expect(calls[1]?.headers.apikey).toBe('sb_secret_test');
  });

  it('a used or expired link makes no account', async () => {
    const { calls, fetchFn } = supabase({ ...happy, '/rest/v1/rpc/claim_invite': ok(null) });
    const res = await handle(join(), ENV, fetchFn);
    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ error: 'used' });
    expect(calls.map((c) => c.path)).toEqual(['/rest/v1/rpc/claim_invite']);
  });

  it('an email already taken gives the link back', async () => {
    const { calls, fetchFn } = supabase({
      ...happy,
      '/auth/v1/admin/users': () =>
        Response.json(
          {
            code: 422,
            error_code: 'email_exists',
            msg: 'A user with this email address has already been registered',
          },
          { status: 422 },
        ),
    });
    const res = await handle(join(), ENV, fetchFn);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'email-taken' });
    expect(calls.map((c) => c.path)).toContain('/rest/v1/rpc/release_invite');
    expect(calls.map((c) => c.path)).not.toContain('/rest/v1/rpc/finish_invite');
  });

  it('a password Supabase finds too weak says so, and gives the link back', async () => {
    const { calls, fetchFn } = supabase({
      ...happy,
      '/auth/v1/admin/users': () =>
        Response.json({ error_code: 'weak_password', msg: 'weak' }, { status: 422 }),
    });
    const res = await handle(join(), ENV, fetchFn);
    expect(await res.json()).toEqual({ error: 'weak-password' });
    expect(calls.map((c) => c.path)).toContain('/rest/v1/rpc/release_invite');
  });

  it('checks the email and the password before touching the link', async () => {
    const { calls, fetchFn } = supabase(happy);
    expect(await (await handle(join({ email: 'not an email' }), ENV, fetchFn)).json()).toEqual({
      error: 'bad-request',
    });
    expect(await (await handle(join({ password: 'short' }), ENV, fetchFn)).json()).toEqual({
      error: 'weak-password',
    });
    expect(calls).toEqual([]);
  });

  it('a code that isn’t one is a used link, without asking Supabase', async () => {
    const { calls, fetchFn } = supabase(happy);
    expect(await (await handle(join({ code: 'nope' }), ENV, fetchFn)).json()).toEqual({
      error: 'used',
    });
    expect(
      await (await handle(post({ action: 'check', code: 'nope' }), ENV, fetchFn)).json(),
    ).toEqual({ open: false });
    expect(calls).toEqual([]);
  });

  it('check answers whether the link is open, and who sent it', async () => {
    const check = () => post({ action: 'check', code: CODE.toUpperCase() });
    const named = supabase({
      '/rest/v1/rpc/invite_open': ok(true),
      '/rest/v1/rpc/invite_from': ok('Adam'),
    });
    expect(await (await handle(check(), ENV, named.fetchFn)).json()).toEqual({
      open: true,
      from: 'Adam',
    });
    expect(named.calls.map((c) => c.body)).toEqual([{ p_code: CODE }, { p_code: CODE }]);
    // No name chosen, or the name can't be read: the link still works.
    for (const from of [ok(null), () => new Response('', { status: 500 })]) {
      const { fetchFn } = supabase({
        '/rest/v1/rpc/invite_open': ok(true),
        '/rest/v1/rpc/invite_from': from,
      });
      expect(await (await handle(check(), ENV, fetchFn)).json()).toEqual({ open: true });
    }
    // A closed link names nobody.
    const closed = supabase({ '/rest/v1/rpc/invite_open': ok(false) });
    expect(await (await handle(check(), ENV, closed.fetchFn)).json()).toEqual({ open: false });
    expect(closed.calls).toHaveLength(1);
  });

  it('without the secret key, it says it isn’t set up', async () => {
    const { fetchFn } = supabase(happy);
    const res = await handle(join(), { VITE_SUPABASE_URL: ENV.VITE_SUPABASE_URL }, fetchFn);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'not-set-up' });
  });

  it('only POST, and only JSON objects', async () => {
    const { fetchFn } = supabase(happy);
    expect((await handle(post(null, 'GET'), ENV, fetchFn)).status).toBe(405);
    expect((await handle(post('not json'), ENV, fetchFn)).status).toBe(400);
    expect((await handle(post('[1]'), ENV, fetchFn)).status).toBe(400);
    expect((await handle(post({ action: 'other', code: CODE }), ENV, fetchFn)).status).toBe(400);
  });

  it('no answer while making the account: the link stays used, and they’re told to try signing in', async () => {
    for (const admin of [
      () => {
        throw new Error('timed out');
      },
      () => new Response('', { status: 504 }),
    ]) {
      const { calls, fetchFn } = supabase({ ...happy, '/auth/v1/admin/users': admin });
      const res = await handle(join(), ENV, fetchFn);
      expect(await res.json()).toEqual({ error: 'unsure' });
      // The account may exist: giving the link back could let it make a second one.
      expect(calls.map((c) => c.path)).toEqual([
        '/rest/v1/rpc/claim_invite',
        '/auth/v1/admin/users',
      ]);
    }
  });

  it('an account made is a success, even if its answer can’t be read', async () => {
    const { calls, fetchFn } = supabase({
      ...happy,
      '/auth/v1/admin/users': () => new Response('not json', { status: 200 }),
    });
    const res = await handle(join(), ENV, fetchFn);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls.map((c) => c.path)).not.toContain('/rest/v1/rpc/release_invite');
  });

  it('a password over 72 bytes is too long, and is refused before the link is touched', async () => {
    const { calls, fetchFn } = supabase(happy);
    // 25 letters, 75 bytes: under 72 letters, over Supabase's 72 bytes.
    const res = await handle(join({ password: '€'.repeat(25) }), ENV, fetchFn);
    expect(await res.json()).toEqual({ error: 'too-long' });
    expect(calls).toEqual([]);
    const ok = await handle(join({ password: 'א'.repeat(30) }), ENV, supabase(happy).fetchFn);
    expect(ok.ok).toBe(true);
  });

  it('a Supabase that can’t be reached fails plainly', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const res = await handle(join(), ENV, fetchFn);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'failed' });
  });
});
