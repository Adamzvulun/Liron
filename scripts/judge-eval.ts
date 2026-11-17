// The judge's eval set (task 4.3, ADR 0047): fixed "Your Story" chats, each with the verdict it
// should get, sent through the real function to Groq, each RUNS times, to show the judge is right
// and consistent. Run by hand, never in CI (it calls Groq and uses its free quota):
//
//   GROQ_API_KEY=… node scripts/judge-eval.ts
//
// A run is right when the pass or fail matches, and so does every part the case names (a part
// left out may go either way). A case is consistent when all its runs give the same pass or fail.
// Exits 1 below PASS_RATE right, or if any case is inconsistent. Only our own made-up chats are
// sent. Re-run it before changing JUDGE_RULES or INN_MODEL, and record the results in
// docs/research/judge-eval.md.
import { handle, type Env, type Verdict } from '../api/partner.ts';
import type { InnTurn } from '../src/core/partner.ts';

const RUNS = 3;
const PASS_RATE = 0.9;

type Part = 'understood' | 'answered' | 'keptGoing';
interface Case {
  name: string;
  turns: InnTurn[];
  pass: boolean;
  parts?: Partial<Record<Part, boolean>>;
}

/** A chat from alternating lines, the innkeeper first. */
const chat = (...lines: string[]): InnTurn[] =>
  lines.map((text, i) => ({ who: i % 2 === 0 ? 'them' : 'you', text }));

const Q = [
  'أهلين سامي! الكل هون. احكيلنا قصتك: من وين إنت؟',
  'حلو! وليش جيت لعنّا؟',
  'شو كان أصعب إشي؟',
  'ومين حبّيت من الناس هون؟',
  'وشو بدك تعمل هلّق؟',
  'الله يوفقك! في إشي بدك تسألنا؟',
] as const;

const CASES: Case[] = [
  {
    name: 'a full story, with things added and a question back',
    pass: true,
    parts: { understood: true, answered: true, keptGoing: true },
    turns: chat(
      Q[0],
      'أنا من حيفا، ساكن جنب البحر.',
      Q[1],
      'جيت لأني بدي أحكي عربي مع جيراني. عندي جيران عرب كتير.',
      Q[2],
      'الحروف كانت صعبة كتير، خصوصي ع و ح.',
      Q[3],
      'حبيت سليم، دايماً بيحكيلي عن الطريق. وإنتِ كمان!',
      Q[4],
      'بدي أقرأ كتاب صغير بالعربي. وإنتِ، من وين تعلمتي تطبخي هيك؟',
    ),
  },
  {
    name: 'a beginner with mistakes and Modern Standard words, but a real story',
    pass: true,
    parts: { understood: true, answered: true },
    turns: chat(
      Q[0],
      'أنا من تل أبيب. أعيش هناك مع عائلتي.',
      Q[1],
      'أريد أتكلم عربي، لأن أنا أشتغل مع ناس عرب.',
      Q[2],
      'الكلمات كتير. أنا بنسى.',
      Q[3],
      'أم خليل، هي بتعطيني أكل دايماً.',
      Q[4],
      'بدي أحكي أكثر. ممكن أجي كل يوم؟',
    ),
  },
  {
    name: 'single words only',
    pass: false,
    parts: { keptGoing: false },
    turns: chat(Q[0], 'حيفا', Q[1], 'عربي', Q[2], 'حروف', Q[3], 'سليم', Q[4], 'لا'),
  },
  {
    name: 'answers that ignore the questions',
    pass: false,
    parts: { understood: false },
    turns: chat(
      Q[0],
      'بحب القهوة بدون سكر.',
      Q[1],
      'الجو اليوم حلو كتير.',
      Q[2],
      'عندي قطة اسمها ميمي.',
      Q[3],
      'السيارة الحمرا حلوة.',
      Q[4],
      'أكلت فلافل امبارح.',
    ),
  },
  {
    name: 'the questions copied back',
    pass: false,
    parts: { answered: false },
    turns: chat(
      Q[0],
      'من وين إنت؟',
      Q[1],
      'ليش جيت لعنّا؟',
      Q[2],
      'شو كان أصعب إشي؟',
      Q[3],
      'مين حبّيت؟',
      Q[4],
      'شو بدك تعمل؟',
    ),
  },
  {
    name: 'answered in Hebrew and English',
    pass: false,
    parts: { answered: false },
    turns: chat(
      Q[0],
      'אני מחיפה',
      Q[1],
      'I want to learn Arabic',
      Q[2],
      'האותיות היו קשות',
      Q[3],
      'Salim is nice',
      Q[4],
      'להמשיך ללמוד',
    ),
  },
  {
    name: 'letters with no meaning',
    pass: false,
    parts: { answered: false },
    turns: chat(Q[0], 'ككك ببب', Q[1], 'سسس مممم', Q[2], 'ههه', Q[3], 'ططط', Q[4], 'ننن'),
  },
  {
    name: 'answers every question, but adds nothing and asks nothing',
    pass: false,
    parts: { understood: true, keptGoing: false },
    turns: chat(
      Q[0],
      'من حيفا.',
      Q[1],
      'عشان العربي.',
      Q[2],
      'الحروف.',
      Q[3],
      'سليم.',
      Q[4],
      'بتعلم.',
    ),
  },
  {
    name: 'a short story told well, with one question back',
    pass: true,
    parts: { understood: true, answered: true, keptGoing: true },
    turns: chat(
      Q[0],
      'أنا من القدس، بس بشتغل بحيفا.',
      Q[1],
      'بدي أفهم الناس بالسوق. وإنتِ، كيف بتعرفي كل الناس هون؟',
      Q[2],
      'الكلام بسرعة! الناس بيحكوا كتير بسرعة.',
      Q[5],
      'آه، شو اسم الغريب اللي عالبوابة؟',
    ),
  },
  {
    name: 'only greetings and thanks',
    pass: false,
    parts: { answered: false },
    turns: chat(
      Q[0],
      'مرحبا',
      Q[1],
      'شكراً',
      Q[2],
      'أهلا وسهلا',
      Q[3],
      'شكراً كتير',
      Q[4],
      'مع السلامة',
    ),
  },
] as const;

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

// Groq's free tier allows 8,000 tokens a minute for this model: a verdict is about 1,000.
const wait = () => new Promise((done) => setTimeout(done, 9000));

async function judge(turns: InnTurn[]): Promise<Verdict | string> {
  const res = await handle(
    new Request('https://eval.invalid/api/partner', {
      method: 'POST',
      headers: { Authorization: 'Bearer eval', 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'inn-judge', turns }),
    }),
    env,
    fetchFn,
  );
  const body = (await res.json()) as { text?: string; error?: string };
  return body.text ? (JSON.parse(body.text) as Verdict) : (body.error ?? 'no answer');
}

const passes = (v: Verdict) => v.understood && v.answered && v.keptGoing;
const mark = (v: Verdict) =>
  `${v.understood ? 'U' : 'u'}${v.answered ? 'A' : 'a'}${v.keptGoing ? 'K' : 'k'}`;

let right = 0;
let runs = 0;
let inconsistent = 0;
for (const c of CASES) {
  const seen: string[] = [];
  const outcomes = new Set<boolean>();
  for (let i = 0; i < RUNS; i++) {
    await wait();
    const v = await judge(c.turns);
    runs++;
    if (typeof v === 'string') {
      seen.push(`error ${v}`);
      continue;
    }
    outcomes.add(passes(v));
    const partsOk = Object.entries(c.parts ?? {}).every(([k, want]) => v[k as Part] === want);
    const ok = passes(v) === c.pass && partsOk;
    if (ok) right++;
    seen.push(`${ok ? '✓' : '✗'} ${mark(v)} "${v.why}"`);
  }
  if (outcomes.size > 1) inconsistent++;
  console.log(`\n${c.pass ? 'PASS' : 'FAIL'} expected · ${c.name}`);
  for (const s of seen) console.log(`  ${s}`);
}
const rate = right / runs;
console.log(
  `\n${right} of ${runs} runs right (${Math.round(rate * 100)}%); ${inconsistent} of ${CASES.length} cases inconsistent`,
);
process.exit(rate >= PASS_RATE && inconsistent === 0 ? 0 : 1);
