import characters from '../../../content/morse/characters.json' with { type: 'json' };
import { PROSIGNS, written } from './words.ts';

/** One Morse character from the content pack (content/morse/characters.json). */
export interface MorseChar {
  char: string;
  /** Dots and dashes, e.g. "-.-". Engine data only: never shown to the learner. */
  code: string;
  kind: 'letter' | 'digit' | 'punctuation';
  kochPosition: number;
}

/** All characters, in Koch order (ADR 0028). */
export const MORSE_CHARS: readonly MorseChar[] = characters.items
  .map((item) => item.data as MorseChar)
  .sort((a, b) => a.kochPosition - b.kochPosition);

/** Prosigns (#155) send as one character, written in angle brackets: `<AR>`. */
const CODES = new Map([
  ...MORSE_CHARS.map((c) => [c.char, c.code] as const),
  ...PROSIGNS.flatMap((p) => (p.code ? [[written(p), p.code] as const] : [])),
]);

/** The characters a word sends, in order: a prosign such as `<AR>` counts as one. */
export function sendable(word: string): string[] {
  return word.toUpperCase().match(/<[A-Z]{2}>|./gsu) ?? [];
}

/** The code for one character or prosign (any case), or undefined if we don't teach it. */
export function codeFor(char: string): string | undefined {
  return CODES.get(char.toUpperCase());
}
