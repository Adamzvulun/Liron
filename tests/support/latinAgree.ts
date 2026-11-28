// Does a line's Latin agree with its Arabic, consonant by consonant? Each Arabic letter allows the
// Latin sounds below; vowels, spaces, hyphens and punctuation are ignored, and a doubled consonant
// counts once. Written for content/README.md ("Arabic and Latin agree"). The rules for real
// Levantine/Palestinian sound changes are in CHANGES; tests/latin-agree.test.ts holds one case each.

/** The Latin consonants (our scheme, see content/arabic/letters.json) each Arabic letter may be said as. '' means silent.
 * shortcut: the loan sounds p, v and g (ب ف غ ج) are accepted in every word, so a b/p, f/v or ɣ/g slip isn't caught; tighten with a loan-word list. */
const LETTER: Record<string, string> = {
  ب: 'b|p',
  ت: 't',
  ج: 'j|g',
  ح: 'ɧ',
  خ: 'x',
  د: 'd',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'š',
  ص: 'ʂ',
  ض: 'ɖ',
  ط: 'ʈ',
  ع: '3',
  غ: 'ɣ|g',
  ف: 'f|v',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  ظ: 'ʐ|ɖ', // ظ: written ʐ, said ɖ by many (naɖɖārāt)
  ث: 'ŧ|t|s', // ث: written ŧ, said t or s in town speech
  ذ: 'đ|d|z', // ذ: written đ, said d or z
  ق: 'g|ʔ|q', // ق: g (Gaza), a glottal stop (towns) or q (learned words: musīqa, ilquds). shortcut: a mixed g/q is accepted in any word (about 210 lines use q), tighten with a per-word list if a g/q slip matters
  // shortcut: و and ي are optional everywhere, so a dropped w or y isn't caught; tighten by telling consonant from long-vowel uses of the letter
  و: 'w|', // a long ū or ō leaves no consonant
  ي: 'y|', // a long ī or ē leaves none
  ا: '', // a long ā
  ى: '',
  ة: 't|', // -a, or -it before an ending
  ء: 'ʔ|', // a hamza is often dropped
};
const HAMZA_SEAT = /[أإآؤئ]/;
const TANWIN = /[ًٌٍ]/; // -an, -un, -in: the n is spoken
const SUN = 'تثجدذرزسشصضطظن'; // ل itself is left out: il- + ل keeps its l. ج is here as Gaza says ijjāj

/** The Latin consonants a line is made of: vowels, marks, spaces and punctuation dropped. */
export const consonants = (latin: string) =>
  latin
    .toLowerCase()
    .replace(/['’]/g, 'ʔ') // il'ákil: an apostrophe is a glottal stop
    .replace(/[^bcdfghjklmnpqrstvwxyzšɧʂɖʈʐɣđŧʔ3]/g, '');

/**
 * The Latin a line's Arabic may be said as, as a regular expression over `consonants(latin)`,
 * or null when the Arabic has no letters.
 * shortcut: marks other than tanwin are ignored, so a missing shadda or vowel isn't caught.
 */
export function arabicPattern(arabic: string): RegExp | null {
  const units: { key: string; alts: string[] }[] = [];
  for (const word of arabic.split(/[^ء-ْ]+/)) {
    const chars = [...word].filter(
      (c) => LETTER[c] !== undefined || HAMZA_SEAT.test(c) || TANWIN.test(c),
    );
    chars.forEach((c, i) => {
      if (TANWIN.test(c)) return void units.push({ key: 'n', alts: ['n'] });
      if (HAMZA_SEAT.test(c))
        return void units.push({ key: 'ʔ', alts: c === 'ئ' ? ['ʔ', 'y', ''] : ['ʔ', ''] }); // ئ: also y (zāyid)
      let alts = (LETTER[c] ?? '').split('|');
      // il-: the ل of a word-initial ال is dropped before a sun letter
      const il =
        chars[i - 1] === 'ا' &&
        i <= 3 &&
        [...chars.slice(0, i - 1)].every((p) => 'هوفبكل'.includes(p)); // il-, bi-l-, wa-ha-l-
      if (c === 'ل' && il && SUN.includes(chars[i + 1] ?? '-')) alts = ['', 'l'];
      // a hamza-less alef at the start of a word, or after لل / ال, may carry a hamza (la-lʔimtiɧān)
      if (c === 'ا' && (i === 0 || (chars[i - 1] === 'ل' && 'لا'.includes(chars[i - 2] ?? '-'))))
        alts = ['', 'ʔ'];
      // shortcut: any word-final ه may be silent, so a lost h on a word like وجه isn't caught; tighten to the -hu pronoun and الله
      // a final ه is silent: the -hu of his, ismu (his name), fīh -> fī, and الله said alla
      if (c === 'ه' && i === chars.length - 1) alts = ['', 'h'];
      // the word لا (no) is said laʔ
      if (c === 'ا' && word === 'لا' && i === 1) alts = ['', 'ʔ'];
      // على is said 3a before il- (3a -lbáɧar): its ل and ي are silent
      if (word === 'على' && i > 0) alts = i === 1 ? ['', 'l'] : [''];
      // ت before ج or ز is voiced: mitjawwiz -> midjawwiz; next to ط it becomes ط: itʈallaʕ -> iʈʈalla3
      if (c === 'ت' && 'جز'.includes(chars[i + 1] ?? '-')) alts = ['t', 'd'];
      // ت beside ض ظ ص takes their sound too: mitɖāyag -> miɖɖāyag, idʐāharu
      if (c === 'ت' && chars[i + 1] === 'ض') alts = ['t', 'ɖ'];
      if (c === 'ت' && chars[i + 1] === 'ظ') alts = ['t', 'ɖ', 'ʐ', 'd'];
      if (c === 'ت' && chars[i + 1] === 'ص') alts = ['t', 'ʂ'];
      if (c === 'ت' && (chars[i + 1] === 'ط' || chars[i - 1] === 'ط')) alts = ['t', 'ʈ'];
      // n before b is said m (jamb, jínbi)
      if (c === 'ن' && chars[i + 1] === 'ب') alts = ['n', 'm'];
      if (alts.some(Boolean)) units.push({ key: c, alts }); // a silent letter (long ā) leaves no unit
    });
  }
  const kept = units.filter(
    (u, i) => u.key !== units[i - 1]?.key || u.alts.join() !== units[i - 1]?.alts.join(),
  ); // a doubled letter, or a sun letter after il-, is said long
  if (!kept.some((u) => u.alts.some(Boolean))) return null;
  const body = kept.map((u) =>
    u.alts.includes('') ? `(?:${u.alts.filter(Boolean).join('|')})*` : `(?:${u.alts.join('|')})+`,
  );
  return new RegExp(`^${body.join('')}$`);
}

/** True when the Latin agrees with the Arabic. */
export const agrees = (arabic: string, latin: string) => {
  const re = arabicPattern(arabic);
  return re === null ? consonants(latin) === '' : re.test(consonants(latin));
};
