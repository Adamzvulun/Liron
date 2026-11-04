// Words from the Lingualism deck (private, ADR 0011): single words whose letters we teach,
// each with its native recording. Read and Listen drills are built from them (#38, #41).
import type { Item } from '../../core/content/schema.ts';
import { inHebrew, lettersOf, type Letter } from './letters.ts';
import { latinToHebrew } from './phrases/hebrew.ts';

export const DECK = 'lingualism-pcav';

export interface Word {
  /** The deck item, e.g. `pcav:1156`. */
  id: string;
  /** As written in the deck, with its vowel marks. */
  arabic: string;
  letters: readonly Letter[];
  /** The deck's own romanisation, e.g. tīn. */
  sound: string;
  meaning: string;
  /** The recording's path in private media. */
  audio: string;
  /** The word in Hebrew letters, e.g. תין. */
  hebrew: string;
}

/** The deck's single words that are made only of letters we teach (no phrases or affixes). */
export function wordsFrom(items: readonly Item[]): Word[] {
  const words: Word[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (item.type !== 'vocab') continue;
    const d = item.data as { arabic?: unknown; pronunciation?: unknown; english?: unknown };
    const arabic = typeof d.arabic === 'string' ? d.arabic.trim() : '';
    if (!arabic || /[\s،()/ـ]/.test(arabic)) continue;
    const letters = lettersOf(arabic);
    const audio = item.media.find((m) => m.kind === 'audio')?.path;
    if (!letters || !audio) continue;
    const key = letters.map((l) => l.letter).join('');
    if (seen.has(key)) continue;
    seen.add(key);
    words.push({
      id: item.id,
      arabic,
      letters,
      sound: typeof d.pronunciation === 'string' ? d.pronunciation : '',
      meaning: typeof d.english === 'string' ? d.english : '',
      audio,
      hebrew: inHebrew(letters),
    });
  }
  return words;
}

/** Words you can read: every letter is one you know. */
export function readableWith(words: readonly Word[], known: ReadonlySet<string>): Word[] {
  return words.filter((w) => w.letters.every((l) => known.has(l.id)));
}

/**
 * How the deck's speaker says a word, in Hebrew letters, from its romanisation (review concern 2):
 * قهوة is spelled with ق but said gáhwa here, so a reveal shows גַהוַא next to the spelling. Empty
 * when the word has no romanisation.
 */
export function spokenHebrew(word: Pick<Word, 'sound'>): string {
  return /[a-z]/i.test(word.sound) ? latinToHebrew(word.sound) : '';
}
