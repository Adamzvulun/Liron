// Reading a straight key (#36): turns key-down and key-up times into characters, adapting to
// the sender's speed as they key.
//
// How it reads (after looking at how software decoders do it, e.g. cwirc's and the morse-codec
// crate): every key-down is a dit or a dah, and every gap an element, letter or word gap, judged
// against the sender's own dit. Standard timing is 1:3:7 (dit = 1, dah = 3; gaps: 1 inside a
// character, 3 between characters, 7 between words), so the gap cut-offs sit between those, at
// 2 and 5 dits.
//
// Decoders that learn the dit one element at a time can talk themselves into a mistake: a slow
// sender's first dit, read as a dah, teaches them the wrong speed. The whole drill is re-read on
// every key press instead, sorting all key-downs so far into a short and a long group (two-means
// on the log of their lengths). That finds the sender's speed from the first dah, and copes
// with a dah that's only twice a dit. Until both kinds have been keyed, the last known dit
// (or 12 wpm) decides.

import { MORSE_CHARS } from '../code.ts';

/** One key-down, in milliseconds (any clock, e.g. `performance.now()`). */
export interface Mark {
  down: number;
  up: number;
}

export type ElementKind = 'dit' | 'dah';
export type GapKind = 'element' | 'letter' | 'word';

export interface DecodedMark extends Mark {
  kind: ElementKind;
  /** The dit length this mark was judged against. */
  ditMs: number;
}

export interface DecodedGap {
  ms: number;
  kind: GapKind;
  ditMs: number;
}

export interface Decoded {
  /** What was sent, with spaces between words. Unknown codes read as "?". */
  text: string;
  marks: DecodedMark[];
  /** The gap before each mark but the first. */
  gaps: DecodedGap[];
  /** The sender's dit length, as read from this sequence. */
  ditMs: number;
  /** The last character is still being keyed (the key hasn't been up for a letter gap yet). */
  keying: boolean;
}

/** 12 wpm: a fair first guess for someone new to a straight key. */
export const START_DIT_MS = 100;
/** Speeds the estimate may reach: ~4 to ~40 wpm. */
const MIN_DIT_MS = 30;
const MAX_DIT_MS = 300;
/** Key-downs this much apart in length are two kinds (dits and dahs), not one. */
const TWO_KINDS = 1.8;

const LETTER_ABOVE = 2;
const WORD_ABOVE = 5;

const CHARS_BY_CODE = new Map(MORSE_CHARS.map((c) => [c.code, c.char]));

/** The character for a code of dots and dashes, or "?" if there is none. */
export const charFor = (code: string) => CHARS_BY_CODE.get(code) ?? '?';

const clampDit = (ms: number) => Math.min(MAX_DIT_MS, Math.max(MIN_DIT_MS, ms));
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Sorts key-down lengths into dits and dahs, and finds the dit length. Returns, for each length,
 * whether it's a dah.
 */
export function sortElements(lengths: readonly number[], guessDitMs = START_DIT_MS) {
  const guess = clampDit(guessDitMs);
  if (!lengths.length) return { dah: [] as boolean[], ditMs: guess };
  const logs = lengths.map((ms) => Math.log(Math.max(1, ms)));
  const lo = Math.min(...logs);
  const hi = Math.max(...logs);
  if (hi - lo < Math.log(TWO_KINDS)) {
    // One kind only: all dits or all dahs, by the guess.
    const isDah = Math.exp(mean(logs)) > 2 * guess;
    const avg = mean(lengths);
    return { dah: lengths.map(() => isDah), ditMs: clampDit(isDah ? avg / 3 : avg) };
  }
  let a = lo;
  let b = hi;
  let dah: boolean[] = [];
  for (let i = 0; i < 12; i++) {
    const cut = (a + b) / 2;
    dah = logs.map((l) => l > cut);
    const shorts = logs.filter((_, j) => !dah[j]);
    const longs = logs.filter((_, j) => dah[j]);
    a = mean(shorts);
    b = mean(longs);
  }
  const dits = lengths.filter((_, j) => !dah[j]);
  const dahs = lengths.filter((_, j) => dah[j]);
  // Both groups say how long a unit is; dits count most (dahs are the ones learners stretch).
  const ditMs = (2 * mean(dits) + mean(dahs) / 3) / 3;
  return { dah, ditMs: clampDit(ditMs) };
}

export interface DecodeOptions {
  /** The sender's dit from earlier drills, for when only one kind has been keyed yet. */
  startDitMs?: number;
  /**
   * The time of reading: the last character only counts as finished once the key has been up
   * for a letter gap. Without it, everything is finished.
   */
  now?: number;
}

/** Decodes a sequence of key-downs into text. */
export function decode(marks: readonly Mark[], options: DecodeOptions = {}): Decoded {
  const { dah, ditMs } = sortElements(
    marks.map((m) => m.up - m.down),
    options.startDitMs,
  );
  const out: DecodedMark[] = [];
  const gaps: DecodedGap[] = [];
  let text = '';
  let code = '';

  marks.forEach((m, i) => {
    const prev = marks[i - 1];
    if (prev) {
      const ms = m.down - prev.up;
      const kind: GapKind =
        ms > WORD_ABOVE * ditMs ? 'word' : ms > LETTER_ABOVE * ditMs ? 'letter' : 'element';
      gaps.push({ ms, kind, ditMs });
      if (kind !== 'element') {
        text += charFor(code);
        code = '';
        if (kind === 'word') text += ' ';
      }
    }
    const kind: ElementKind = dah[i] ? 'dah' : 'dit';
    out.push({ ...m, kind, ditMs });
    code += kind === 'dit' ? '.' : '-';
  });

  const last = marks[marks.length - 1];
  let keying = false;
  if (code && last) {
    const silence = options.now === undefined ? Infinity : options.now - last.up;
    if (silence > LETTER_ABOVE * ditMs) text += charFor(code);
    else keying = true;
  }
  return { text, marks: out, gaps, ditMs, keying };
}

/** Words per minute for a dit length (PARIS: a dit is 1.2 s / wpm). */
export const wpmFor = (ditMs: number) => 1200 / ditMs;
