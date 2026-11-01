// Follow-up to run.mjs: forced-choice minimal pairs. The yes/no judge in run.mjs said "matches"
// to almost everything, so here the model must pick which of two texts was said (order randomised).
// Usage: GEMINI_API_KEY=... node choice.mjs --model <id> [--delay 8000] [--limit 50] [--no-audio]
// --no-audio is the control: same question, no clip. If it scores as well, the test measures language priors, not hearing.
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('Set GEMINI_API_KEY first.'); process.exit(1); }
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const NOAUDIO = process.argv.includes('--no-audio');
const MODEL = arg('model'), DELAY = +arg('delay', 8000), LIMIT = +arg('limit', 50);
if (!MODEL) { console.error('Pass --model.'); process.exit(1); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Same swaps as run.mjs
const PAIRS = [['ح', 'ه'], ['ع', 'ا'], ['ق', 'ك'], ['خ', 'ح'], ['غ', 'ر'], ['ص', 'س'], ['ط', 'ت'], ['ض', 'د'], ['ظ', 'ز'], ['ه', 'ح'], ['ك', 'ق'], ['س', 'ص'], ['ت', 'ط'], ['د', 'ض']];
const distractor = t => { for (const [a, b] of PAIRS) { const i = t.indexOf(a); if (i >= 0) return { text: t.slice(0, i) + b + t.slice(i + 1), swap: `${a}→${b}` }; } return null; };
let seed = 42; const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;

const SCHEMA = { type: 'OBJECT', properties: { answer: { type: 'STRING', enum: ['A', 'B'] }, reason: { type: 'STRING' } }, required: ['answer', 'reason'] };
const PROMPT = (a, b) => `This clip is a native speaker of Palestinian colloquial Arabic. Exactly one of these two texts is what was said; they differ in a single consonant. Ignore diacritics. Listen to that consonant carefully.\nA: «${a}»\nB: «${b}»\nWhich one was said?`;

async function ask(file, prompt) {
  const audio = { inlineData: { mimeType: 'audio/mp3', data: fs.readFileSync(path.join(HERE, 'clips', file)).toString('base64') } };
  const body = { contents: [{ role: 'user', parts: NOAUDIO ? [{ text: prompt.replace('This clip is a native speaker of', 'A native speaker of') + ' (You cannot hear the clip; make your best guess.)' }] : [audio, { text: prompt }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA } };
  for (let attempt = 0; attempt < 5; attempt++) {
    let r;
    try { r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) }); }
    catch (e) { console.log(`  ${e.name}, retrying`); await sleep(15000); continue; }
    if (r.status === 429 || r.status >= 500) { const t = await r.text(); if (/PerDay/.test(t)) throw new Error('daily quota reached'); console.log(`  ${r.status}, retrying`); await sleep(15000 * 2 ** attempt); continue; }
    const j = await r.json(); if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 200)}`);
    return JSON.parse((j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join(''));
  }
  throw new Error('gave up after retries');
}

const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'manifest.json'), 'utf8')).slice(0, LIMIT);
const rows = [];
for (const n of manifest) {
  const d = distractor(n.arabic); if (!d) continue;
  const trueIsA = rand() < 0.5;
  const [a, b] = trueIsA ? [n.arabic, d.text] : [d.text, n.arabic];
  try {
    const res = await ask(n.file, PROMPT(a, b));
    const correct = (res.answer === 'A') === trueIsA;
    rows.push({ id: n.id, kind: n.kind, swap: d.swap, correct, answer: res.answer, trueIs: trueIsA ? 'A' : 'B', reason: res.reason });
    console.log(`${n.id} ${d.swap} ${correct ? '✔' : '✘'} (${res.answer}/${trueIsA ? 'A' : 'B'})`);
  } catch (e) { console.log(`${n.id} error: ${e.message}`); if (/daily/.test(e.message)) break; }
  await sleep(DELAY);
}
const ok = rows.filter(r => r.correct).length, saidA = rows.filter(r => r.answer === 'A').length;
const bySwap = {}; for (const r of rows) { const s = (bySwap[r.swap] ??= [0, 0]); s[1]++; if (r.correct) s[0]++; }
const summary = { model: MODEL, audio: !NOAUDIO, date: new Date().toISOString().slice(0, 10), pairs: rows.length, correct: ok, accuracy: rows.length ? ok / rows.length : NaN, answeredA: saidA, bySwap };
fs.mkdirSync(path.join(HERE, 'results'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'results', `${summary.date}-${MODEL}-choice${NOAUDIO ? '-noaudio' : ''}.json`), JSON.stringify({ summary, rows }, null, 1));
console.log(summary);
