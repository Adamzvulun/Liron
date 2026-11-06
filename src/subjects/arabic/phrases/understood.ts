/**
 * Compares what the speech model heard with the phrase, generously (ADR 0014): spelling that
 * Whisper varies on doesn't count against the learner. It answers "would a listener have
 * understood?", not "was every sound right": Whisper fixes small mistakes away, so per-sound
 * feedback stays with record-and-compare.
 */

/** Written the same way before comparing: what Whisper spells either way. */
export function normalizeArabic(text: string): string {
  return (
    text
      .normalize('NFC')
      // Vowel marks, shadda, sukun, dagger alef and tatweel.
      .replace(/[ً-ْٰـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[ؤئ]/g, 'ء')
      // Anything but Arabic letters, digits and spaces (punctuation, Latin, brackets).
      .replace(/[^ء-ي0-9٠-٩\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Ways a number may be written out; Whisper often writes digits instead. */
const NUMBERS: Record<number, readonly string[]> = {
  0: ['صفر'],
  1: ['واحد', 'وحده'],
  2: ['اتنين', 'اثنين', 'تنين'],
  3: ['تلاته', 'ثلاثه', 'تلات', 'ثلاث'],
  4: ['اربعه', 'اربع'],
  5: ['خمسه', 'خمس'],
  6: ['سته', 'ست'],
  7: ['سبعه', 'سبع'],
  8: ['تمانيه', 'ثمانيه', 'تمان', 'ثمان'],
  9: ['تسعه', 'تسع'],
  10: ['عشره', 'عشر'],
  11: ['احدعش', 'حداعش', 'احد عشر'],
  12: ['اطنعش', 'اتنعش', 'اثنا عشر'],
  13: ['تلطاعش', 'تلتاعش', 'ثلاثه عشر'],
  14: ['اربعطاعش', 'اربعتاعش', 'اربعه عشر'],
  15: ['خمسطاعش', 'خمستاعش', 'خمسه عشر'],
  16: ['سطاعش', 'ستاعش', 'سته عشر'],
  17: ['سبعطاعش', 'سبعتاعش', 'سبعه عشر'],
  18: ['تمنطاعش', 'تمنتاعش', 'ثمانيه عشر'],
  19: ['تسعطاعش', 'تسعتاعش', 'تسعه عشر'],
  20: ['عشرين'],
  30: ['تلاتين', 'ثلاثين'],
  40: ['اربعين'],
  50: ['خمسين'],
  60: ['ستين'],
  70: ['سبعين'],
  80: ['تمانين', 'ثمانين'],
  90: ['تسعين'],
  100: ['ميه', 'مية', 'مئه'],
};

const toWestern = (digits: string) =>
  digits.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

/**
 * Letters the phrase may be heard as. ق as ج or غ: this dialect often says /g/. The deck writes
 * the dialect's ت, د and ض where Whisper often writes the standard ث, ذ and ظ.
 */
const HEARD_AS: Record<string, string> = { ق: 'جغ', ت: 'ث', د: 'ذ', ض: 'ظ' };
const sameSound = (target: string, heard: string) =>
  target === heard || (HEARD_AS[target]?.includes(heard) ?? false);

/**
 * Edit distance from `target` to `heard`, with the ق rule above. With `inside`, the distance from
 * `target` to the closest stretch of `heard` (where it starts and ends in `heard` is free).
 */
function distance(target: string, heard: string, inside = false): number {
  const t = [...target];
  const h = [...heard];
  let prev = Array.from({ length: h.length + 1 }, (_, j) => (inside ? 0 : j));
  for (let i = 1; i <= t.length; i++) {
    const row = [i];
    for (let j = 1; j <= h.length; j++) {
      const swap = (prev[j - 1] ?? 0) + (sameSound(t[i - 1] ?? '', h[j - 1] ?? '') ? 0 : 1);
      row.push(Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, swap));
    }
    prev = row;
  }
  return inside ? Math.min(...prev) : (prev[h.length] ?? 0);
}

/**
 * Writes each number in `heard` as the spelling of it closest to the phrase, so "٣ ساعات" can
 * match "تلات ساعات".
 */
function spellNumbers(heard: string, target: string): string {
  const words = target.split(' ');
  return heard.replace(/[0-9٠-٩]+/g, (digits) => {
    const spellings = NUMBERS[Number(toWestern(digits))];
    if (!spellings) return digits;
    let best = spellings[0] ?? digits;
    let bestScore = Infinity;
    for (const s of spellings) {
      for (const w of words) {
        const d = distance(w, s);
        if (d < bestScore) [best, bestScore] = [s, d];
      }
    }
    return best;
  });
}

/** Up to this share of the phrase's letters may differ (native sentences differ by up to 0.18). */
export const UNDERSTOOD_AT = 0.3;

export interface Verdict {
  understood: boolean;
  /** Share of the phrase's letters that differ, 0 (the same) and up. */
  difference: number;
}

/** Slips allowed in one word: none up to 4 letters (باي isn't شاي), then one per 4 more. */
const slipsIn = (word: string) => Math.floor(([...word].length - 1) / 4);

/**
 * Whether `heard` (the transcript) says the phrase `target`: close overall, and the phrase's words
 * are in it (a word may differ by `slipsIn` letters; one word in three may be missed, so none in a
 * phrase of one or two). The word rule stops a wrong word passing on a short phrase ("مساء الخير"
 * isn't "صباح الخير"). Words are looked for in the transcript with its spaces taken out, so a word
 * split or joined differently still counts. Tuned on the spike's native clips and the phrase sets
 * (ADR 0014).
 */
export function judge(heard: string, target: string): Verdict {
  const t = normalizeArabic(target);
  const h = spellNumbers(normalizeArabic(heard), t);
  if (!t || !h) return { understood: false, difference: 1 };
  const difference = distance(t, h) / [...t].length;
  const joined = h.replace(/ /g, '');
  const words = t.split(' ');
  const missed = words.filter((w) => distance(w, joined, true) > slipsIn(w)).length;
  return {
    understood: difference <= UNDERSTOOD_AT && missed <= Math.floor(words.length / 3),
    difference,
  };
}
