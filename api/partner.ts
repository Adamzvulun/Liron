/**
 * The AI partner (E15, ADR 0004, 0007, 0036): a Vercel function (ADR 0011 #3) that writes one
 * line a character says. Two kinds so far, both a Radio Room operator's: `radio-news`, their news
 * (ADR 0036), and `radio-reply`, their answer to the news the learner keyed (ADR 0037).
 *
 * POST /api/partner, `Authorization: Bearer <the learner's Supabase access token>`, a JSON body
 * shaped like `PartnerAsk` in src/core/partner.ts. Answers `{ text, left }`: the line and how many
 * replies are left today. Errors answer `{ error }` with one of the codes in `PartnerFailure`.
 *
 * The prompt lives here, not in the browser. Gemini (`gemini-3.5-flash-lite`, ADR 0013) is asked
 * first, Groq (`qwen/qwen3.8-27b`) when Gemini fails. Nothing is stored here; the Supabase call
 * (claim_partner_reply) proves sign-in and takes one of today's replies.
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

export type PartnerFailure =
  'method' | 'signed-out' | 'not-set-up' | 'bad-request' | 'daily-limit' | 'busy' | 'failed';

const STATUS: Record<PartnerFailure, number> = {
  method: 405,
  'signed-out': 401,
  'not-set-up': 503,
  'bad-request': 400,
  'daily-limit': 429,
  busy: 503,
  failed: 502,
};

export const GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const GROQ_MODEL = 'qwen/qwen3.8-27b';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** A provider that hasn't answered by then is skipped: the room falls back to its script. */
const TIMEOUT_MS = 8000;
/**
 * Gemini's time for an answer to the learner's news (ADR 0037). The room waits 6 s for it, and
 * Gemini took 5–8 s in the eval (scripts/partner-eval.ts, 2026-11-11) while Groq took under 1 s,
 * so Gemini gets 3 s and then Groq answers in time.
 */
export const REPLY_GEMINI_MS = 3000;
/** The longest line passed back; the browser cuts it to what Morse can send. */
const MAX_TEXT = 120;

/** The rules for an operator's news line (ADR 0007: a person, never a tutor or an AI). */
export const RADIO_RULES = [
  'You are a ham radio operator in a Morse code contact, writing one short line of your side.',
  'Reply ONLY with the line, in CAPITALS, using only A-Z, 0-9, spaces and . , ? /',
  'Use real CW abbreviations (FB, HR, ES, UR, OM, TNX, AGN, CUL) where natural.',
  '3 to 8 words of your own news: home, family, pets, work, the radio, plans.',
  'No callsigns, no signal report, no weather, no temperature, no greeting, no sign-off.',
  'Never say you are an AI or a teacher. Stay in character.',
  'If you have past lines with this station, carry that story on; never repeat a line.',
  'Now and then, instead, ask briefly about news they told you before (e.g. "HW IS UR NEW DOG?").',
  'You only know what they told you: never say how their news turned out.',
  'Examples: "DOG CHEWED MY HEADPHONES AGN" or "BUILDING A NEW ANTENNA IN THE GARDEN"',
].join('\n');

/** The rules for an operator's answer to the learner's news (ADR 0037). */
export const REPLY_RULES = [
  'You are a ham radio operator in a Morse code contact. The other station just sent you their',
  'own news in Morse. Answer it in one short, warm line before you sign off.',
  'Reply ONLY with the line, in CAPITALS, using only A-Z, 0-9, spaces and . , ? /',
  'Use real CW abbreviations (FB, R, TNX, UR, ES, GL, OM, SRI, CONGRATS) where natural.',
  '2 to 6 words, reacting to what they said. No question: the contact is ending.',
  'You only know what they told you: never add facts about their life.',
  'SRI means sorry: use it only for bad news or a missed copy. For good news use FB or CONGRATS.',
  'No callsigns, no signal report, no weather, no greeting, no 73 and no sign-off words.',
  'Their Morse was decoded by a machine and may be garbled. If you cannot make sense of it,',
  'say kindly that you missed some of it (e.g. "SRI NOT ALL COPY, BUT FB").',
  'If it is rude or not news, just answer "R R FB".',
  'Never say you are an AI or a teacher. Never correct their Morse. Stay in character.',
  'Examples: "FB ON UR NEW JOB, GL" or "SRI ABT UR COLD, GET WELL SOON"',
].join('\n');

interface AskBase {
  persona: { who: string; about: string };
  learner: { name: string; place: string; contacts: number };
  past: string[];
  told: string[];
}

export type Ask =
  | (AskBase & { kind: 'radio-news' })
  | (AskBase & { kind: 'radio-reply'; news: string | null; heard: string });

const text = (v: unknown, max: number) =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max ? v.trim() : null;

/** Up to three short lines, or null when it's something else. */
const lines = (v: unknown, max: number): string[] | null =>
  Array.isArray(v) && v.length <= 3 && v.every((p) => text(p, max))
    ? (v as string[]).map((p) => p.trim())
    : null;

/** Checks the body: our own content and what the learner keyed, all short. */
export function parseAsk(body: unknown): Ask | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  const persona = (b.persona ?? {}) as Record<string, unknown>;
  const learner = (b.learner ?? {}) as Record<string, unknown>;
  const who = text(persona.who, 80);
  const about = text(persona.about, 300);
  const name = text(learner.name, 12);
  const place = text(learner.place, 16);
  const contacts = learner.contacts;
  const past = lines(b.past, 80);
  const told = b.told === undefined ? [] : lines(b.told, 60);
  if (!who || !about || !name || !place || !past || !told) return null;
  if (typeof contacts !== 'number' || !Number.isInteger(contacts) || contacts < 0) return null;
  const base: AskBase = {
    persona: { who, about },
    learner: { name, place, contacts: Math.min(contacts, 999) },
    past,
    told,
  };
  if (b.kind === 'radio-news') return { kind: 'radio-news', ...base };
  if (b.kind !== 'radio-reply') return null;
  const heard = text(b.heard, 60);
  const news = b.news === undefined || b.news === null ? null : text(b.news, 80);
  if (!heard || (b.news != null && !news)) return null;
  return { kind: 'radio-reply', ...base, news, heard };
}

const quoted = (ls: readonly string[]) => ls.map((p) => `"${p}"`).join(' ; ');

/** What the character is told about this talk. */
export function radioPrompt(ask: Ask): string {
  const { persona, learner, past, told } = ask;
  return [
    `You are ${persona.who}. ${persona.about}`,
    `The other station: name ${learner.name}, town ${learner.place}. ` +
      `Contacts with them before: ${learner.contacts}.`,
    past.length
      ? `Your lines in past contacts with them, oldest first: ${quoted(past)}`
      : 'This is your first contact with them.',
    ...(told.length ? [`What they told you in past contacts, oldest first: ${quoted(told)}`] : []),
    ...(ask.kind === 'radio-reply'
      ? [
          ...(ask.news ? [`Your news this time was: "${ask.news}"`] : []),
          `Just now they sent you their news: "${ask.heard}"`,
          'Write your answer to it.',
        ]
      : ['Write your next line of news.']),
  ].join('\n');
}

const answer = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
const fail = (error: PartnerFailure) => answer({ error }, STATUS[error]);

/** Takes one of today's replies as the learner: how many are left, or why not. */
async function claim(
  url: string,
  key: string,
  token: string,
  fetchFn: typeof fetch,
): Promise<number | PartnerFailure> {
  let res: Response;
  try {
    res = await fetchFn(`${url}/rest/v1/rpc/claim_partner_reply`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
  } catch {
    return 'failed';
  }
  if (res.status === 401 || res.status === 403) return 'signed-out';
  if (!res.ok) return 'failed';
  const left = Number(await res.json().catch(() => NaN));
  if (!Number.isInteger(left)) return 'failed';
  return left < 0 ? 'daily-limit' : left;
}

type Said = string | 'busy' | null;

async function askGemini(
  key: string,
  rules: string,
  prompt: string,
  f: typeof fetch,
  timeout = TIMEOUT_MS,
): Promise<Said> {
  try {
    const res = await f(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: rules }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 1, maxOutputTokens: 60 },
      }),
      signal: AbortSignal.timeout(timeout),
    });
    if (res.status === 429) return 'busy';
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as {
      candidates?: { content?: { parts?: { text?: unknown }[] } }[];
    } | null;
    const said = body?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('');
    return typeof said === 'string' && said.trim() ? said : null;
  } catch {
    return null;
  }
}

async function askGroq(key: string, rules: string, prompt: string, f: typeof fetch): Promise<Said> {
  try {
    const res = await f(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: rules },
          { role: 'user', content: prompt },
        ],
        temperature: 1,
        max_completion_tokens: 300,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 429) return 'busy';
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: unknown } }[];
    } | null;
    const said = body?.choices?.[0]?.message?.content;
    return typeof said === 'string' && said.trim() ? said : null;
  } catch {
    return null;
  }
}

/** The first line of a reply, without thinking tags or quotes, cut short. */
export const firstLine = (said: string) =>
  (
    said
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .trim()
      .split('\n')[0] ?? ''
  )
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim()
    .slice(0, MAX_TEXT);

/** The handler, with its environment and `fetch` passed in so tests can fake both. */
export async function handle(
  request: Request,
  env: Env,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'POST') return fail('method');
  const token = /^Bearer (\S+)$/.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!token) return fail('signed-out');
  const { GEMINI_API_KEY, GROQ_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY } = env;
  if (!(GEMINI_API_KEY || GROQ_API_KEY) || !VITE_SUPABASE_URL || !VITE_SUPABASE_PUBLISHABLE_KEY) {
    return fail('not-set-up');
  }
  if (Number(request.headers.get('Content-Length') ?? 0) > 4000) return fail('bad-request');
  const ask = parseAsk(await request.json().catch(() => null));
  if (!ask) return fail('bad-request');

  const left = await claim(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, token, fetchFn);
  if (typeof left !== 'number') return fail(left);

  const prompt = radioPrompt(ask);
  const rules = ask.kind === 'radio-reply' ? REPLY_RULES : RADIO_RULES;
  let busy = false;
  for (const provider of [
    GEMINI_API_KEY
      ? () =>
          askGemini(
            GEMINI_API_KEY,
            rules,
            prompt,
            fetchFn,
            ask.kind === 'radio-reply' ? REPLY_GEMINI_MS : TIMEOUT_MS,
          )
      : null,
    GROQ_API_KEY ? () => askGroq(GROQ_API_KEY, rules, prompt, fetchFn) : null,
  ]) {
    if (!provider) continue;
    const said = await provider();
    if (said === 'busy') busy = true;
    else if (said) {
      const line = firstLine(said);
      if (line) return answer({ text: line, left });
    }
  }
  return fail(busy ? 'busy' : 'failed');
}

export default {
  fetch: (request: Request) => handle(request, process.env),
};
