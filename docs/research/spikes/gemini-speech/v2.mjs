// Spike follow-up (issue #1), free tier only, no learner voice.
//   --part deck : re-transcribe the 50 deck clips with a dialect-aware prompt (v2) and score as run.mjs does.
//   --part synth: "transcribe, then compare" pronunciation check on synthetic mistakes. Gemini TTS says the
//                 correct text and a one-consonant-wrong copy; we transcribe both and check whether the
//                 transcript keeps the wrong consonant (caught) or quietly fixes it to the real word (missed).
// Usage: GEMINI_API_KEY=... node v2.mjs --part deck|synth [--model gemini-3.5-flash-lite] [--limit 50] [--delay 5000]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('Set GEMINI_API_KEY first.'); process.exit(1); }
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const PART = arg('part'), MODEL = arg('model', 'gemini-3.5-flash-lite'), LIMIT = +arg('limit', 50), DELAY = +arg('delay', 5000);
const TTS_MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview'];
const API = 'https://generativelanguage.googleapis.com/v1beta';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function call(model, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    let r;
    try { r = await fetch(`${API}/models/${model}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) }); }
    catch (e) { console.log(`  ${e.name}, retrying`); await sleep(15000); continue; }
    if (r.status === 429 || r.status >= 500) { const t = await r.text(); if (/PerDay/.test(t)) throw new Error('daily quota'); console.log(`  ${r.status}, retrying`); await sleep(15000 * 2 ** attempt); continue; }
    const j = await r.json(); if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 200)}`);
    return j.candidates?.[0]?.content?.parts || [];
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
const PAIRS = [['ح', 'ه'], ['ع', 'ا'], ['ق', 'ك'], ['خ', 'ح'], ['غ', 'ر'], ['ص', 'س'], ['ط', 'ت'], ['ض', 'د'], ['ظ', 'ز'], ['ه', 'ح'], ['ك', 'ق'], ['س', 'ص'], ['ت', 'ط'], ['د', 'ض']];
const distractor = t => { for (const [a, b] of PAIRS) { const i = t.indexOf(a); if (i >= 0) return { text: t.slice(0, i) + b + t.slice(i + 1), swap: `${a}→${b}`, at: i }; } return null; };

// v2 prompt: dialect spelling conventions + "write what you hear, don't fix it".
const TRANSCRIBE_V2 = `Transcribe this audio of spoken Palestinian colloquial Arabic, in Arabic script.
Rules:
- Write the dialect as spoken, never Modern Standard Arabic: تلات not ثلاث, هادا/هادي not هذا/هذي, بدّي, هلقيت, برّا, عَ for "on/to".
- Write ق for the /q/, /g/ or glottal-stop sound that comes from ق.
- Write exactly the consonants you hear, even if the result is not a real word or looks like a mistake. Do not correct the speaker.
- No diacritics, no translation, no comments. Output only the transcription.`;
const transcribe = async file => (await call(MODEL, { contents: [{ role: 'user', parts: [
  { inlineData: { mimeType: 'audio/mp3', data: fs.readFileSync(file).toString('base64') } }, { text: TRANSCRIBE_V2 }] }], generationConfig: { temperature: 0 } }))
  .map(p => p.text || '').join('').trim();

const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'manifest.json'), 'utf8')).slice(0, LIMIT);
const date = new Date().toISOString().slice(0, 10);
fs.mkdirSync(path.join(HERE, 'results'), { recursive: true });
const avg = (xs, k) => xs.length ? xs.reduce((s, r) => s + r[k], 0) / xs.length : NaN;
const pct = x => `${Math.round(x * 100)}%`;

if (PART === 'deck') {
  const rows = [];
  for (const n of manifest) {
    try { const hyp = await transcribe(path.join(HERE, 'clips', n.file)); rows.push({ id: n.id, kind: n.kind, ref: n.arabic, hyp, cer: +cer(n.arabic, hyp).toFixed(3), wer: +wer(n.arabic, hyp).toFixed(3) }); console.log(n.id, rows.at(-1).cer, n.arabic, '→', hyp); }
    catch (e) { console.log(n.id, 'error', e.message); if (/daily/.test(e.message)) break; }
    await sleep(DELAY);
  }
  const s = rows.filter(r => r.kind === 'sentence'), w = rows.filter(r => r.kind === 'word');
  const summary = { model: MODEL, prompt: 'v2', date, clips: rows.length, sentenceCER: avg(s, 'cer'), sentenceWER: avg(s, 'wer'), wordCER: avg(w, 'cer') };
  fs.writeFileSync(path.join(HERE, 'results', `${date}-${MODEL}-v2-deck.json`), JSON.stringify({ summary, rows }, null, 1));
  let md = `# ${MODEL} · prompt v2 · ${date}\n\nSentence CER ${pct(summary.sentenceCER)} · WER ${pct(summary.sentenceWER)} · word CER ${pct(summary.wordCER)}\n\n| # | Deck | Gemini heard | CER |\n|---|---|---|---|\n`;
  for (const r of rows) md += `| ${r.id} | ${r.ref} | ${r.hyp} | ${r.cer} |\n`;
  fs.writeFileSync(path.join(HERE, 'results', `${date}-${MODEL}-v2-deck.md`), md);
  console.log(summary);
} else if (PART === 'synth') {
  const dir = path.join(HERE, 'synth-clips'); fs.mkdirSync(dir, { recursive: true });
  let tts = 0;
  async function speak(text, out) {
    if (fs.existsSync(out)) return;
    while (tts < TTS_MODELS.length) {
      try {
        const parts = await call(TTS_MODELS[tts], { contents: [{ role: 'user', parts: [{ text: `Say this in Palestinian colloquial Arabic, exactly as written, at a natural pace: ${text}` }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } } });
        const p = parts.find(x => x.inlineData); if (!p) throw new Error('no audio');
        const raw = out + '.raw'; fs.writeFileSync(raw, Buffer.from(p.inlineData.data, 'base64'));
        const input = /wav/.test(p.inlineData.mimeType) ? ['-i', raw] : ['-f', 's16le', '-ar', '24000', '-ac', '1', '-i', raw];
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...input, out]); fs.rmSync(raw);
        return;
      } catch (e) { if (/daily/.test(e.message)) { console.log(`  ${TTS_MODELS[tts]} daily quota, switching`); tts++; } else throw e; }
    }
    throw new Error('daily quota');
  }
  const rows = [];
  for (const n of manifest) {
    const d = distractor(n.arabic); if (!d) continue;
    try {
      const fr = path.join(dir, `${n.id}-right.mp3`), fw = path.join(dir, `${n.id}-wrong.mp3`);
      await speak(n.arabic, fr); await sleep(DELAY); await speak(d.text, fw); await sleep(DELAY);
      const hr = await transcribe(fr); await sleep(DELAY); const hw = await transcribe(fw); await sleep(DELAY);
      // Closer to the wrong text than to the right one? (ties = unclear)
      const verdict = h => { const r = cer(n.arabic, h), w = cer(d.text, h); return w < r ? 'wrong' : r < w ? 'right' : 'unclear'; };
      const row = { id: n.id, kind: n.kind, swap: d.swap, right: n.arabic, wrong: d.text, heardRight: hr, heardWrong: hw, rightAudioHeardAs: verdict(hr), wrongAudioHeardAs: verdict(hw) };
      rows.push(row); console.log(n.id, d.swap, `right→${row.rightAudioHeardAs}`, `wrong→${row.wrongAudioHeardAs}`, '|', hw);
    } catch (e) { console.log(n.id, 'error', e.message); if (/daily/.test(e.message)) break; }
  }
  const caught = rows.filter(r => r.wrongAudioHeardAs === 'wrong').length, fixed = rows.filter(r => r.wrongAudioHeardAs === 'right').length;
  const falseAlarm = rows.filter(r => r.rightAudioHeardAs === 'wrong').length;
  const bySwap = {}; for (const r of rows) { const s = (bySwap[r.swap] ??= { n: 0, caught: 0 }); s.n++; if (r.wrongAudioHeardAs === 'wrong') s.caught++; }
  const summary = { model: MODEL, prompt: 'v2', date, pairs: rows.length, caught, fixedToRealWord: fixed, unclear: rows.length - caught - fixed, falseAlarmsOnCorrect: falseAlarm, bySwap };
  fs.writeFileSync(path.join(HERE, 'results', `${date}-${MODEL}-v2-synth.json`), JSON.stringify({ summary, rows }, null, 1));
  console.log(summary);
} else { console.error('Pass --part deck or --part synth.'); process.exit(1); }
