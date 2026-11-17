/**
 * The AI partner (E15, ADR 0004, 0007, 0036): a Vercel function (ADR 0011 #3) that writes one
 * line a character says. Three kinds so far: two of a Radio Room operator's, `radio-news`, their
 * news (ADR 0036), and `radio-reply`, their answer to the news the learner keyed (ADR 0037); and
 * `inn-chat`, a regular's next line in an Arabic chat at the inn (E17, ADR 0038); and for the
 * Long Road In's finale (ADR 0047), `inn-story`, the innkeeper's next question about your road,
 * and `inn-judge`, the verdict on that chat against the capstone's rubric.
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
 * src/ (whose imports end in `.ts`). It reads the characters from content/ at run time (vercel.json's
 * `includeFiles` ships them): the browser names a Radio Room operator by id and a regular at the
 * inn by number, and can't hand the model a sheet of its own (report §4at, §4bd).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Env {
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

export type PartnerFailure =
  | 'method'
  | 'signed-out'
  | 'not-set-up'
  | 'bad-request'
  | 'daily-limit'
  | 'site-limit'
  | 'busy'
  | 'failed';

const STATUS: Record<PartnerFailure, number> = {
  method: 405,
  'signed-out': 401,
  'not-set-up': 503,
  'bad-request': 400,
  'daily-limit': 429,
  // Everyone's replies or lines for today are used up (ADR 0041).
  'site-limit': 429,
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
  'بدّي (not عايز, أريد or أبغى), هاد and هاي (not هذا, هذه, ده or هيدا), منيح (not كويس or جيد).',
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
  /** How many chats with this regular came before this one (their reputation, E17). */
  met: number;
  /**
   * What the traveler and this regular did together on the road (the regular's milestones, our
   * own English text), once their trial is passed; at most 3.
   */
  memories: string[];
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

/**
 * "Your Story", the Long Road In's finale (task 4.2, ADR 0047): the innkeeper, with the regulars
 * listening, asks the traveler about their road. Answered by Groq only, one chat line each.
 */
export interface StoryAsk {
  kind: 'inn-story';
  learner: { name: string };
  turns: InnTurn[];
}

/**
 * The judge of "Your Story" (task 4.3, ADR 0047): the finished chat against the written rubric.
 * Answered by Groq only, as JSON, one chat line.
 */
export interface JudgeAsk {
  kind: 'inn-judge';
  turns: InnTurn[];
}

export type Ask =
  | (AskBase & { kind: 'radio-news' })
  | (AskBase & { kind: 'radio-reply'; news: string | null; heard: string })
  | InnAsk
  | CoachAsk
  | StoryAsk
  | JudgeAsk;

/** The most turns a chat sends: 8 of the learner's lines and the regular's answers. */
export const MAX_TURNS = 17;

/** Chats before a regular greets you as an old friend (their reputation, E17). */
export const OLD_FRIENDS = 5;

/** The largest body the function reads, in bytes. */
export const MAX_BODY = 8_000;

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

/** The glosses of a regular's chapter sent with each line, at most. */
export const WORDS_SENT = 25;

interface RegularData {
  number: number;
  wordChapter: number;
  title: string;
  who: string;
  intro: string;
  outro: string;
  milestones: string[];
  she?: boolean;
}

/** What the inn tells the model about a regular, from our own content only. */
export interface InnSheet {
  persona: { who: string; about: string };
  theme: string;
  words: string[];
  milestones: string[];
}

/** Who speaks for a regular: the first person named ("Fares and the band" → Fares). */
const speakerOf = (who: string) => who.split(/ and |, /)[0] ?? who;

/** A regular's sheet, as the browser's innChat.ts built it before (its tests check they match). */
export function sheetOf(r: RegularData, chapter?: { theme: string; words: { gloss: string }[] }) {
  const gender = r.she ? 'You are a woman.' : 'You are a man.';
  const speaker = speakerOf(r.who);
  const group =
    speaker === r.who
      ? ''
      : `You are ${speaker}, at the table with ${r.who}; speak only for yourself.`;
  return {
    persona: {
      who: r.who.slice(0, 80),
      about: `${gender} ${group} ${r.intro} ${r.outro}`.replace(/\s+/g, ' ').slice(0, 900),
    },
    theme: (chapter?.theme ?? r.title).slice(0, 160),
    words: [...new Set((chapter?.words ?? []).map((w) => w.gloss.slice(0, 40)))].slice(
      0,
      WORDS_SENT,
    ),
    milestones: r.milestones.slice(0, 3).map((m) => m.slice(0, 240)),
  } satisfies InnSheet;
}

let operators: Map<string, { who: string; about: string }> | null = null;

/** The Radio Room's operators by id (`nils`, `ruth`…), read once from content/ (our own text). */
export function operatorSheets(): Map<string, { who: string; about: string }> {
  if (operators) return operators;
  const pack = JSON.parse(
    readFileSync(join(process.cwd(), 'content', 'morse', 'operators.json'), 'utf8'),
  ) as { items: { id: string; type: string; data: { who: string; about: string } }[] };
  operators = new Map(
    pack.items
      .filter((i) => i.type === 'operator')
      .map((i) => [i.id.replace(/^operator:/, ''), { who: i.data.who, about: i.data.about }]),
  );
  return operators;
}

let sheets: Map<number, InnSheet> | null = null;

/** The regulars' sheets by number, read once from content/ (our own text, never the deck's). */
export function innSheets(): Map<number, InnSheet> {
  if (sheets) return sheets;
  const read = (f: string) =>
    JSON.parse(readFileSync(join(process.cwd(), 'content', 'arabic', f), 'utf8')) as {
      items: { type: string; data: unknown }[];
    };
  const chapters = new Map(
    read('core-words.json').items.map((i) => {
      const c = i.data as { chapter: number; theme: string; words: { gloss: string }[] };
      return [c.chapter, c] as const;
    }),
  );
  sheets = new Map(
    read('questline.json')
      .items.filter((i) => i.type === 'regular')
      .map((i) => {
        const r = i.data as RegularData;
        return [r.number, sheetOf(r, chapters.get(r.wordChapter))] as const;
      }),
  );
  return sheets;
}

function parseInn(b: Record<string, unknown>): InnAsk | null {
  const learner = (b.learner ?? {}) as Record<string, unknown>;
  const name = text(learner.name, 24);
  const told = b.told === undefined ? [] : strings(b.told, 3, 160);
  const turns = parseTurns(b.turns);
  const met = b.met === undefined ? 0 : b.met;
  const shared = b.shared === undefined ? false : b.shared;
  if (!name || !told || !turns || typeof shared !== 'boolean') return null;
  if (typeof met !== 'number' || !Number.isInteger(met) || met < 0 || met > 9999) return null;
  if (typeof b.regular !== 'number' || !Number.isInteger(b.regular)) return null;
  const sheet = innSheets().get(b.regular);
  if (!sheet) return null;
  return {
    kind: 'inn-chat',
    persona: sheet.persona,
    learner: { name },
    theme: sheet.theme,
    words: sheet.words,
    told,
    met,
    // Their milestones happened once their trial is passed: shared memories.
    memories: shared ? sheet.milestones : [],
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
  if (b.kind === 'inn-story') {
    const name = text(((b.learner ?? {}) as Record<string, unknown>).name, 24);
    const turns = parseTurns(b.turns);
    return name && turns ? { kind: 'inn-story', learner: { name }, turns } : null;
  }
  if (b.kind === 'inn-judge') {
    const turns = parseTurns(b.turns);
    return turns?.some((t) => t.who === 'you') ? { kind: 'inn-judge', turns } : null;
  }
  const persona = typeof b.operator === 'string' ? operatorSheets().get(b.operator) : undefined;
  const learner = (b.learner ?? {}) as Record<string, unknown>;
  const who = persona?.who.slice(0, 80);
  const about = persona?.about.slice(0, 300);
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
  const { persona, learner, theme, words, told, met, memories } = ask;
  return [
    `You are ${persona.who}. ${persona.about}`,
    `The traveler's name is ${learner.name}.`,
    met === 0
      ? 'This is your first chat with the traveler: you are just getting to know them.'
      : met < OLD_FRIENDS
        ? `You have chatted with the traveler ${met === 1 ? 'once' : `${met} times`} before.`
        : `You have chatted with the traveler ${met} times: you are old friends, warm and familiar.`,
    ...(told.length
      ? [`What the traveler told you in earlier chats, oldest first: ${quoted(told)}`]
      : []),
    ...(memories.length
      ? [
          `What you and the traveler did together on the road (told from their side): ${quoted(memories)}`,
          'Mention one only if it fits naturally.',
        ]
      : []),
    `The traveler has been learning words about: ${theme}.` +
      (words.length ? ` For example: ${words.join(', ')}.` : '') +
      ' Lean on everyday words like these.',
  ].join('\n');
}

/**
 * How the regular greets the traveler, by how well they know each other: the words to reach for
 * say nothing of the traveler's gender, which the regular isn't told.
 */
export function greeting(met: number): string {
  if (met === 0)
    return 'Greet them by name as someone you are meeting for the first time (like تشرّفنا).';
  if (met < OLD_FRIENDS)
    return 'Greet them by name as someone you have met before (like أهلين فيك مرة تانية).';
  return 'Greet them by name as an old friend you have missed (like وينك من زمان؟ or اشتقنالك).';
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
            content: `(The traveler sits down at your table. ${greeting(ask.met)} Then say in a few simple words one small thing from your own day.)`,
          },
        ]
      : []),
    ...turns,
    // An old friend's second line recalls the road behind them: last, so it isn't lost.
    ...(recallNow(ask)
      ? [
          {
            role: 'system' as const,
            content:
              'In this line, as an old friend, fondly recall one of the things you did together on the road, in a few words (like أنا بتذكّر لمّا…, which says nothing of their gender). Then answer them.',
          },
        ]
      : []),
  ];
}

/** Whether this line is an old friend's second, which recalls a shared memory. */
const recallNow = (ask: InnAsk) =>
  ask.memories.length > 0 &&
  ask.met >= OLD_FRIENDS &&
  ask.turns.filter((t) => t.who === 'them').length === 1;

const LATIN = /[A-Za-z]/;
const NOT_ARABIC_LINE = /[^\u0600-\u06FF\u0750-\u077F\s0-9.,!?:"«»()\-–—…]/u;
const SAYS_MACHINE = /ذكاء\s*(ال)?اصطناعي|نموذج\s*لغ|روبوت|بوت\b/u;
/**
 * Words that give a line away as another variety, never Palestinian: Modern Standard (ماذا,
 * لماذا, سوف, أريد), Egyptian (عايز, دلوقتي, كده), Gulf (شلون, وايد, شنو) and Lebanese (هيدا).
 * The rules already forbid them; a reply that uses one anyway is asked for again.
 */
const GIVEAWAY =
  /(^|[\s،.!?؟])(ماذا|لماذا|سوف|أريد|عايز|عايزة|دلوقتي|كده|شلون|شلونك|وايد|شنو|هيدا|هيدي)(?=$|[\s،.!?؟])/u;
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
  if (GIVEAWAY.test(line)) return null;
  if (!/[\u0621-\u064A]/.test(line)) return null;
  const sentences = line.split(/[.!?؟]+/).filter((p) => p.trim()).length;
  return sentences <= 3 ? line : null;
}

/** What the character is told about this talk. */
export function radioPrompt(ask: Exclude<Ask, InnAsk | CoachAsk | StoryAsk | JudgeAsk>): string {
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
  if (left === -2) return 'site-limit';
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
        // The Coach corrects, so it answers the same way each time; the regulars chat freely.
        temperature: json ? 0.3 : 1,
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

/** Who asks for the traveler's story (task 4.2): the innkeeper, from our own story text. */
export const STORY_SETTING = [
  'You are the innkeeper of an old caravanserai in Palestine: a broad woman with flour on her',
  'sleeves, warm and direct. Months ago this traveler came to your gate unable to read a word,',
  'and you sat them down. They learned the letters, then the words, then talked with everyone at',
  'your table: Salim the carter, Umm Khalil, Yusuf the clockmender, Rana, Abu Fadi the mason,',
  'Nasser the guide, Leila the painter and the rest. Tonight the whole table is here, a stranger',
  'who cannot read has just come in, and you ask the traveler to tell everyone the story of their',
  'own road, in Arabic.',
  'Ask ONE simple question at a time about their road and their life: where they come from, why',
  'they came, what was hard, who they met here, what they like, what they will do next. Now and',
  'then react warmly to what they said before you ask. You may speak for another regular at the',
  'table once in a while ("سليم بسأل: …").',
  'You are a woman: use the grammar of your own gender.',
].join('\n');

export function storyMessages(ask: StoryAsk): Message[] {
  const turns = ask.turns.map((t) => ({
    role: t.who === 'them' ? ('assistant' as const) : ('user' as const),
    content: t.text,
  }));
  return [
    {
      role: 'system',
      content: `${INN_RULES}\n\n${STORY_SETTING}\nThe traveler's name is ${ask.learner.name}.`,
    },
    ...(turns.length === 0 || turns[0]?.role === 'assistant'
      ? [
          {
            role: 'user' as const,
            content:
              '(The table goes quiet. Greet the traveler by name, then ask them to tell everyone their story, in a few simple words.)',
          },
        ]
      : []),
    ...turns,
  ];
}

/**
 * The judge of "Your Story" (task 4.3): the written rubric, one yes or no for each part. It sees
 * only the chat. It can't hear, so it never judges pronunciation (ADR 0013).
 */
export const JUDGE_RULES = [
  'You judge a beginner learner of Palestinian colloquial Arabic. They just told the story of their',
  'own road at an inn, answering the innkeeper\'s questions in a chat. The lines marked "Innkeeper"',
  'are the questions; the lines marked "Traveler" are the learner\'s.',
  'Judge ONLY the Traveler lines, against three parts. Be fair to a beginner: small mistakes of',
  'grammar or spelling, Modern Standard words, missing vowel marks and short sentences are fine.',
  'Hebrew or English words are not Arabic.',
  '1. understood: most Traveler lines fit what the Innkeeper had just asked or said, so the learner',
  'understood it. A line that ignores the question, or answers a different one, does not.',
  '2. answered: the Traveler lines are Arabic a Palestinian could follow, and together they tell',
  'something real about the learner (where from, why, what was hard, who they met, what next). A',
  'string of single words, copied questions, or lines with no meaning do not.',
  '3. kept_going: the learner kept the talk going: several lines of more than two words, and at',
  'least once they added something nobody asked for, or asked something back.',
  'Answer ONLY with JSON: {"understood":true|false,"answered":true|false,"kept_going":true|false,',
  '"why":"<one short sentence in plain English, at most 25 words, kind, to the learner>"}.',
].join('\n');

export function judgeMessages(ask: JudgeAsk): Message[] {
  const chat = ask.turns
    .map((t) => `${t.who === 'you' ? 'Traveler' : 'Innkeeper'}: ${t.text}`)
    .join('\n');
  return [
    { role: 'system', content: JUDGE_RULES },
    { role: 'user', content: chat },
  ];
}

export interface Verdict {
  understood: boolean;
  answered: boolean;
  keptGoing: boolean;
  why: string;
}

/** The judge's answer, checked: three yes-or-noes and a short reason, or null. */
export function cleanVerdict(said: string): Verdict | null {
  const json = said.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^```(json)?|```$/gm, '');
  let body: unknown;
  try {
    body = JSON.parse(json.trim());
  } catch {
    return null;
  }
  const v = (body ?? {}) as Record<string, unknown>;
  const why = typeof v.why === 'string' ? v.why.replace(/[<>*_#`]/g, '').trim() : '';
  if (typeof v.understood !== 'boolean' || typeof v.answered !== 'boolean') return null;
  if (typeof v.kept_going !== 'boolean' || !why || why.length > 200) return null;
  return { understood: v.understood, answered: v.answered, keptGoing: v.kept_going, why };
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
  'جيد or بخير), هلّق (not الآن), آه (not نعم), هاد/هاي (not هذا/هذه, or the Lebanese هيدا), مش (not ليس or لا before a verb).',
  'Never bring in Egyptian words (عيش for bread is خبز; إيه for what is شو).',
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
    if (!yours.has(line) || !better || !why || why.length > 140) continue;
    // A tip that only changes spelling (an alif, a hamza, a vowel mark) isn't one.
    if (spelledAlike(better, line)) continue;
    if (kept.some((k) => k.said === line)) continue;
    kept.push({ said: line, better, why });
  }
  return kept.slice(0, 3);
}

/** The same words but for alifs, hamzas, vowel marks, ة/ه, ى/ي, spaces and punctuation. */
function spelledAlike(a: string, b: string): boolean {
  const bare = (x: string) =>
    x
      .replace(/[\u064B-\u0652\u0670]/gu, '')
      .replace(/[أإآٱءؤئ]/gu, 'ا')
      .replace(/ة/gu, 'ه')
      .replace(/ى/gu, 'ي')
      .replace(/[ا\s،.!?؟]/gu, '');
  return bare(a) === bare(b);
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
  // Every field is capped by parseAsk; this only turns away a body past those caps. The most
  // parseAsk takes is a full chat at the inn with three remembered lines, about 7 kB (Arabic is 2
  // bytes a letter); since 2026-11-15 the characters' sheets no longer come in the body.
  // The header is a quick no; the body itself is measured too, since a sender can leave it out.
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY) return fail('bad-request');
  const raw = await request.text().catch(() => '');
  if (new TextEncoder().encode(raw).length > MAX_BODY) return fail('bad-request');
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    // parseAsk turns null away.
  }
  let ask: Ask | null;
  try {
    ask = parseAsk(body);
  } catch {
    // The characters' content didn't reach the function (vercel.json's includeFiles).
    return fail('failed');
  }
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

  if (ask.kind === 'inn-judge') {
    // The judge, like the Coach, talks only to Groq and costs one chat line.
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
      const said = await askGroq(GROQ_API_KEY, judgeMessages(ask), fetchFn, INN_MODEL, true);
      if (said === 'busy') return fail('busy');
      const verdict = said ? cleanVerdict(said) : null;
      if (verdict) return answer({ text: JSON.stringify(verdict), left });
    }
    return fail('failed');
  }

  if (ask.kind === 'inn-chat' || ask.kind === 'inn-story') {
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
      const messages = ask.kind === 'inn-story' ? storyMessages(ask) : innMessages(ask);
      const said = await askGroq(GROQ_API_KEY, messages, fetchFn, INN_MODEL);
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
