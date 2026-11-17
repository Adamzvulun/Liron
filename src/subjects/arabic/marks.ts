// The vowel marks (harakat, #40): data in content/arabic/marks.json. Taught alongside the
// letters (fatha, kasra and damma in lesson 1; sukun in 2; shadda in 3; tanween in 5), and
// written into the Hebrew read choices as niqqud, so reading a word means reading its marks.
import pack from '../../../content/arabic/marks.json' with { type: 'json' };
import { letterOf, type Letter } from './letters.ts';

export interface Mark {
  /** Stable id, e.g. `mark:kasra`. Spaced repetition points at it. */
  id: string;
  /** The combining character itself. */
  mark: string;
  name: string;
  nameLatin: string;
  sound: string;
  /** The niqqud that does the same job in Hebrew letters, e.g. ִ for kasra. */
  hebrew: string;
  hebrewName: string;
  /** The script lesson that teaches it. */
  lesson: number;
  order: number;
  note: string;
}

export const MARKS: readonly Mark[] = pack.items
  .map((i) => ({ id: i.id, ...i.data }) as Mark)
  .sort((a, b) => a.order - b.order);

/** The marks a lesson teaches. */
export const marksOfLesson = (lesson: number) => MARKS.filter((m) => m.lesson === lesson);

/** The marks you know at a lesson. */
export const marksUpTo = (lesson: number) => MARKS.filter((m) => m.lesson <= lesson);

/** Each combining character and the mark it is (the three tanween forms are one mark). */
const BY_CHAR = new Map<string, Mark>();
for (const m of MARKS) BY_CHAR.set(m.mark, m);
const TANWEEN = MARKS.find((m) => m.id === 'mark:tanween');
if (TANWEEN) for (const c of ['ٌ', 'ٍ']) BY_CHAR.set(c, TANWEEN);

/** The marks a written word carries, each once, in teaching order. */
export function marksIn(word: string): Mark[] {
  const ids = new Set([...word].map((c) => BY_CHAR.get(c)?.id));
  return MARKS.filter((m) => ids.has(m.id));
}

/** A word with only the marks you know; with none known, the bare letters. */
export function withMarks(word: string, known: readonly Mark[]): string {
  const keep = new Set(known.map((m) => m.id));
  return [...word].filter((c) => !BY_CHAR.has(c) || keep.has(BY_CHAR.get(c)?.id ?? '')).join('');
}

// No final ך: k at the end stays כּ, so it never reads as kh (Adam, 2026-11-04).
const FINAL_HEBREW: Record<string, string> = { מ: 'ם', נ: 'ן', פ: 'ף', צ: 'ץ' };
/** Final letters keep no dagesh (בּן, not בּןּ). */
const FINAL_FORMS: Record<string, true> = { ם: true, ן: true, ף: true, ץ: true };
const POINT: Record<string, string> = {
  'mark:fatha': 'ַ',
  'mark:kasra': 'ִ',
  'mark:damma': 'ֻ',
  'mark:sukun': 'ְ',
};
const DAGESH = 'ּ';
const HOLAM = 'ֹ';
const TSERE = 'ֵ';

interface Cell {
  base: string;
  /** What follows the base letter in the bridge, e.g. the geresh of ג׳. */
  tail: string;
  dagesh: boolean;
  point: string;
  letter: Letter;
}

/**
 * A word in Hebrew letters with niqqud from its Arabic marks: kasra as hiriq, damma as kubutz,
 * fatha as patah, sukun as shva (dropped at the end), shadda as dagesh. ب and ك take a dagesh,
 * since they're always b and k. Sukun on و reads ō (וֹ) and on ي reads ē (a tsere before it),
 * the deck's way of writing Palestinian ō and ē. Tanween adds a final ן. Null if a letter isn't
 * one we teach.
 */
export function inHebrewVowelled(word: string): string | null {
  const cells: Cell[] = [];
  let tanween = false;
  // The mark just before this letter was tanween: a silent alif after it is dropped (شكرًا).
  let afterTanween = false;
  for (const c of word) {
    const mark = BY_CHAR.get(c);
    const cell = cells[cells.length - 1];
    const silentAlif = afterTanween && letterOf(c)?.letter === 'ا';
    afterTanween = false;
    // Tanween written before its alif (رًا, the order Unicode prefers): the alif is silent.
    if (silentAlif) continue;
    if (mark) {
      if (!cell) continue;
      if (mark.id === 'mark:shadda') cell.dagesh = true;
      else if (mark.id === 'mark:tanween') {
        tanween = true;
        afterTanween = c === 'ً';
        if (cell.letter.letter === 'ا' && cells.length > 1) {
          cells.pop();
          const before = cells[cells.length - 1];
          if (before) before.point = POINT['mark:fatha'] ?? '';
        } else {
          // ة before tanween is said t: عادةً 3ādatan.
          if (cell.letter.letter === 'ة') cell.base = 'ת';
          cell.point = POINT['mark:fatha'] ?? '';
        }
      } else if (mark.id === 'mark:sukun' && cell.letter.letter === 'و') cell.point = HOLAM;
      else if (mark.id === 'mark:sukun' && cell.letter.letter === 'ي') {
        const before = cells[cells.length - 2];
        if (before) before.point = TSERE;
      } else cell.point = POINT[mark.id] ?? '';
      continue;
    }
    const letter = letterOf(c);
    if (!letter) {
      if (c === 'ٰ' || c === 'ـ') continue;
      return null;
    }
    const bridge = (letter.hebrew.split('/')[0] ?? letter.hebrew).trim();
    cells.push({
      base: bridge[0] ?? '',
      tail: bridge.slice(1),
      dagesh: letter.letter === 'ب' || letter.letter === 'ك',
      point: '',
      letter,
    });
  }
  if (!cells.length) return null;
  const last = cells[cells.length - 1];
  if (last && last.point === POINT['mark:sukun']) last.point = '';
  if (last && !tanween) {
    last.base = FINAL_HEBREW[last.base] ?? last.base;
    last.dagesh = last.dagesh && !(last.base in FINAL_FORMS);
  }
  const out = cells.map((c) => c.base + (c.dagesh ? DAGESH : '') + c.point + c.tail).join('');
  // Canonical order for the points, so equal spellings compare equal.
  return (tanween ? out + 'ן' : out).normalize('NFC');
}

/**
 * The same word with one short vowel changed (a ↔ i ↔ u), for wrong choices that test the
 * marks themselves. Empty when the word has no short-vowel mark.
 */
export function vowelSwaps(word: string): string[] {
  const shorts = ['َ', 'ِ', 'ُ'];
  const out: string[] = [];
  [...word].forEach((c, i, all) => {
    if (!shorts.includes(c)) return;
    for (const other of shorts)
      if (other !== c) out.push([...all.slice(0, i), other, ...all.slice(i + 1)].join(''));
  });
  return out;
}
