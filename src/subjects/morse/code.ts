import characters from '../../../content/morse/characters.json';

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

const CODES = new Map(MORSE_CHARS.map((c) => [c.char, c.code]));

/** The code for one character (any case), or undefined if we don't teach it. */
export function codeFor(char: string): string | undefined {
  return CODES.get(char.toUpperCase());
}
