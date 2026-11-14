// The inn's eval set (E17, ADR 0038): fixed chats sent through the real function to Groq, with
// the function's own check (cleanArabic) and a list of words a Palestinian wouldn't say. Run by
// hand, never in CI (it calls Groq and uses its free quota):
//
//   GROQ_API_KEY=… node scripts/inn-eval.ts
//
// A line passes when Groq answered, cleanArabic kept it, and it has none of the forbidden words
// (Modern Standard, Egyptian or Gulf) and, for a woman, no masculine "I am" word. Exits 1 below
// PASS_RATE. Only our own content is sent: the regulars' stories, our English glosses and
// made-up learner lines. Re-run it before changing INN_RULES or INN_MODEL.
import { handle, type Env } from '../api/partner.ts';
import { chatAsk } from '../src/subjects/arabic/chat/innChat.ts';
import { NEW_PROGRESS } from '../src/subjects/arabic/progress.ts';
import { REGULARS } from '../src/subjects/arabic/questline.ts';
import type { InnTurn } from '../src/core/partner.ts';

const PASS_RATE = 0.85;

/** Words that give away another variety: Modern Standard, Egyptian, Gulf. */
const FORBIDDEN: [string, RegExp][] = [
  ['MSA ماذا', /ماذا/u],
  ['MSA لماذا', /لماذا/u],
  ['MSA سوف', /سوف/u],
  ['MSA ليس', /(^|\s)ليس(ت)?(\s|$|[.!?؟،])/u],
  ['MSA الآن', /الآن/u],
  ['MSA هذا/هذه', /(^|\s)(هذا|هذه)(\s|$|[.!?؟،])/u],
  ['MSA أريد', /أريد|تريد/u],
  ['MSA جيد', /(^|\s)جيد(ة)?(\s|$|[.!?؟،])/u],
  ['Egyptian إزيك', /[إا]زي(ك|َّك)/u],
  ['Egyptian عايز', /عايز/u],
  ['Egyptian دلوقتي', /دلوقت/u],
  ['Egyptian كده', /كده/u],
  ['Egyptian كويس', /كويس/u],
  ['Egyptian إيه', /(^|\s)[إا]يه(\s|$|[.!?؟،])/u],
  ['Gulf شلون', /شلون/u],
  ['MSA كيف حالك', /كيف\s+حال/u],
  ['Gulf وايد', /وايد/u],
  ['Gulf شنو', /شنو/u],
  ['Gulf أبغى', /[أا]بغى/u],
];

/** "I am …" and "I'm not …" in the masculine, which a woman regular shouldn't say of herself. */
const HIS = /(^|\s)(أنا|مش)\s+(فاهم|مبسوط|تعبان|مشغول|جوعان|زعلان)(\s|$|[.!?؟،])/u;

const p = { ...NEW_PROGRESS, guest: true, chat: { ...NEW_PROGRESS.chat, name: 'Adam' } };
const pick = (n: number) => REGULARS.find((r) => r.number === n) ?? REGULARS[0];
const you = (...lines: string[]): InnTurn[] => lines.map((text) => ({ who: 'you', text }));

/** Chats as a learner would have them: openings, plain answers, a mistake, nonsense. */
const CHATS: [number, InnTurn[]][] = [
  ...[2, 3, 5, 8, 11, 14, 20, 27, 40, 66].map((n): [number, InnTurn[]] => [n, []]),
  [2, [{ who: 'them', text: 'أهلا وسهلا! كيفك اليوم؟' }, ...you('منيح، الحمد لله')]],
  [3, [{ who: 'them', text: 'أهلين يا حبيبي، شو أخبارك؟' }, ...you('أنا تعبان شوي')]],
  [5, [{ who: 'them', text: 'صباح الخير! بدك قهوة؟' }, ...you('آه، بدي قهوة')]],
  [8, [{ who: 'them', text: 'مرحبا! من وين إنت؟' }, ...you('أنا من حيفا')]],
  [10, [{ who: 'them', text: 'أهلا! شو بتشتغل؟' }, ...you('أنا طالب')]],
  [12, [{ who: 'them', text: 'كيفك؟' }, ...you('كككك ببب')]],
  [15, [{ who: 'them', text: 'شو عملت اليوم؟' }, ...you('أكلت خبز وشربت شاي')]],
  [24, [{ who: 'them', text: 'وين رايح؟' }, ...you('رايح عالسوق')]],
  [31, [{ who: 'them', text: 'شو اسمك؟' }, ...you('اسمي آدم')]],
  [44, [{ who: 'them', text: 'بتحب الأكل الفلسطيني؟' }, ...you('آه كتير، بحب المقلوبة')]],
];

const fetchFn: typeof fetch = async (url, init) =>
  String(url).includes('/rpc/claim_chat_line') ? Response.json(59) : fetch(url, init);
const env: Env = {
  VITE_SUPABASE_URL: 'https://eval.invalid',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'eval',
  GROQ_API_KEY: process.env.GROQ_API_KEY,
};
if (!env.GROQ_API_KEY) {
  console.log('No GROQ_API_KEY: nothing to run.');
  process.exit(1);
}

let passed = 0;
for (const [n, turns] of CHATS) {
  const r = pick(n);
  if (!r) continue;
  const request = new Request('https://eval.invalid/api/partner', {
    method: 'POST',
    headers: { Authorization: 'Bearer eval', 'Content-Type': 'application/json' },
    body: JSON.stringify(chatAsk(r, p, turns)),
  });
  // Groq's free tier allows 8,000 tokens a minute for this model, about 10 lines: space them out.
  await new Promise((done) => setTimeout(done, 7000));
  const t = performance.now();
  const res = await handle(request, env, fetchFn);
  const ms = Math.round(performance.now() - t);
  const body = (await res.json()) as { text?: string; error?: string };
  const text = body.text ?? '';
  const bad = FORBIDDEN.filter(([, re]) => re.test(text)).map(([name]) => name);
  if (r.she && HIS.test(text)) bad.push('masculine for a woman');
  const ok = !!body.text && !bad.length;
  if (ok) passed++;
  const last = turns.at(-1)?.text;
  console.log(
    `${ok ? '✓' : '✗'} ${r.who}${r.she ? ' (she)' : ''} ${ms} ms | ${last ? `${last} → ` : ''}${body.text ?? body.error}${bad.length ? ` | ${bad.join(', ')}` : ''}`,
  );
}
const rate = passed / CHATS.length;
console.log(`\n${passed} of ${CHATS.length} kept (${Math.round(rate * 100)}%)`);
process.exit(rate >= PASS_RATE ? 0 : 1);
