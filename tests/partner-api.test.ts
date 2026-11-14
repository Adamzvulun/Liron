import { describe, expect, it, vi } from 'vitest';
import {
  cleanArabic,
  cleanTips,
  firstLine,
  GEMINI_MODEL,
  GROQ_MODEL,
  handle,
  INN_MODEL,
  innMessages,
  MAX_BODY,
  MAX_TURNS,
  OLD_FRIENDS,
  parseAsk,
  radioPrompt,
  REPLY_GEMINI_MS,
  REPLY_RULES,
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
      { ...ASK, told: ['A', 'B', 'C', 'D'] },
      { ...ASK, kind: 'radio-reply' },
      { ...ASK, kind: 'radio-reply', heard: 'X'.repeat(61) },
      { ...ASK, kind: 'radio-reply', heard: 'NEW JOB', news: 42 },
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
    if (!ask || ask.kind === 'inn-chat' || ask.kind === 'inn-coach')
      throw new Error('the radio ask should parse');
    const prompt = radioPrompt(ask);
    expect(prompt).toContain('You are Ruth, a night owl on 40 m.');
    expect(prompt).toContain('name ADAM, town HAIFA');
    expect(radioPrompt({ ...ask, past: [] })).toContain('first contact');
  });

  it('asks for an answer to what you keyed, with the reply rules (ADR 0037)', async () => {
    const reply = {
      ...ASK,
      kind: 'radio-reply',
      news: 'CAT IS FINE',
      heard: 'NEW JOB',
      told: ['SICK'],
    };
    const ask = parseAsk(reply);
    if (!ask || ask.kind === 'inn-chat' || ask.kind === 'inn-coach')
      throw new Error('the reply ask should parse');
    const prompt = radioPrompt(ask);
    expect(prompt).toContain('Just now they sent you their news: "NEW JOB"');
    expect(prompt).toContain('Your news this time was: "CAT IS FINE"');
    expect(prompt).toContain('What they told you in past contacts, oldest first: "SICK"');
    const { calls, fetchFn } = services();
    expect((await handle(request(reply), ENV, fetchFn)).status).toBe(200);
    const sent = JSON.parse(String(calls[1]?.init.body)) as {
      systemInstruction: { parts: { text: string }[] };
    };
    expect(sent.systemInstruction.parts[0]?.text).toBe(REPLY_RULES);
    expect(parseAsk({ ...reply, news: undefined })).toMatchObject({ news: null });
  });

  it('gives Gemini only a few seconds for an answer, then asks Groq', async () => {
    const reply = { ...ASK, kind: 'radio-reply', heard: 'NEW JOB' };
    const calls: string[] = [];
    const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      calls.push(u);
      if (u.includes('supabase.co')) return Response.json(39);
      if (u.includes('googleapis.com')) {
        // Gemini hangs until the function gives up on it.
        return new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
        );
      }
      return groqSays('FB ON UR NEW JOB');
    }) as typeof fetch;
    const t = Date.now();
    expect(await json(await handle(request(reply), ENV, fetchFn))).toEqual({
      status: 200,
      body: { text: 'FB ON UR NEW JOB', left: 39 },
    });
    expect(Date.now() - t).toBeLessThan(REPLY_GEMINI_MS + 1500);
    expect(calls).toHaveLength(3);
  }, 10_000);

  it('keeps the first line of a reply, without thinking or quotes', () => {
    expect(firstLine('<think>hmm</think>\n"CAT IS FINE"\nmore')).toBe('CAT IS FINE');
  });
});

const INN = {
  kind: 'inn-chat',
  persona: { who: 'Wafa the manager', about: 'Runs the new factory and needs workers.' },
  learner: { name: 'Adam' },
  theme: 'Work and pay',
  words: ['salary', 'boss'],
  told: ['أنا من حيفا'],
  turns: [
    { who: 'them', text: 'أهلا! شو بتشتغل؟' },
    { who: 'you', text: 'أنا مهندس' },
  ],
};

describe('a chat at the inn (E17, ADR 0038)', () => {
  it('claims a chat line, asks only Groq with the inn model, and answers the line', async () => {
    const { calls, fetchFn } = services({
      claim: () => Response.json(59),
      groq: () => groqSays('«ممتاز! عندك خبرة؟»'),
    });
    expect(await json(await handle(request(INN), ENV, fetchFn))).toEqual({
      status: 200,
      body: { text: 'ممتاز! عندك خبرة؟', left: 59 },
    });
    expect(calls.map((c) => c.url)).toEqual([
      'https://project.supabase.co/rest/v1/rpc/claim_chat_line',
      'https://api.groq.com/openai/v1/chat/completions',
    ]);
    const sent = JSON.parse(String(calls[1]?.init.body)) as {
      model: string;
      messages: { role: string; content: string }[];
    };
    expect(sent.model).toBe(INN_MODEL);
    expect(sent.messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(sent.messages[0]?.content).toContain('Palestinian colloquial Arabic');
    expect(sent.messages[0]?.content).toContain('You are Wafa the manager.');
    expect(sent.messages[0]?.content).toContain('"أنا من حيفا"');
    expect(sent.messages[0]?.content).toContain('For example: salary, boss.');
    expect(sent.messages.at(-1)?.content).toBe('أنا مهندس');
  });

  it('takes the longest chat the inn can send, and nothing far past it', async () => {
    const turns = Array.from({ length: MAX_TURNS }, (_, i) => ({
      who: i % 2 ? 'you' : 'them',
      text: 'م'.repeat(160),
    }));
    const big = {
      ...INN,
      persona: { ...INN.persona, about: 'a'.repeat(900) },
      words: Array.from({ length: 40 }, () => 'w'.repeat(40)),
      told: ['ت'.repeat(160), 'ت'.repeat(160), 'ت'.repeat(160)],
      memories: ['m'.repeat(240), 'm'.repeat(240), 'm'.repeat(240)],
      turns,
    };
    expect(parseAsk(big)).not.toBeNull();
    const body = JSON.stringify(big);
    const bytes = new TextEncoder().encode(body).length;
    expect(bytes).toBeLessThanOrEqual(MAX_BODY);
    const withLength = (b: string) =>
      new Request('https://waymark.example/api/partner', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user-token',
          'Content-Type': 'application/json',
          'Content-Length': String(new TextEncoder().encode(b).length),
        },
        body: b,
      });
    const { fetchFn } = services({ groq: () => groqSays('منيح!') });
    expect((await handle(withLength(body), ENV, fetchFn)).status).toBe(200);
    const huge = JSON.stringify({ ...big, padding: 'x'.repeat(MAX_BODY) });
    expect(await json(await handle(withLength(huge), ENV, fetchFn))).toMatchObject({
      status: 400,
      body: { error: 'bad-request' },
    });
  });

  it('shares the road behind them: memories, recalled fondly by an old friend', () => {
    const setting = (met: number, memories?: unknown) => {
      const ask = parseAsk({ ...INN, met, memories });
      if (ask?.kind !== 'inn-chat') throw new Error('the inn ask should parse');
      return innMessages(ask)[0]?.content ?? '';
    };
    const road = ['You helped Fares carry his oud up the hill.'];
    expect(setting(0)).not.toContain('on the road');
    expect(setting(1, road)).toContain('"You helped Fares carry his oud up the hill."');
    expect(setting(1, road)).toContain('Mention one only if it fits naturally.');
    // An old friend recalls one in their second line (INN's turns hold one of theirs), told last.
    const last = (met: number, turns?: unknown) => {
      const ask = parseAsk({ ...INN, met, memories: road, ...(turns ? { turns } : {}) });
      if (ask?.kind !== 'inn-chat') throw new Error('the inn ask should parse');
      return innMessages(ask).at(-1);
    };
    expect(last(OLD_FRIENDS)).toMatchObject({
      role: 'system',
      content: expect.stringContaining('recall'),
    });
    expect(last(OLD_FRIENDS - 1)?.role).toBe('user');
    expect(last(OLD_FRIENDS, [])?.content).not.toContain('recall');
    expect(parseAsk({ ...INN, memories: ['a', 'b', 'c', 'd'] })).toBeNull();
    expect(parseAsk({ ...INN, memories: ['x'.repeat(241)] })).toBeNull();
  });

  it('tells the regular how well they know the traveler', () => {
    const setting = (met: number) => {
      const ask = parseAsk({ ...INN, met });
      if (ask?.kind !== 'inn-chat') throw new Error('the inn ask should parse');
      return innMessages(ask)[0]?.content ?? '';
    };
    expect(setting(0)).toContain('This is your first chat with the traveler');
    expect(setting(1)).toContain('You have chatted with the traveler once before.');
    expect(setting(3)).toContain('3 times before');
    expect(setting(OLD_FRIENDS)).toContain('you are old friends');
    // The greeting matches: a first meeting, a second, an old friend.
    const greet = (met: number) => {
      const ask = parseAsk({ ...INN, met, turns: [] });
      if (ask?.kind !== 'inn-chat') throw new Error('the inn ask should parse');
      return innMessages(ask).at(-1)?.content ?? '';
    };
    expect(greet(0)).toContain('تشرّفنا');
    expect(greet(2)).toContain('مرة تانية');
    expect(greet(OLD_FRIENDS)).toContain('وينك من زمان');
    expect(parseAsk({ ...INN, met: -1 })).toBeNull();
    expect(parseAsk({ ...INN, met: 1.5 })).toBeNull();
  });

  it('asks for a greeting when the chat has no turns yet', () => {
    const ask = parseAsk({ ...INN, turns: [] });
    if (ask?.kind !== 'inn-chat') throw new Error('the inn ask should parse');
    expect(innMessages(ask).map((m) => m.role)).toEqual(['system', 'user']);
  });

  it('never goes to Gemini: without a Groq key the inn is not set up', async () => {
    const { calls, fetchFn } = services();
    const res = await handle(request(INN), { ...ENV, GROQ_API_KEY: undefined }, fetchFn);
    expect(await json(res)).toEqual({ status: 503, body: { error: 'not-set-up' } });
    expect(calls).toHaveLength(0);
  });

  it('asks once more when a line breaks the rules, then gives up', async () => {
    let n = 0;
    const once = services({
      groq: () => groqSays(n++ === 0 ? 'Hello! I am an AI.' : 'أهلين! كيفك؟'),
    });
    expect((await json(await handle(request(INN), ENV, once.fetchFn))).body.text).toBe(
      'أهلين! كيفك؟',
    );
    const never = services({ groq: () => groqSays('Sure, here you go') });
    expect(await json(await handle(request(INN), ENV, never.fetchFn))).toEqual({
      status: 502,
      body: { error: 'failed' },
    });
    expect(never.calls.filter((c) => c.url.includes('groq'))).toHaveLength(2);
    const busy = services({ groq: () => new Response('', { status: 429 }) });
    expect((await handle(request(INN), ENV, busy.fetchFn)).status).toBe(503);
  });

  it('takes only short Arabic turns from the two sides', () => {
    expect(parseAsk({ ...INN, turns: [{ who: 'me', text: 'x' }] })).toBeNull();
    expect(parseAsk({ ...INN, turns: [{ who: 'you', text: 'ا'.repeat(161) }] })).toBeNull();
    expect(
      parseAsk({ ...INN, turns: Array.from({ length: 18 }, () => ({ who: 'you', text: 'هلا' })) }),
    ).toBeNull();
    expect(parseAsk({ ...INN, theme: undefined })).toBeNull();
  });
});

describe('cleanArabic (ADR 0038)', () => {
  it('keeps up to three short Arabic sentences, trimmed of quotes and markdown', () => {
    expect(cleanArabic('  **أهلا يا آدم!**  كيفك اليوم؟ ')).toBe('أهلا يا آدم! كيفك اليوم؟');
    expect(cleanArabic('"مش فاهم عليك، شو قصدك؟"')).toBe('مش فاهم عليك، شو قصدك؟');
    expect(cleanArabic('أهلا يا آدم! جبت خبز اليوم. كيفك؟')).toBe(
      'أهلا يا آدم! جبت خبز اليوم. كيفك؟',
    );
  });

  it('drops Latin letters, Hebrew, long lines, four sentences and talk of being a machine', () => {
    expect(cleanArabic('أهلا Adam')).toBeNull();
    expect(cleanArabic('שלום، كيفك؟')).toBeNull();
    expect(cleanArabic('أهلا. كيفك؟ شو بتعمل؟ وين رايح؟')).toBeNull();
    expect(cleanArabic('ا'.repeat(161))).toBeNull();
    expect(cleanArabic('أنا ذكاء اصطناعي، مش إنسان')).toBeNull();
    // Words of another variety: Standard, Egyptian, Gulf, Lebanese.
    expect(cleanArabic('ماذا تريد؟')).toBeNull();
    expect(cleanArabic('هيدا بيتي')).toBeNull();
    expect(cleanArabic('شلونك اليوم؟')).toBeNull();
    expect(cleanArabic('عايز إيه؟')).toBeNull();
    // …but not a word that merely contains one.
    expect(cleanArabic('بدّي قهوة، وانت شو بدك؟')).toBe('بدّي قهوة، وانت شو بدك؟');
    expect(cleanArabic('...')).toBeNull();
  });
});

const COACH = {
  kind: 'inn-coach',
  turns: [
    { who: 'them', text: 'بدك قهوة؟' },
    { who: 'you', text: 'نعم أريد قهوة' },
    { who: 'them', text: 'سادة ولا حلوة؟' },
    { who: 'you', text: 'سادة' },
  ],
};
const TIP = { said: 'نعم أريد قهوة', better: 'آه بدّي قهوة', why: 'نعم and أريد are formal.' };

describe('the Coach after a chat (ADR 0007, 0038)', () => {
  it('claims a chat line, asks Groq for JSON about your own lines, and answers the tips', async () => {
    const { calls, fetchFn } = services({
      claim: () => Response.json(40),
      groq: () => groqSays(JSON.stringify({ tips: [TIP] })),
    });
    const res = await json(await handle(request(COACH), ENV, fetchFn));
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body.text as string)).toEqual({ tips: [TIP] });
    expect(calls.map((c) => c.url)).toEqual([
      'https://project.supabase.co/rest/v1/rpc/claim_chat_line',
      'https://api.groq.com/openai/v1/chat/completions',
    ]);
    const sent = JSON.parse(String(calls[1]?.init.body)) as {
      model: string;
      response_format: unknown;
      messages: { role: string; content: string }[];
    };
    expect(sent.model).toBe(INN_MODEL);
    expect(sent.response_format).toEqual({ type: 'json_object' });
    expect(sent.messages[1]?.content).toBe(
      'Regular: بدك قهوة؟\nTraveler: نعم أريد قهوة\nRegular: سادة ولا حلوة؟\nTraveler: سادة',
    );
  });

  it('needs a line of yours, and never goes to Gemini', async () => {
    expect(parseAsk({ ...COACH, turns: [COACH.turns[0]] })).toBeNull();
    const { calls, fetchFn } = services();
    const res = await handle(request(COACH), { ...ENV, GROQ_API_KEY: undefined }, fetchFn);
    expect(await json(res)).toMatchObject({ status: 503, body: { error: 'not-set-up' } });
    expect(calls).toEqual([]);
  });

  it('keeps only tips about your own lines, in Arabic, at most 3', () => {
    const ask = parseAsk(COACH);
    if (ask?.kind !== 'inn-coach') throw new Error('the coach ask should parse');
    const tips = (t: unknown[]) => cleanTips(JSON.stringify({ tips: t }), ask);
    expect(tips([TIP, TIP])).toEqual([TIP]);
    expect(tips([{ ...TIP, said: 'بدك قهوة؟' }])).toEqual([]);
    expect(tips([{ ...TIP, better: 'Ah biddi ahwe' }])).toEqual([]);
    expect(tips([{ ...TIP, better: TIP.said }])).toEqual([]);
    // Only spelling changed (an alif, a hamza, a mark): not a tip.
    expect(tips([{ ...TIP, better: 'نَعَم اريد قهوه' }])).toEqual([]);
    expect(tips([{ ...TIP, why: '' }])).toEqual([]);
    expect(tips([])).toEqual([]);
    expect(cleanTips('not json', ask)).toBeNull();
    expect(cleanTips('```json\n{"tips":[]}\n```', ask)).toEqual([]);
  });
});
