// Morse words (#153, E12): common English words, Q-codes, abbreviations and prosigns, from
// content/morse/words.json. Design: docs/game/morse-words.md.

import words from '../../../content/morse/words.json' with { type: 'json' };

export type WordKind = 'word' | 'q-code' | 'abbreviation' | 'prosign';

export interface MorseWord {
  /** Content id, e.g. `word:the`, `abbr:qth`, `prosign:ar`. */
  id: string;
  /** What is sent: letters for words, the name for a prosign (`AR`). */
  text: string;
  kind: WordKind;
  /** What it means, for Q-codes, abbreviations and prosigns. */
  meaning?: string;
  /** Common words only: 1 is the most frequent. */
  rank?: number;
  /** Prosigns only: dots and dashes, sent as one character. */
  code?: string;
}

/** Every word, common words first in frequency order, then the shorthand. */
export const MORSE_WORDS: readonly MorseWord[] = words.items.map((item) => {
  const d = item.data as {
    text: string;
    kind?: WordKind;
    meaning?: string;
    rank?: number;
    code?: string;
  };
  return {
    id: item.id,
    text: d.text,
    kind: item.type === 'morse-prosign' ? 'prosign' : (d.kind ?? 'word'),
    ...(d.meaning !== undefined && { meaning: d.meaning }),
    ...(d.rank !== undefined && { rank: d.rank }),
    ...(d.code !== undefined && { code: d.code }),
  };
});

export const PROSIGNS: readonly MorseWord[] = MORSE_WORDS.filter((w) => w.kind === 'prosign');

/** How a word is written in text the engine plays: a prosign in angle brackets (`<AR>`). */
export const written = (w: MorseWord) => (w.kind === 'prosign' ? `<${w.text}>` : w.text);

/** The words whose characters are all unlocked (for a prosign, the letters that name it). */
export function openWords(unlocked: readonly string[]): MorseWord[] {
  const have = new Set(unlocked);
  return MORSE_WORDS.filter((w) => [...w.text].every((c) => have.has(c)));
}

/**
 * The rating a word starts at in the head-copy skill (ADR 0024): the commonest words are
 * easiest, shorthand and prosigns hardest (docs/game/morse-words.md).
 */
export function wordSeed(w: MorseWord): number {
  if (w.kind === 'word') return (w.rank ?? 999) <= 50 ? 900 : 1000;
  return w.kind === 'abbreviation' ? 1000 : 1100;
}
