import { describe, expect, it, vi } from 'vitest';
import {
  firstLine,
  GEMINI_MODEL,
  GROQ_MODEL,
  handle,
  parseAsk,
  radioPrompt,
  type Env,
} from '../api/partner.ts';

const ENV: Env = {
  GEMINI_API_KEY: 'gemini_test',
  GROQ_API_KEY: 'gsk_test',
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
};

const ASK = {
  kind: 'radio-news',
  persona: { who: 'Ruth, a night owl on 40 m', about: 'Talks about the weather and her cat.' },
  learner: { name: 'ADAM', place: 'HAIFA', contacts: 2 },
  past: ['MY CAT SAYS HI'],
};

function request(body: unknown = ASK, token: string | null = 'user-token', method = 'POST') {
  return new Request('https://waymark.example/api/partner', {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  });
}

const geminiSays = (text: string) =>
  Response.json({ candidates: [{ content: { parts: [{ text }] } }] });
const groqSays = (text: string) => Response.json({ choices: [{ message: { content: text } }] });

/** Fakes Supabase's claim_partner_reply, Gemini and Groq, and records what each was sent. */
function services({
  claim = () => Response.json(39),
  gemini = () => geminiSays('CAT CAUGHT A MOUSE TODAY'),
  groq = () => groqSays('NEW ANTENNA IN THE GARDEN'),
}: { claim?: () => Response; gemini?: () => Response; groq?: () => Response } = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const u = String(url);
    if (u.includes('supabase.co')) return claim();
    return u.includes('googleapis.com') ? gemini() : groq();
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

const json = async (res: Response) => ({ status: res.status, body: await res.json() });

describe('POST /api/partner (E15, ADR 0036)', () => {
  it('claims a reply as the learner, asks Gemini flash-lite, and answers its line', async () => {
    const { calls, fetchFn } = services();
    expect(await json(await handle(request(), ENV, fetchFn))).toEqual({
      status: 200,
      body: { text: 'CAT CAUGHT A MOUSE TODAY', left: 39 },
    });
    const [claim, gemini] = calls;
    expect(claim?.url).toBe('https://project.supabase.co/rest/v1/rpc/claim_partner_reply');
    expect(claim?.init.headers).toMatchObject({ Authorization: 'Bearer user-token' });
    expect(gemini?.url).toContain(`/models/${GEMINI_MODEL}:generateContent`);
    expect(gemini?.url).not.toContain('gemini_test');
    expect(gemini?.init.headers).toMatchObject({ 'x-goog-api-key': 'gemini_test' });
    const sent = JSON.parse(String(gemini?.init.body)) as {
      systemInstruction: { parts: { text: string }[] };
      contents: { parts: { text: string }[] }[];
    };
    expect(sent.systemInstruction.parts[0]?.text).toContain('Never say you are an AI');
    expect(sent.contents[0]?.parts[0]?.text).toContain('"MY CAT SAYS HI"');
    expect(calls).toHaveLength(2);
  });

  it('asks Groq when Gemini fails, and only then', async () => {
    const { calls, fetchFn } = services({ gemini: () => new Response('down', { status: 500 }) });
    expect(await json(await handle(request(), ENV, fetchFn))).toEqual({
      status: 200,
      body: { text: 'NEW ANTENNA IN THE GARDEN', left: 39 },
    });
    const groq = calls[2];
    expect(groq?.url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(JSON.parse(String(groq?.init.body))).toMatchObject({ model: GROQ_MODEL });
  });

  it('works with only one of the two keys', async () => {
    const { fetchFn } = services();
    const res = await handle(request(), { ...ENV, GEMINI_API_KEY: undefined }, fetchFn);
    expect((await json(res)).body.text).toBe('NEW ANTENNA IN THE GARDEN');
  });

  it('says busy when both are rate-limited, failed when both break', async () => {
    const limited = () => new Response('', { status: 429 });
    const a = services({ gemini: limited, groq: limited });
    expect((await handle(request(), ENV, a.fetchFn)).status).toBe(503);
    const broken = () => new Response('', { status: 500 });
    const b = services({ gemini: broken, groq: broken });
    expect(await json(await handle(request(), ENV, b.fetchFn))).toEqual({
      status: 502,
      body: { error: 'failed' },
    });
  });

  it('stops at the daily cap without asking anyone', async () => {
    const { calls, fetchFn } = services({ claim: () => Response.json(-1) });
    expect(await json(await handle(request(), ENV, fetchFn))).toEqual({
      status: 429,
      body: { error: 'daily-limit' },
    });
    expect(calls).toHaveLength(1);
  });

  it('turns away the signed-out, the unset and the malformed before claiming', async () => {
    const { calls, fetchFn } = services();
    expect((await handle(request(ASK, null), ENV, fetchFn)).status).toBe(401);
    expect((await handle(request(ASK, 'x', 'GET'), ENV, fetchFn)).status).toBe(405);
    const unset = { ...ENV, GEMINI_API_KEY: undefined, GROQ_API_KEY: undefined };
    expect((await handle(request(), unset, fetchFn)).status).toBe(503);
    for (const bad of [
      { ...ASK, kind: 'essay' },
      { ...ASK, past: ['A', 'B', 'C', 'D'] },
      { ...ASK, learner: { ...ASK.learner, name: 'X'.repeat(40) } },
      { ...ASK, persona: { who: 'Ruth', about: 'x'.repeat(400) } },
      'hello',
    ]) {
      expect((await handle(request(bad), ENV, fetchFn)).status).toBe(400);
    }
    expect(calls).toHaveLength(0);
    const signedOut = services({ claim: () => new Response('', { status: 401 }) });
    expect((await handle(request(), ENV, signedOut.fetchFn)).status).toBe(401);
  });
});

describe('the partner prompt', () => {
  it('tells the character who you are and what they said before', () => {
    const ask = parseAsk(ASK);
    if (!ask) throw new Error('the ask should parse');
    const prompt = radioPrompt(ask);
    expect(prompt).toContain('You are Ruth, a night owl on 40 m.');
    expect(prompt).toContain('name ADAM, town HAIFA');
    expect(radioPrompt({ ...ask, past: [] })).toContain('first contact');
  });

  it('keeps the first line of a reply, without thinking or quotes', () => {
    expect(firstLine('<think>hmm</think>\n"CAT IS FINE"\nmore')).toBe('CAT IS FINE');
  });
});
