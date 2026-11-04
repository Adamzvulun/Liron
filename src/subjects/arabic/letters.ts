// The Arabic letters and script lessons (#38, #39), from content/arabic/letters.json.
// Design: docs/game/arabic-script-lessons.md.
import pack from '../../../content/arabic/letters.json';

export interface Letter {
  /** Stable id, e.g. `letter:beh`. Spaced repetition and ratings point at it. */
  id: string;
  letter: string;
  name: string;
  nameLatin: string;
  /** Its Hebrew bridge (ADR 0002), e.g. ב, or ג׳; two choices are written `ה / ת`. */
  hebrew: string;
  /** The sound in IPA. */
  sound: string;
  family: string;
  /** The script lesson that teaches it, 1 to 8. */
  lesson: number;
  /** Whether the next letter in a word joins on to it. */
  connectsForward: boolean;
  /** Where Hebrew misleads, or the deck's speakers differ. */
  note?: string;
  /** How the deck's romanisation writes it, where that isn't plain Latin (ع as 3, ق as g). */
  latin?: string;
  /** Its place in the alphabet; the extras (ة ء ى لا) have none. */
  alphabetPosition?: number;
}

export const LETTERS: readonly Letter[] = pack.items.map(
  (i) => ({ id: i.id, ...i.data }) as Letter,
);

const byId = new Map(LETTERS.map((l) => [l.id, l]));
const byChar = new Map(LETTERS.filter((l) => l.letter.length === 1).map((l) => [l.letter, l]));

export function letterById(id: string): Letter | undefined {
  return byId.get(id);
}

export interface ScriptLesson {
  order: number;
  title: string;
  letters: readonly Letter[];
}

export const LESSONS: readonly ScriptLesson[] = pack.lessons.map((l) => ({
  order: l.order,
  title: l.title,
  letters: l.items.map((id) => byId.get(id)).filter((l): l is Letter => !!l),
}));
export const LESSON_COUNT = LESSONS.length;

/** The letters you know at a lesson: every lesson up to and including it. */
export function lettersUpTo(lesson: number): Letter[] {
  return LETTERS.filter((l) => l.lesson <= lesson);
}

// Vowel marks and the joining stroke: not letters, so ignored when matching words.
const MARKS = /[ً-ْٰـ]/g;
// Alif with hamza is read as alif from lesson 1; hamza on waw or yeh needs hamza (lesson 8).
const ALIASES: Record<string, string> = { أ: 'ا', إ: 'ا', آ: 'ا', ٱ: 'ا', ؤ: 'ء', ئ: 'ء' };

/** The letter a written character stands for (hamza seats and alif forms included). */
export function letterOf(c: string): Letter | undefined {
  return byChar.get(ALIASES[c] ?? c);
}

/** The letters of a written word, in order, or null if it holds anything else. */
export function lettersOf(word: string): Letter[] | null {
  const out: Letter[] = [];
  for (const raw of word.replace(MARKS, '')) {
    const l = byChar.get(ALIASES[raw] ?? raw);
    if (!l) return null;
    out.push(l);
  }
  return out.length ? out : null;
}

const ZWJ = '‍';

/** A letter's four shapes, made by the font with zero-width joiners. Null where it never occurs. */
export function formsOf(l: Letter): {
  isolated: string;
  initial: string | null;
  medial: string | null;
  final: string | null;
} {
  const c = l.letter;
  if (c === 'ء') return { isolated: c, initial: null, medial: null, final: null };
  const endsOnly = c === 'ة' || c === 'ى';
  return {
    isolated: c,
    initial: endsOnly ? null : l.connectsForward ? c + ZWJ : c,
    medial: endsOnly ? null : l.connectsForward ? ZWJ + c + ZWJ : ZWJ + c,
    final: ZWJ + c,
  };
}

// No final ך: k at the end stays כ, so it never reads as kh (Adam, 2026-11-04).
const FINAL_HEBREW: Record<string, string> = { מ: 'ם', נ: 'ן', פ: 'ף', צ: 'ץ' };

/**
 * A word in Hebrew letters, the common Israeli way: each Arabic letter as its Hebrew bridge,
 * short vowels left out, final forms at the end. بيت → בית.
 */
export function inHebrew(letters: readonly Letter[]): string {
  const parts = letters.map((l) => (l.hebrew.split('/')[0] ?? l.hebrew).trim());
  const last = parts.length - 1;
  const end = parts[last];
  if (end !== undefined) {
    const head = end[0] ?? '';
    parts[last] = (FINAL_HEBREW[head] ?? head) + end.slice(1);
  }
  return parts.join('');
}

/** Letters easily confused with each other: a sound Hebrew lacks and its nearest twin. */
const TWINS: readonly (readonly [string, string])[] = [
  ['ع', 'ا'],
  ['ح', 'ه'],
  ['ح', 'خ'],
  ['ق', 'ك'],
  ['ص', 'س'],
  ['ض', 'د'],
  ['ط', 'ت'],
  ['ظ', 'ذ'],
  ['ث', 'ت'],
  ['ذ', 'د'],
  ['غ', 'ع'],
  ['ش', 'س'],
  ['ز', 'ر'],
];

/** The letters most easily mistaken for this one: its twins, then its shape family. */
export function lookalikes(l: Letter): Letter[] {
  const twins = TWINS.filter((p) => p.includes(l.letter))
    .map(([a, b]) => (a === l.letter ? b : a))
    .map((c) => byChar.get(c))
    .filter((x): x is Letter => !!x);
  const family = LETTERS.filter((x) => x.family === l.family && x.id !== l.id);
  return [...new Set([...twins, ...family])];
}
