// Words from the Lingualism deck (private, ADR 0011): single words whose letters we teach,
// each with its native recording. Read and Listen drills are built from them (#38, #41).
// The letter lessons use only the words we reviewed (content/arabic/lesson-words.json, #125),
// with our own glosses. The echo well draws on a wider pool: the word path's words too, all with
// our glosses (ECHO_POOL).
import type { Item } from '../../core/content/schema.ts';
import pathPack from '../../../content/arabic/core-words.json' with { type: 'json' };
import reviewPack from '../../../content/arabic/lesson-words.json' with { type: 'json' };
import { inHebrew, LESSON_COUNT, lettersOf, type Letter } from './letters.ts';
import { latinToHebrew } from './phrases/hebrew.ts';

export const DECK = 'lingualism-pcav';

export interface Word {
  /** The deck item, e.g. `pcav:1156`. */
  id: string;
  /** As written in the deck, with its vowel marks. */
  arabic: string;
  letters: readonly Letter[];
  /** How it sounds, in Latin letters, e.g. tīn: the deck's romanisation without its tags. */
  sound: string;
  /** What it means: our own gloss where the lesson was reviewed, the deck's English otherwise. */
  meaning: string;
  /** The recording's path in private media. */
  audio: string;
  /** The word in Hebrew letters, e.g. תין. */
  hebrew: string;
  /**
   * Another word has the same letters and only its vowel marks tell them apart (لُوَز tonsils,
   * لوْز almonds), so it is never shown bare.
   */
  homograph: boolean;
}

/** Which deck words an early lesson uses, with our glosses (content/arabic/lesson-words.json). */
export interface WordReview {
  /** The lessons whose words were reviewed: only listed words are used in them. */
  lessons: ReadonlySet<number>;
  words: ReadonlyMap<string, { gloss: string; latin?: string }>;
}

interface ReviewData {
  lesson: number;
  words: { deck: string; gloss: string; latin?: string }[];
  leftOut: { deck: string; why: string }[];
}

/** The reviews in content/arabic/lesson-words.json. */
export const REVIEWS: readonly ReviewData[] = reviewPack.items.map((i) => i.data as ReviewData);

export const REVIEW: WordReview = {
  lessons: new Set(REVIEWS.map((r) => r.lesson)),
  words: new Map(REVIEWS.flatMap((r) => r.words.map((w) => [w.deck, w] as const))),
};

/** No reviewed lessons: every deck word is used, cleaned up (for tests). */
export const NO_REVIEW: WordReview = { lessons: new Set(), words: new Map() };

/**
 * The echo well's words (Adam, 2026-11-10: short letter lessons, a wider pool for the well): the
 * reviewed lesson words and every word on the word path, each with our gloss. The well needs many
 * words per sound, more than the short lesson lists hold.
 */
export const ECHO_POOL: WordReview = {
  lessons: new Set(Array.from({ length: LESSON_COUNT }, (_, i) => i + 1)),
  words: new Map([
    ...pathPack.items.flatMap((c) =>
      (c.data as { words: { deck: string; gloss: string }[] }).words.map(
        (w) => [w.deck, { gloss: w.gloss }] as const,
      ),
    ),
    ...REVIEW.words,
  ]),
};

/** The deck's romanisation without its grammar tags ("lúwaz [pl.]" → "lúwaz"). */
export const untagged = (sound: string) =>
  sound
    .replace(/\[.*?\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** The deck gives verbs as "to …": they don't belong in a reading drill of single words. */
const isVerb = (english: string) => /^to\s/i.test(english.trim());

/**
 * The deck's single words that are made only of letters we teach (no phrases or affixes). A
 * word's lesson is the latest lesson among its letters: in a reviewed lesson only the listed
 * words are used, with our glosses; in the others, the deck's words without verbs. A spelling is
 * used once; words whose letters match but whose marks differ are both kept, as homographs.
 */
export function wordsFrom(items: readonly Item[], review: WordReview = REVIEW): Word[] {
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
    const english = typeof d.english === 'string' ? d.english : '';
    const sound = untagged(typeof d.pronunciation === 'string' ? d.pronunciation : '');
    const lesson = Math.max(...letters.map((l) => l.lesson));
    const reviewed = review.lessons.has(lesson);
    const listed = review.words.get(item.id);
    if (reviewed ? !listed : isVerb(english)) continue;
    if (seen.has(arabic)) continue;
    seen.add(arabic);
    words.push({
      id: item.id,
      arabic,
      letters,
      sound: listed?.latin ?? sound,
      meaning: listed?.gloss ?? english,
      audio,
      hebrew: inHebrew(letters),
      homograph: false,
    });
  }
  // Same letters, different marks: both stay, as homographs. A spelling with no marks can't be
  // told apart from the others, so it goes (برد next to برْد).
  const bare = (w: Word) => w.letters.map((l) => l.letter).join('');
  const marked = (w: Word) => /[\u064b-\u0652]/.test(w.arabic);
  const groups = new Map<string, Word[]>();
  for (const w of words) groups.set(bare(w), [...(groups.get(bare(w)) ?? []), w]);
  return words.flatMap((w) => {
    const group = groups.get(bare(w)) ?? [w];
    if (group.length === 1) return [w];
    const kept = group.some(marked) ? group.filter(marked) : group.slice(0, 1);
    if (!kept.includes(w)) return [];
    return [{ ...w, homograph: kept.length > 1 }];
  });
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
