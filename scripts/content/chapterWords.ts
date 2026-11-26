// Which chapter of the word path teaches each Arabic form, for the tales checker and the Hear it
// sentence list. Local only: it reads the private deck's text, which never goes into content/.

/** Arabic letters only, marks and tatweel dropped, alef, ya and ta marbuta forms joined. */
export const words = (s: string) =>
  s
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^ء-ي]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

const FRONT = ['وهال', 'وال', 'وا', 'بال', 'هال', 'ال', 'و', 'ا'];
const PERSON = ['بت', 'بن', 'بي', 'ب', 'ت', 'ن', 'ي', ''];
const ENDS = ['وا', 'ات', 'ت', 'ها', 'نا', 'كم', 'هم', 'ني', 'ك', 'ي', 'و', 'ه', ''];

/** The forms a word in a tale may come from. */
export function stems(token: string): Set<string> {
  const out = new Set<string>();
  // The negative -š comes last (ما بفهمش).
  const bare = token.length > 3 && token.endsWith('ش') ? [token, token.slice(0, -1)] : [token];
  for (const t of bare)
    for (const f of ['', ...FRONT]) {
      if (!t.startsWith(f)) continue;
      const a = t.slice(f.length);
      for (const p of PERSON) {
        if (!a.startsWith(p)) continue;
        const b = a.slice(p.length);
        for (const e of ENDS) {
          if (!b.endsWith(e) || b.length - e.length < 2) continue;
          const c = b.slice(0, b.length - e.length);
          // The stem as said (دفع), with a he-does prefix (يدفع), or with -i (بدّي from بدّك);
          // -a written t before an ending (خالتو from خالة), and -āt for -a's plural (مجلات).
          out.add(c).add(`ي${c}`).add(`${c}ي`).add(c.replace(/ت$/, 'ه')).add(`${c}ه`);
          // A hollow verb loses its long ā before -t, "I did" (رحت from راح, شفت from شاف).
          if (e === 'ت' && c.length === 2) out.add(`${c[0]}ا${c[1]}`);
        }
      }
    }
  return out;
}

/**
 * The first chapter that teaches each form: the deck words of each chapter, with their endings
 * cut too (عند from كان عندو).
 */
export function firstInChapter(
  chapters: readonly { chapter: number; words: readonly { deck: string }[] }[],
  arabicOf: (deck: string) => string,
): Map<string, number> {
  const firstIn = new Map<string, number>();
  for (const data of chapters)
    for (const w of data.words)
      for (const x of words(arabicOf(w.deck)))
        for (const y of [
          x,
          ...ENDS.filter((e) => e && x.endsWith(e) && x.length - e.length >= 2).map((e) =>
            x.slice(0, -e.length),
          ),
        ])
          if ((firstIn.get(y) ?? Infinity) > data.chapter) firstIn.set(y, data.chapter);
  return firstIn;
}
