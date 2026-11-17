import { describe, expect, it, vi } from 'vitest';
import { handle, servicesOf, type Env } from '../api/services.ts';

const ENV: Env = {
  GEMINI_API_KEY: 'AIza-secret-gemini-key',
  GROQ_API_KEY: 'gsk_secret_groq_key',
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
};

const request = (token: string | null = 'user-token', method = 'GET') =>
  new Request('https://waymark.example/api/services', {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

/** Fakes Supabase's "whose token is this?" and records what it was sent. */
function supabase(status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return Response.json({ id: 'user-1' }, { status });
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

describe('GET /api/services (#316)', () => {
  it('tells a signed-in player what is switched on, in booleans only', async () => {
    const { calls, fetchFn } = supabase();
    const res = await handle(request(), ENV, fetchFn);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ say: true, talk: true, radio: true });
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=300');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://project.supabase.co/auth/v1/user');
    expect(calls[0]?.init.headers).toEqual({
      apikey: 'sb_publishable_test',
      Authorization: 'Bearer user-token',
    });
  });

  it('follows the rules of the functions that use the keys', () => {
    expect(servicesOf({})).toEqual({ say: false, talk: false, radio: false });
    // The operators can answer with either key; the inn and "Say it" need Groq.
    expect(servicesOf({ GEMINI_API_KEY: 'k' })).toEqual({ say: false, talk: false, radio: true });
    expect(servicesOf({ GROQ_API_KEY: 'k' })).toEqual({ say: true, talk: true, radio: true });
    expect(servicesOf({ GROQ_API_KEY: '' })).toEqual({ say: false, talk: false, radio: false });
  });

  it('leaks nothing about a key: not the key, a part of it, or its length', async () => {
    for (const env of [ENV, { ...ENV, GROQ_API_KEY: undefined }, { ...ENV, GEMINI_API_KEY: '' }]) {
      const res = await handle(request(), env, supabase().fetchFn);
      const text = await res.text();
      const everything = text + JSON.stringify([...res.headers]);
      for (const secret of ['AIza', 'secret', 'gsk_', 'gemini', 'groq', 'sb_publishable']) {
        expect(everything.toLowerCase()).not.toContain(secret.toLowerCase());
      }
      const body = JSON.parse(text) as Record<string, unknown>;
      expect(Object.keys(body).sort()).toEqual(['radio', 'say', 'talk']);
      for (const value of Object.values(body)) expect(typeof value).toBe('boolean');
    }
  });

  it('refuses a caller with no token without asking anyone', async () => {
    const { calls, fetchFn } = supabase();
    const res = await handle(request(null), ENV, fetchFn);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'signed-out' });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(calls).toHaveLength(0);
  });

  it('refuses a token Supabase does not know', async () => {
    for (const status of [401, 403]) {
      const res = await handle(request('made-up'), ENV, supabase(status).fetchFn);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'signed-out' });
    }
  });

  it('answers an error, never a guess, when it cannot check', async () => {
    expect((await handle(request(), ENV, supabase(500).fetchFn)).status).toBe(502);
    const down = vi.fn(async () => {
      throw new Error('network');
    }) as unknown as typeof fetch;
    expect(await (await handle(request(), ENV, down)).json()).toEqual({ error: 'failed' });
    const bare = await handle(request(), { GROQ_API_KEY: 'k' }, supabase().fetchFn);
    expect(await bare.json()).toEqual({ error: 'not-set-up' });
    expect((await handle(request('user-token', 'POST'), ENV, supabase().fetchFn)).status).toBe(405);
  });
});
