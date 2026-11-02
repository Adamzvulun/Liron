// Speech spike, non-Gemini candidate: Groq-hosted Whisper (docs/research/speech-apis.md).
// Same tests as Gemini, so the numbers compare directly:
//   1. Transcribe the 50 deck clips (clips/, from prep.py) and score CER/WER like run.mjs.
//   2. Synthetic mistakes: transcribe the right/wrong pairs in synth-clips/ (from v2.mjs --part synth)
//      and check whether the wrong consonant survives (caught) or is fixed to the real word.
// Usage: GROQ_API_KEY=... node groq.mjs [--model whisper-large-v3] [--delay 3500] [--limit 50]
// Free tier (Groq docs): 20 requests/min, 2,000/day, so the default delay stays under 20/min.
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY; // the environment secret is named GROQ_KEY
if (!KEY) { console.error('Set GROQ_API_KEY first (environment secret; a new session picks it up).'); process.exit(1); }
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const MODEL = arg('model', 'whisper-large-v3'), DELAY = +arg('delay', 3500), LIMIT = +arg('limit', 50);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Whisper's `prompt` steers spelling style. Kept short and in the dialect, like Whisper's docs suggest.
const PROMPT = 'هاد كلام باللهجة الفلسطينية: بدّي أروح عَ البيت هلقيت، تلات ساعات، برّا.';

async function transcribe(file) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const form = new FormData();
    form.append('file', new Blob([fs.readFileSync(file)], { type: 'audio/mpeg' }), path.basename(file));
    form.append('model', MODEL); form.append('language', 'ar'); form.append('temperature', '0');
    form.append('response_format', 'json'); form.append('prompt', PROMPT);
    let r;
    try { r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${KEY}` }, body: form, signal: AbortSignal.timeout(90000) }); }
    catch (e) { console.log(`  ${e.name}, retrying`); await sleep(15000); continue; }
    if (r.status === 429 || r.status >= 500) { const t = await r.text(); console.log(`  ${r.status}, retrying: ${t.slice(0, 160)}`); if (/per day|RPD|ASD/i.test(t)) throw new Error('daily quota'); await sleep(15000 * 2 ** attempt); continue; }
    const j = await r.json(); if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 200)}`);
    return (j.text || '').trim();
  }
  throw new Error('gave up after retries');
}

// ---------- scoring (same as run.mjs) ----------
const norm = s => s.replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ؤئ]/g, 'ء')
  .replace(/\(.*?\)/g, ' ').replace(/[^ء-ي\s]/g, ' ').replace(/\s+/g, ' ').trim();
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const cer = (ref, hyp) => { const a = [...norm(ref).replace(/ /g, '')], b = [...norm(hyp).replace(/ /g, '')]; return a.length ? lev(a, b) / a.length : 0; };
const wer = (ref, hyp) => { const a = norm(ref).split(' '), b = norm(hyp).split(' '); return lev(a, b) / a.length; };
const avg = (xs, k) => xs.length ? xs.reduce((s, r) => s + r[k], 0) / xs.length : NaN;
const pct = x => `${Math.round(x * 100)}%`;

const date = new Date().toISOString().slice(0, 10);
fs.mkdirSync(path.join(HERE, 'results'), { recursive: true });
const base = path.join(HERE, 'results', `${date}-groq-${MODEL}`);

// 1. Deck clips
const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'manifest.json'), 'utf8')).slice(0, LIMIT);
const deck = [];
for (const n of manifest) {
  try { const hyp = await transcribe(path.join(HERE, 'clips', n.file)); deck.push({ id: n.id, kind: n.kind, ref: n.arabic, hyp, cer: +cer(n.arabic, hyp).toFixed(3), wer: +wer(n.arabic, hyp).toFixed(3) }); console.log(n.id, deck.at(-1).cer, n.arabic, '→', hyp); }
  catch (e) { console.log(n.id, 'error', e.message); if (/daily/.test(e.message)) break; }
  await sleep(DELAY);
}

// 2. Synthetic right/wrong pairs (text comes from the Gemini v2 synth results)
const synthFile = path.join(HERE, 'results', '2026-11-01-gemini-3.5-flash-lite-v2-synth.json');
const synth = [];
for (const p of fs.existsSync(synthFile) ? JSON.parse(fs.readFileSync(synthFile, 'utf8')).rows : []) {
  const fr = path.join(HERE, 'synth-clips', `${p.id}-right.mp3`), fw = path.join(HERE, 'synth-clips', `${p.id}-wrong.mp3`);
  if (!fs.existsSync(fr) || !fs.existsSync(fw)) continue;
  try {
    const hr = await transcribe(fr); await sleep(DELAY); const hw = await transcribe(fw); await sleep(DELAY);
    const verdict = h => { const r = cer(p.right, h), w = cer(p.wrong, h); return w < r ? 'wrong' : r < w ? 'right' : 'unclear'; };
    synth.push({ id: p.id, swap: p.swap, right: p.right, wrong: p.wrong, heardRight: hr, heardWrong: hw, rightAudioHeardAs: verdict(hr), wrongAudioHeardAs: verdict(hw) });
    console.log(p.id, p.swap, `right→${synth.at(-1).rightAudioHeardAs}`, `wrong→${synth.at(-1).wrongAudioHeardAs}`, '|', hw);
  } catch (e) { console.log(p.id, 'error', e.message); if (/daily/.test(e.message)) break; }
}

const s = deck.filter(r => r.kind === 'sentence'), w = deck.filter(r => r.kind === 'word');
const summary = { provider: 'groq', model: MODEL, date, clips: deck.length, sentenceCER: avg(s, 'cer'), sentenceWER: avg(s, 'wer'), wordCER: avg(w, 'cer'),
  synthPairs: synth.length, synthCaught: synth.filter(r => r.wrongAudioHeardAs === 'wrong').length, synthFixedToRealWord: synth.filter(r => r.wrongAudioHeardAs === 'right').length,
  synthFalseAlarms: synth.filter(r => r.rightAudioHeardAs === 'wrong').length };
fs.writeFileSync(base + '.json', JSON.stringify({ summary, deck, synth }, null, 1));
let md = `# Groq ${MODEL} · ${date}\n\n| Measure | Groq | Gemini flash-lite (v1 / v2) |\n|---|---|---|\n| Sentences: CER | ${pct(summary.sentenceCER)} | 9% / 7.5% |\n| Sentences: WER | ${pct(summary.sentenceWER)} | 25% / 23% |\n| Single words: CER | ${pct(summary.wordCER)} | 16% / 17% |\n| Synthetic mistakes caught | ${summary.synthCaught}/${summary.synthPairs} | 2/15 |\n| …fixed back to the real word | ${summary.synthFixedToRealWord}/${summary.synthPairs} | 11/15 |\n| False alarms on correct audio | ${summary.synthFalseAlarms}/${summary.synthPairs} | 0/15 |\n\n## Side by side\n\n| # | Deck | Groq heard | CER |\n|---|---|---|---|\n`;
for (const r of deck) md += `| ${r.id} | ${r.ref} | ${r.hyp} | ${r.cer} |\n`;
fs.writeFileSync(base + '.md', md);
console.log(summary, '\nWrote', base + '.md');
