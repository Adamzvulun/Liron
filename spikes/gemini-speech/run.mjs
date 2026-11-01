// Gemini speech spike: can the free tier hear Palestinian Arabic?
// Usage: GEMINI_API_KEY=... node run.mjs [--model <id>] [--delay 7000] [--limit 50]
// Needs Node 18+. Reads manifest.json + clips/ (made by prep.py). Writes results/.
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('Set GEMINI_API_KEY first.'); process.exit(1); }
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const DELAY = +arg('delay', 7000), LIMIT = +arg('limit', 50);
const API = 'https://generativelanguage.googleapis.com/v1beta';
const headers = { 'content-type': 'application/json', 'x-goog-api-key': KEY };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- model choice ----------
async function listModels() {
  const r = await fetch(`${API}/models?pageSize=200`, { headers });
  if (!r.ok) throw new Error(`list models: ${r.status} ${await r.text()}`);
  return (await r.json()).models.filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name.replace('models/', ''));
}

async function generate(model, parts, schema) {
  const body = { contents: [{ role: 'user', parts }], generationConfig: { temperature: 0 } };
  if (schema) Object.assign(body.generationConfig, { responseMimeType: 'application/json', responseSchema: schema });
  for (let attempt = 0; attempt < 5; attempt++) {
    let r;
    try { r = await fetch(`${API}/models/${model}:generateContent`, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) }); }
    catch (e) { console.log(`  ${e.name}, retrying`); await sleep(15000); continue; }
    if (r.status === 429 || r.status >= 500) { const wait = 15000 * 2 ** attempt; const why = (await r.text()).match(/"(?:quotaId|message)": "([^"]{0,120})/g)?.slice(0, 2).join(' ') || ''; console.log(`  ${r.status}, retrying in ${wait / 1000}s ${why}`); await sleep(wait); continue; }
    const j = await r.json();
    if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j)}`);
    return (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  }
  throw new Error('gave up after retries');
}

// ---------- scoring ----------
const norm = s => s
  .replace(/[ً-ْٰـ]/g, '')       // harakat, dagger alif, tatweel
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ؤئ]/g, 'ء')
  .replace(/\(.*?\)/g, ' ')                           // deck plurals in brackets
  .replace(/[^ء-ي\s]/g, ' ').replace(/\s+/g, ' ').trim();
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const cer = (ref, hyp) => { const a = [...norm(ref).replace(/ /g, '')], b = [...norm(hyp).replace(/ /g, '')]; return a.length ? lev(a, b) / a.length : 0; };
const wer = (ref, hyp) => { const a = norm(ref).split(' '), b = norm(hyp).split(' '); return lev(a, b) / a.length; };

// Minimal pairs: swap one sound a learner typically confuses
const PAIRS = [['ح', 'ه'], ['ع', 'ا'], ['ق', 'ك'], ['خ', 'ح'], ['غ', 'ر'], ['ص', 'س'], ['ط', 'ت'], ['ض', 'د'], ['ظ', 'ز'], ['ه', 'ح'], ['ك', 'ق'], ['س', 'ص'], ['ت', 'ط'], ['د', 'ض']];
function distractor(text) {
  for (const [a, b] of PAIRS) { const i = text.indexOf(a); if (i >= 0) return { text: text.slice(0, i) + b + text.slice(i + 1), swap: `${a}→${b}` }; }
  return null;
}

// ---------- main ----------
const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'manifest.json'), 'utf8')).slice(0, LIMIT);
const models = await listModels();
console.log('Models with generateContent:', models.join(', '));
// Default: the newest plain "gemini-X.Y-flash" (sorted by version, not alphabetically,
// so names like gemini-omni-*-flash, which had no free-tier quota, aren't picked).
const ver = m => m.match(/^gemini-([\d.]+)-flash$/)?.[1].split('.').map(Number);
const newest = models.filter(ver).sort((a, b) => { const [x, y] = [ver(a), ver(b)]; return (x[0] - y[0]) || ((x[1] || 0) - (y[1] || 0)); }).pop();
const MODEL = arg('model', newest);
console.log('Using', MODEL);

const audioPart = file => ({ inlineData: { mimeType: 'audio/mp3', data: fs.readFileSync(path.join(HERE, 'clips', file)).toString('base64') } });
const TRANSCRIBE = 'This clip is a native speaker of Palestinian colloquial Arabic. Transcribe exactly what is said, in Arabic script, keeping the dialect as spoken (do not convert it to Modern Standard Arabic). No diacritics, no translation, no comments. Output only the transcription.';
const MATCH = t => `This clip is a native speaker of Palestinian colloquial Arabic. A learner wrote down what they think was said: «${t}». Ignore diacritics and ordinary spelling variation, but pay close attention to each consonant (for example ح vs ه, ع vs ا, ق vs ك, ص vs س). Does the audio contain exactly these words and consonants?`;
const MATCH_SCHEMA = { type: 'OBJECT', properties: { matches: { type: 'BOOLEAN' }, reason: { type: 'STRING' } }, required: ['matches', 'reason'] };

// Checkpoint after every clip so a rate-limit stop can resume (rows with an error are retried).
fs.mkdirSync(path.join(HERE, 'results'), { recursive: true });
const CKPT = path.join(HERE, 'results', `.partial-${MODEL}.json`);
const done = new Map(fs.existsSync(CKPT) ? JSON.parse(fs.readFileSync(CKPT, 'utf8')).filter(r => !r.error).map(r => [r.id, r]) : []);
if (done.size) console.log(`Resuming: ${done.size} clips already done`);
const results = [];
for (const [i, n] of manifest.entries()) {
  if (done.has(n.id)) { results.push(done.get(n.id)); continue; }
  const row = { id: n.id, kind: n.kind, level: n.level, ref: n.arabic, english: n.english };
  try {
    row.hyp = await generate(MODEL, [audioPart(n.file), { text: TRANSCRIBE }]);
    row.cer = +cer(n.arabic, row.hyp).toFixed(3); row.wer = +wer(n.arabic, row.hyp).toFixed(3);
    await sleep(DELAY);
    const d = distractor(n.arabic);
    if (d) {
      const t = JSON.parse(await generate(MODEL, [audioPart(n.file), { text: MATCH(n.arabic) }], MATCH_SCHEMA)); await sleep(DELAY);
      const f = JSON.parse(await generate(MODEL, [audioPart(n.file), { text: MATCH(d.text) }], MATCH_SCHEMA)); await sleep(DELAY);
      Object.assign(row, { swap: d.swap, acceptsTrue: t.matches, rejectsWrong: !f.matches, wrongReason: f.reason });
    }
  } catch (e) { row.error = String(e.message || e); console.log('  error:', row.error.slice(0, 200)); }
  results.push(row);
  fs.writeFileSync(CKPT, JSON.stringify([...results, ...[...done.values()].filter(r => !results.includes(r))]));
  console.log(`${i + 1}/${manifest.length} ${n.kind} CER ${row.cer ?? '-'} | ${n.arabic} → ${row.hyp ?? ''}`);
}

// ---------- summary ----------
const ok = results.filter(r => r.hyp !== undefined);
const avg = (xs, k) => xs.length ? (xs.reduce((s, r) => s + r[k], 0) / xs.length) : NaN;
const pct = x => `${Math.round(x * 100)}%`;
const mp = results.filter(r => r.swap);
const summary = {
  model: MODEL, date: new Date().toISOString().slice(0, 10), clips: results.length, errors: results.length - ok.length,
  sentenceCER: avg(ok.filter(r => r.kind === 'sentence'), 'cer'), sentenceWER: avg(ok.filter(r => r.kind === 'sentence'), 'wer'),
  wordCER: avg(ok.filter(r => r.kind === 'word'), 'cer'),
  acceptsTrue: mp.filter(r => r.acceptsTrue).length / (mp.length || 1), rejectsWrong: mp.filter(r => r.rejectsWrong).length / (mp.length || 1),
};
const base = path.join(HERE, 'results', `${summary.date}-${MODEL}`);
fs.writeFileSync(base + '.json', JSON.stringify({ summary, results }, null, 1));
let md = `# ${MODEL} · ${summary.date}\n\n| Measure | Result |\n|---|---|\n| Clips (errors) | ${summary.clips} (${summary.errors}) |\n| Sentences: character error rate | ${pct(summary.sentenceCER)} |\n| Sentences: word error rate | ${pct(summary.sentenceWER)} |\n| Single words: character error rate | ${pct(summary.wordCER)} |\n| Minimal pairs: accepts the correct text | ${pct(summary.acceptsTrue)} |\n| Minimal pairs: rejects the one-letter-wrong text | ${pct(summary.rejectsWrong)} |\n\n## Side by side\n\n| # | Deck | Gemini heard | CER | Pair test |\n|---|---|---|---|---|\n`;
for (const r of results) md += `| ${r.id} | ${r.ref} | ${r.hyp ?? r.error ?? ''} | ${r.cer ?? ''} | ${r.swap ? `${r.swap}: ${r.acceptsTrue ? '✔' : '✘'} / ${r.rejectsWrong ? '✔' : '✘'}` : ''} |\n`;
fs.writeFileSync(base + '.md', md);
if (!summary.errors) fs.rmSync(CKPT, { force: true });
console.log('\n', summary, '\nWrote', base + '.md');
