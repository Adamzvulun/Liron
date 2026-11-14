/**
 * The AI partner (E15, ADR 0004, 0007, 0036): a Vercel function (ADR 0011 #3) that writes one
 * line a character says. Three kinds so far: two of a Radio Room operator's, `radio-news`, their
 * news (ADR 0036), and `radio-reply`, their answer to the news the learner keyed (ADR 0037); and
 * `inn-chat`, a regular's next line in an Arabic chat at the inn (E17, ADR 0038).
 *
 * POST /api/partner, `Authorization: Bearer <the learner's Supabase access token>`, a JSON body
 * shaped like `PartnerAsk` in src/core/partner.ts. Answers `{ text, left }`: the line and how many
 * replies are left today. Errors answer `{ error }` with one of the codes in `PartnerFailure`.
 *
 * The prompt lives here, not in the browser. For the radio, Gemini (`gemini-3.5-flash-lite`,
 * ADR 0013) is asked first, Groq (`qwen/qwen3.8-27b`) when Gemini fails. For the inn, only Groq
 * (`openai/gpt-oss-120b`, ADR 0038), so the learner's Arabic never reaches Gemini's free tier.
 * Nothing is stored here; the Supabase call (claim_partner_reply, or claim_chat_line for the inn)
 * proves sign-in and takes one of today's replies.
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
/** The inn's model (ADR 0038): the best Palestinian Arabic of the free models in the spike. */
export const INN_MODEL = 'openai/gpt-oss-120b';
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

/** The rules for a regular's line in an Arabic chat at the inn (ADR 0007, 0038). */
export const INN_RULES = [
  'You are a regular at an old inn (a caravanserai) in Palestine, chatting at a table with a',
  'traveler who is learning Arabic. You are a real person with your own life; the details are below.',
  'Speak ONLY Palestinian colloquial Arabic, as people speak it in Jerusalem or Ramallah, in Arabic',
  'script. Never Modern Standard Arabic. Never Egyptian, Gulf or Maghrebi words.',
  'Say شو (not إيه, ماذا or شنو), كيفك (not شلونك, إزيك or كيف حالك), هلّق (not الآن or دلوقتي),',
  'بدّي (not عايز, أريد or أبغى), هاد and هاي (not هذا, هذه or ده), منيح (not كويس or جيد).',
  'Reply with ONE or TWO short, simple sentences a beginner can follow. Often end with one simple',
  'question back.',
  'Put vowel marks only on a word that could be misread; most words need none.',
  'Never teach, translate, explain grammar or correct the traveler. If you cannot understand them,',
  'say so simply, as a person would: a man says "مش فاهم عليك، شو قصدك؟", a woman',
  '"مش فاهمة عليك، شو قصدك؟".',
  'Never write Latin letters, English or Hebrew. Never say you are an AI, a bot or a model.',
  'Use the grammar of your own gender (a woman says "فاهمة", "مبسوطة"; a man "فاهم", "مبسوط").',
  'Stay in character. Talk about your own life and everyday things.',
  'Reply ONLY with your line.',
].join('\n');

interface AskBase {
  persona: { who: string; about: string };
  learner: { name: string; place: string; contacts: number };
  past: string[];
  told: string[];
}

export interface InnTurn {
  /** `them` is the regular, `you` the learner. */
  who: 'them' | 'you';
  text: string;
}

/** A regular's next line at the inn (ADR 0038). Only our own content and what the learner typed. */
export interface InnAsk {
  kind: 'inn-chat';
  persona: { who: string; about: string };
  /** The name the regulars know the learner by. */
  learner: { name: string };
  /** The word chapter's theme and our own English glosses of its words (no deck text). */
  theme: string;
  words: string[];
  /** The last few things the learner said to this regular in earlier chats, oldest first. */
  told: string[];
  /** This chat so far, oldest first. Empty for the regular's opening line. */
  turns: InnTurn[];
}

/**
 * The Coach's debrief after a chat at the inn (ADR 0007, 0038): the chat itself, nothing else.
 * Answered by Groq only, counted as one line against the day's chat lines.
 */
export interface CoachAsk {
  kind: 'inn-coach';
  turns: InnTurn[];
}

export type Ask =
  | (AskBase & { kind: 'radio-news' })
  | (AskBase & { kind: 'radio-reply'; news: string | null; heard: string })
  | InnAsk
  | CoachAsk;

/** The most turns a chat sends: 8 of the learner's lines and the regular's answers. */
export const MAX_TURNS = 17;

const text = (v: unknown, max: number) =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max ? v.trim() : null;

/** Up to three short lines, or null when it's something else. */
const lines = (v: unknown, max: number): string[] | null =>
  Array.isArray(v) && v.length <= 3 && v.every((p) => text(p, max))
    ? (v as string[]).map((p) => p.trim())
    : null;

const strings = (v: unknown, most: number, max: number): string[] | null =>
  Array.isArray(v) && v.length <= most && v.every((p) => text(p, max))
    ? (v as string[]).map((p) => p.trim())
    : null;

function parseTurns(v: unknown): InnTurn[] | null {
  if (!Array.isArray(v) || v.length > MAX_TURNS) return null;
  const turns: InnTurn[] = [];
  for (const t of v as unknown[]) {
    const turn = (t ?? {}) as Record<string, unknown>;
    const said = text(turn.text, 160);
    if ((turn.who !== 'them' && turn.who !== 'you') || !said) return null;
    turns.push({ who: turn.who, text: said });
  }
  return turns;
}

function parseInn(b: Record<string, unknown>): InnAsk | null {
  const persona = (b.persona ?? {}) as Record<string, unknown>;
  const learner = (b.learner ?? {}) as Record<string, unknown>;
  const who = text(persona.who, 80);
  const about = text(persona.about, 900);
  const name = text(learner.name, 24);
  const theme = text(b.theme, 160);
  const words = b.words === undefined ? [] : strings(b.words, 40, 40);
  const told = b.told === undefined ? [] : strings(b.told, 3, 160);
  const turns = parseTurns(b.turns);
  if (!who || !about || !name || !theme || !words || !told || !turns) return null;
  return {
    kind: 'inn-chat',
    persona: { who, about },
    learner: { name },
    theme,
    words,
    told,
    turns,
  };
}

/** Checks the body: our own content and what the learner keyed, all short. */
export function parseAsk(body: unknown): Ask | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (b.kind === 'inn-chat') return parseInn(b);
  if (b.kind === 'inn-coach') {
    const turns = parseTurns(b.turns);
    return turns?.some((t) => t.who === 'you') ? { kind: 'inn-coach', turns } : null;
  }
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

/** What a regular is told about this chat: their story, the traveler, and what you know. */
export function innSetting(ask: InnAsk): string {
  const { persona, learner, theme, words, told } = ask;
  return [
    `You are ${persona.who}. ${persona.about}`,
    `The traveler's name is ${learner.name}.`,
    told.length
      ? `What the traveler told you in earlier chats, oldest first: ${quoted(told)}`
      : 'This is your first chat with the traveler.',
    `The traveler has been learning words about: ${theme}.` +
      (words.length ? ` For example: ${words.join(', ')}.` : '') +
      ' Lean on everyday words like these.',
  ].join('\n');
}

/** The chat as messages: the regular is the assistant, the traveler the user. */
export function innMessages(
  ask: InnAsk,
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const turns = ask.turns.map((t) => ({
    role: t.who === 'them' ? ('assistant' as const) : ('user' as const),
    content: t.text,
  }));
  return [
    { role: 'system', content: `${INN_RULES}\n\n${innSetting(ask)}` },
    ...(turns.length === 0 || turns[0]?.role === 'assistant'
      ? [
          {
            role: 'user' as const,
            content:
              '(The traveler sits down at your table. Greet them by name, and say in a few simple words one small thing from your own day.)',
          },
        ]
      : []),
    ...turns,
  ];
}

const LATIN = /[A-Za-z]/;
const NOT_ARABIC_LINE = /[^\u0600-\u06FF\u0750-\u077F\s0-9.,!?:"«»()\-–—…]/u;
const SAYS_MACHINE = /ذكاء\s*(ال)?اصطناعي|نموذج\s*لغ|روبوت|بوت\b/u;
/** The longest line a regular says. */
export const MAX_ARABIC = 160;

/**
 * A regular's line as the inn shows it, or null when it breaks ADR 0038's rules: Arabic script
 * only, at most 3 sentences (a greeting like "أهلا!" is one) and 160 characters, and never a word about being a machine.
 */
export function cleanArabic(said: string): string | null {
  const line = said
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'“”«]+|["'“”»]+$/g, '')
    .trim();
  if (!line || line.length > MAX_ARABIC) return null;
  if (LATIN.test(line) || NOT_ARABIC_LINE.test(line) || SAYS_MACHINE.test(line)) return null;
  if (!/[\u0621-\u064A]/.test(line)) return null;
  const sentences = line.split(/[.!?؟]+/).filter((p) => p.trim()).length;
  return sentences <= 3 ? line : null;
}

/** What the character is told about this talk. */
export function radioPrompt(ask: Exclude<Ask, InnAsk | CoachAsk>): string {
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
  rpc: 'claim_partner_reply' | 'claim_chat_line' = 'claim_partner_reply',
): Promise<number | PartnerFailure> {
  let res: Response;
  try {
    res = await fetchFn(`${url}/rest/v1/rpc/${rpc}`, {
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

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

async function askGroq(
  key: string,
  messages: Message[],
  f: typeof fetch,
  model: string = GROQ_MODEL,
  json = false,
): Promise<Said> {
  try {
    const res = await f(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: 1,
        // gpt-oss thinks briefly first (about 15 tokens at low effort); 300 leaves room for it,
        // and the Coach (medium effort, then JSON) gets 1,500.
        max_completion_tokens: json ? 1500 : 300,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        // The Coach thinks a little longer: it answers once, after the chat, not mid-talk.
        ...(model === INN_MODEL
          ? { reasoning_effort: json ? 'medium' : 'low', include_reasoning: false }
          : {}),
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

/** The silent Coach (ADR 0007): kind, short, and only about the traveler's own lines. */
export const COACH_RULES = [
  'You are a kind, brief coach of Palestinian colloquial Arabic (as spoken in Jerusalem or',
  'Ramallah). A beginner who speaks Hebrew and English just chatted with someone at an inn.',
  'Look ONLY at the lines marked "Traveler". Pick at most 3 that a Palestinian would say',
  'differently: a wrong word, wrong grammar, Modern Standard Arabic, or something unnatural.',
  'Skip lines that are fine. Never correct spelling alone, or a missing vowel mark. Never change',
  'the gender of a word the traveler uses about themselves.',
  'Your "better" line MUST itself be Palestinian colloquial, never Modern Standard Arabic: the',
  'present with b- (بشتغل, بحب, بروح; not أعمل, أحب), بدّي (not أريد), شو (not ماذا), منيح (not',
  'جيد or بخير), هلّق (not الآن), آه (not نعم), هاد/هاي (not هذا/هذه), مش (not ليس or لا before a verb).',
  'A Modern Standard word in a traveler line (ماذا, أريد, نعم, جيد, الآن) is always worth a tip.',
  'Answer ONLY with JSON: {"tips":[{"said":"<the traveler line, copied exactly>",',
  '"better":"<how a Palestinian would say it, in Arabic script, short>",',
  '"why":"<one short sentence in plain English, at most 15 words>"}]}.',
  'If every line is fine, answer {"tips":[]}.',
].join('\n');

export function coachMessages(ask: CoachAsk): Message[] {
  const chat = ask.turns
    .map((t) => `${t.who === 'you' ? 'Traveler' : 'Regular'}: ${t.text}`)
    .join('\n');
  return [
    { role: 'system', content: COACH_RULES },
    { role: 'user', content: chat },
  ];
}

export interface Tip {
  said: string;
  better: string;
  why: string;
}

/**
 * The Coach's tips, checked: each is about one of the traveler's own lines, says it better in
 * Arabic only (cleanArabic), and explains why in a short line of plain text. At most 3; null when
 * the answer isn't the JSON asked for.
 */
export function cleanTips(said: string, ask: CoachAsk): Tip[] | null {
  const json = said.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^```(json)?|```$/gm, '');
  let body: unknown;
  try {
    body = JSON.parse(json.trim());
  } catch {
    return null;
  }
  const tips = (body as { tips?: unknown } | null)?.tips;
  if (!Array.isArray(tips)) return null;
  const yours = new Set(ask.turns.filter((t) => t.who === 'you').map((t) => t.text.trim()));
  const kept: Tip[] = [];
  for (const t of tips as unknown[]) {
    const tip = (t ?? {}) as Record<string, unknown>;
    const line = typeof tip.said === 'string' ? tip.said.trim() : '';
    const better = typeof tip.better === 'string' ? cleanArabic(tip.better) : null;
    const why = typeof tip.why === 'string' ? tip.why.replace(/[<>*_#`]/g, '').trim() : '';
    if (!yours.has(line) || !better || better === line || !why || why.length > 140) continue;
    if (kept.some((k) => k.said === line)) continue;
    kept.push({ said: line, better, why });
  }
  return kept.slice(0, 3);
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

  if (ask.kind === 'inn-coach') {
    // The Coach, like the inn, talks only to Groq (ADR 0038), and costs one chat line.
    if (!GROQ_API_KEY) return fail('not-set-up');
    const left = await claim(
      VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY,
      token,
      fetchFn,
      'claim_chat_line',
    );
    if (typeof left !== 'number') return fail(left);
    for (let attempt = 0; attempt < 2; attempt++) {
      const said = await askGroq(GROQ_API_KEY, coachMessages(ask), fetchFn, INN_MODEL, true);
      if (said === 'busy') return fail('busy');
      const tips = said ? cleanTips(said, ask) : null;
      if (tips) return answer({ text: JSON.stringify({ tips }), left });
    }
    return fail('failed');
  }

  if (ask.kind === 'inn-chat') {
    // The inn talks only to Groq (ADR 0038): no key, no chat.
    if (!GROQ_API_KEY) return fail('not-set-up');
    const left = await claim(
      VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY,
      token,
      fetchFn,
      'claim_chat_line',
    );
    if (typeof left !== 'number') return fail(left);
    let busy = false;
    // A line that breaks the rules is asked for once more; then the regular has to go.
    for (let attempt = 0; attempt < 2; attempt++) {
      const said = await askGroq(GROQ_API_KEY, innMessages(ask), fetchFn, INN_MODEL);
      if (said === 'busy') {
        busy = true;
        break;
      }
      const line = said ? cleanArabic(said) : null;
      if (line) return answer({ text: line, left });
    }
    return fail(busy ? 'busy' : 'failed');
  }

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
    GROQ_API_KEY
      ? () =>
          askGroq(
            GROQ_API_KEY,
            [
              { role: 'system', content: rules },
              { role: 'user', content: prompt },
            ],
            fetchFn,
          )
      : null,
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
