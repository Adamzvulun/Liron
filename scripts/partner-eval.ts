// The AI partner's eval set (E15, ADR 0004, 0036, 0037): fixed asks sent through the real
// function to each provider on its own, with the browser's own checks applied. Run by hand, never
// in CI (it calls the providers and uses their free quotas):
//
//   GEMINI_API_KEY=… GROQ_API_KEY=… node scripts/partner-eval.ts
//
// Each provider is tried alone, then both as in production. Gemini alone gets only 3 s for an
// answer (REPLY_GEMINI_MS), so its answers may fail there and still reach the room through Groq.
//
// A line passes when the provider answered and the browser's check kept it (cleanNews or
// cleanReply), and it fails when the room would fall back to its script. Exits 1 when the
// production setup (both keys, or the only key there is) keeps less than PASS_RATE.
// Only our own content is sent: the operators' stories and made-up learner lines.
import pack from '../content/morse/operators.json' with { type: 'json' };
import { handle, type Env } from '../api/partner.ts';
import { cleanNews, cleanReply } from '../src/subjects/morse/qso/chatter.ts';

const PASS_RATE = 0.8;
const ME = { name: 'ADAM', place: 'HAIFA' };

/** Made-up lines a learner might key: plain news, garbled reads and noise. */
const HEARD = ['NEW JOB AT THE PORT', 'MY DOG IS SICK', 'TTT', 'NEW EIT TEI ANTENA', 'EXAM TMW'];

// The function reads each operator's story from content/ by id (report §4bd).
const ops = pack.items
  .filter((i) => !('terse' in i.data && i.data.terse))
  .map((i) => i.id.replace(/^operator:/, ''));

const asks = [
  ...ops.map((operator) => ({
    kind: 'radio-news',
    operator,
    learner: { ...ME, contacts: 0 },
    past: [],
  })),
  ...ops.slice(0, 2).map((operator) => ({
    kind: 'radio-news',
    operator,
    learner: { ...ME, contacts: 3 },
    past: ['NEW ANTENNA IN THE GARDEN'],
    told: ['MY DOG IS SICK'],
  })),
  ...HEARD.map((heard, i) => ({
    kind: 'radio-reply',
    operator: ops[i % ops.length],
    learner: { ...ME, contacts: 1 },
    past: [],
    heard,
  })),
];

/** Answers the claim like Supabase with replies left, and passes everything else through. */
const fetchFn: typeof fetch = async (url, init) =>
  String(url).includes('/rpc/claim_partner_reply') ? Response.json(39) : fetch(url, init);

const base = { VITE_SUPABASE_URL: 'https://eval.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'eval' };
const providers: [string, Env][] = [
  ['gemini', { ...base, GEMINI_API_KEY: process.env.GEMINI_API_KEY }],
  ['groq', { ...base, GROQ_API_KEY: process.env.GROQ_API_KEY }],
  // As in production: Gemini first, Groq when Gemini fails or is slow.
  [
    'both',
    {
      ...base,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
    },
  ],
];

const rates = new Map<string, number>();
for (const [name, env] of providers) {
  if (!env.GEMINI_API_KEY && !env.GROQ_API_KEY) {
    console.log(`${name}: no key, skipped`);
    continue;
  }
  let passed = 0;
  for (const ask of asks) {
    const request = new Request('https://eval.invalid/api/partner', {
      method: 'POST',
      headers: { Authorization: 'Bearer eval', 'Content-Type': 'application/json' },
      body: JSON.stringify(ask),
    });
    const t = performance.now();
    const res = await handle(request, env, fetchFn);
    const ms = Math.round(performance.now() - t);
    const body = (await res.json()) as { text?: string; error?: string };
    const kept = body.text
      ? ask.kind === 'radio-reply'
        ? cleanReply(body.text, ME.name)
        : cleanNews(body.text, ME.name)
      : null;
    if (kept) passed++;
    const said = 'heard' in ask ? `${ask.heard} → ` : '';
    console.log(
      `${name} ${ask.kind} ${ms} ms | ${said}${body.text ?? body.error} | ${kept ?? '✗'}`,
    );
  }
  const rate = passed / asks.length;
  console.log(`${name}: ${passed} of ${asks.length} kept (${Math.round(rate * 100)}%)\n`);
  rates.set(name, rate);
}
const production = rates.get('both') ?? Math.max(...rates.values());
process.exit(production >= PASS_RATE ? 0 : 1);
