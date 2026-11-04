// The Hebrew bridge for whole phrases (#45, ADR 0002): written from the deck's Latin
// romanisation rather than the Arabic script, because the Latin has every vowel the speaker
// says (the Arabic leaves most of them out). The result reads the way the recording sounds,
// in Hebrew letters with niqqud: tamām → תַּמַאם, šúkran → שֻכְּרַן.

/** Each Latin consonant of the deck's notation as its Hebrew bridge (geresh where needed). */
const CONSONANTS: Record<string, string> = {
  b: 'בּ',
  t: 'ת',
  ŧ: 'ת׳',
  j: 'ג׳',
  ɧ: 'ח',
  x: 'ח׳',
  d: 'ד',
  đ: 'ד׳',
  r: 'ר',
  z: 'ז',
  s: 'ס',
  š: 'ש',
  ʂ: 'צ',
  ɖ: 'צ׳',
  ʈ: 'ט',
  ʐ: 'ט׳',
  '3': 'ע',
  ɣ: 'ע׳',
  f: 'פ',
  p: 'פּ',
  v: 'ו׳',
  q: 'ק',
  g: 'ג',
  k: 'כּ',
  l: 'ל',
  m: 'מ',
  n: 'נ',
  h: 'ה',
  w: 'ו',
  y: 'י',
  ʔ: 'א',
};

const PATAH = 'ַ';
const HIRIQ = 'ִ';
const KUBUTZ = 'ֻ';
const TSERE = 'ֵ';
const SEGOL = 'ֶ';
const HOLAM = 'ֹ';
const DAGESH = 'ּ';

/** Each Latin vowel: the point on the consonant before it, and a letter after (long vowels). */
const VOWELS: Record<string, [string, string]> = {
  a: [PATAH, ''],
  á: [PATAH, ''],
  ā: [PATAH, 'א'],
  i: [HIRIQ, ''],
  í: [HIRIQ, ''],
  ī: [HIRIQ, 'י'],
  u: [KUBUTZ, ''],
  ú: [KUBUTZ, ''],
  ū: ['', 'וּ'],
  e: [SEGOL, ''],
  é: [SEGOL, ''],
  ē: [TSERE, 'י'],
  o: [HOLAM, ''],
  ó: [HOLAM, ''],
  ō: ['', 'וֹ'],
};

const FINAL: Record<string, string> = { כ: 'ך', מ: 'ם', נ: 'ן', פ: 'ף', צ: 'ץ' };

/** One word (letters only) in Hebrew letters with niqqud. */
function word(latin: string): string {
  const out: string[] = []; // one entry per Hebrew letter cluster
  let prev = '';
  for (const c of latin) {
    const v = VOWELS[c];
    if (v) {
      // A vowel at the start, or after another vowel, needs an alef to sit on.
      if (!out.length || prev === 'vowel') out.push('א');
      out[out.length - 1] += v[0];
      if (v[1]) out.push(v[1]);
      prev = 'vowel';
      continue;
    }
    const k = CONSONANTS[c];
    if (!k) continue;
    if (c === prev) {
      // A doubled consonant is one letter with a dagesh (shadda).
      if (!(out[out.length - 1] ?? '').includes(DAGESH)) out[out.length - 1] += DAGESH;
      continue;
    }
    out.push(k);
    prev = c;
  }
  // Hebrew writes a final vowel with a letter: márɧaba → מַרְחַבַּא, hādi → הַאדִי.
  const lastChar = latin[latin.length - 1] ?? '';
  const mater = { a: 'א', á: 'א', i: 'י', í: 'י', u: 'וּ', ú: 'וּ' }[lastChar];
  if (mater === 'וּ') out[out.length - 1] = (out[out.length - 1] ?? '').replace(KUBUTZ, '');
  if (mater) out.push(mater);
  const last = out.length - 1;
  const end = out[last];
  if (end !== undefined) {
    const base = end[0] ?? '';
    const final = FINAL[base];
    // A final letter keeps no dagesh (בּן, not בּןּ), except ך, which Hebrew writes so too.
    if (final) out[last] = final + end.slice(1).replace(base === 'כ' ? '' : DAGESH, '');
  }
  return out.join('').normalize('NFC');
}

/**
 * A phrase from the deck's romanisation in Hebrew letters: stress accents and notes like
 * "[pl.]" or "(i)" dropped, hyphens joined, punctuation kept. "kēf ɧālak?" → "כֵּיף חַאלַכּ?".
 */
export function latinToHebrew(latin: string): string {
  const clean = latin
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/_+/g, '')
    .replace(/-/g, '');
  return clean
    .split(/(\s+|[?!.,؟،/])/)
    .map((part) =>
      /^[\s?!.,؟،/]*$/.test(part)
        ? part.replace('؟', '?').replace('،', ',').replace('/', ' / ')
        : word(part),
    )
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}
