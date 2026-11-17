import { describe, expect, it, vi } from 'vitest';
import { handle, MAX_AUDIO_BYTES, type Env } from '../api/understood.ts';

const ENV: Env = {
  GROQ_API_KEY: 'gsk_test',
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
};

const recording = (bytes = 1000, type = 'audio/webm;codecs=opus') =>
  new Blob([new Uint8Array(bytes)], { type });

function request(audio: Blob | null = recording(), token: string | null = 'user-token') {
  const body = new FormData();
  if (audio) body.append('audio', audio, 'phrase');
  return new Request('https://waymark.example/api/understood', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
}

/** Fakes Supabase's claim_speech_check and Groq, and records what each was sent. */
function services({
  claim = () => Response.json(99),
  groq = () => Response.json({ text: ' مرحبا ' }),
}: { claim?: () => Response; groq?: () => Response } = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return String(url).includes('supabase.co') ? claim() : groq();
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

const json = async (res: Response) => ({ status: res.status, body: await res.json() });

describe('POST /api/understood (ADR 0014)', () => {
  it('claims a check as the learner, asks Groq with the spike settings, and answers the text', async () => {
    const { calls, fetchFn } = services();
    expect(await json(await handle(request(), ENV, fetchFn))).toEqual({
      status: 200,
      body: { text: 'مرحبا', left: 99 },
    });
    const [claim, groq] = calls;
    expect(claim?.url).toBe('https://project.supabase.co/rest/v1/rpc/claim_speech_check');
    expect(claim?.init.headers).toMatchObject({
      apikey: 'sb_publishable_test',
      Authorization: 'Bearer user-token',
    });
    expect(groq?.url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(groq?.init.headers).toEqual({ Authorization: 'Bearer gsk_test' });
    const sent = groq?.init.body as FormData;
    expect(Object.fromEntries([...sent].filter(([k]) => k !== 'file'))).toEqual({
      model: 'whisper-large-v3',
      language: 'ar',
      temperature: '0',
      response_format: 'json',
      prompt: expect.stringContaining('باللهجة الفلسطينية'),
    });
    expect((sent.get('file') as File).name).toBe('phrase.webm');
  });

  it('names Safari recordings .mp4 so Groq reads them right', async () => {
    const { calls, fetchFn } = services();
    await handle(request(recording(1000, 'audio/mp4')), ENV, fetchFn);
    expect(((calls[1]?.init.body as FormData).get('file') as File).name).toBe('phrase.mp4');
  });

  it('refuses without sending anything anywhere when the request is wrong', async () => {
    const { calls, fetchFn } = services();
    const get = new Request('https://waymark.example/api/understood');
    expect((await handle(get, ENV, fetchFn)).status).toBe(405);
    expect(await json(await handle(request(recording(), null), ENV, fetchFn))).toEqual({
      status: 401,
      body: { error: 'signed-out' },
    });
    expect((await json(await handle(request(null), ENV, fetchFn))).body).toEqual({
      error: 'no-audio',
    });
    expect((await json(await handle(request(recording(0)), ENV, fetchFn))).body).toEqual({
      error: 'no-audio',
    });
    const text = recording(100, 'text/plain');
    expect((await json(await handle(request(text), ENV, fetchFn))).body).toEqual({
      error: 'no-audio',
    });
    const big = await handle(request(recording(MAX_AUDIO_BYTES + 1)), ENV, fetchFn);
    expect(await json(big)).toEqual({ status: 413, body: { error: 'too-big' } });
    expect(calls).toHaveLength(0);
  });

  it('says it is not set up until the key is there', async () => {
    const { calls, fetchFn } = services();
    const res = await handle(request(), { ...ENV, GROQ_API_KEY: '' }, fetchFn);
    expect(await json(res)).toEqual({ status: 503, body: { error: 'not-set-up' } });
    expect(calls).toHaveLength(0);
  });

  it("never reaches Groq for someone Supabase doesn't let in, or past today's checks", async () => {
    for (const [claim, status, error] of [
      [() => new Response('{}', { status: 401 }), 401, 'signed-out'],
      [() => new Response('{}', { status: 403 }), 403, 'not-allowed'],
      [() => Response.json(-1), 429, 'daily-limit'],
      [() => Response.json(-2), 429, 'site-limit'],
      [() => new Response('oops', { status: 500 }), 502, 'failed'],
    ] as const) {
      const { calls, fetchFn } = services({ claim });
      expect(await json(await handle(request(), ENV, fetchFn))).toEqual({
        status,
        body: { error },
      });
      expect(calls).toHaveLength(1);
    }
  });

  it("passes on Groq's rate limit as busy, and anything else as failed", async () => {
    const busy = services({ groq: () => new Response('{}', { status: 429 }) });
    expect(await json(await handle(request(), ENV, busy.fetchFn))).toEqual({
      status: 503,
      body: { error: 'busy' },
    });
    for (const groq of [
      () => new Response('{}', { status: 500 }),
      () => Response.json({ nope: true }),
      () => new Response('not json'),
    ]) {
      const { fetchFn } = services({ groq });
      expect((await json(await handle(request(), ENV, fetchFn))).body).toEqual({ error: 'failed' });
    }
  });

  it("never caches an answer, and doesn't echo the key", async () => {
    const { fetchFn } = services();
    const res = await handle(request(), ENV, fetchFn);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.text()).not.toContain('gsk_test');
  });
});
