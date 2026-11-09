// The word path (#160, E11): the first 300 words, in the 10 chapters of
// content/arabic/core-words.json (#159). That file holds only deck ids and our glosses; the Arabic,
// the Latin and the recordings come from the private deck (ADR 0011).
import { z } from 'zod';
import type { Item } from '../../../core/content/schema.ts';
import type { ReviewGrade } from '../../../core/subject.ts';
import pack from '../../../../content/arabic/core-words.json' with { type: 'json' };
import { dropGroups, latinToHebrew } from '../phrases/hebrew.ts';

const Chapter = z.object({
  chapter: z.number().int().positive(),
  title: z.string(),
  theme: z.string(),
  words: z.array(
    z.object({ deck: z.string(), gloss: z.string(), sentence: z.string().optional() }),
  ),
});
export type WordChapter = z.infer<typeof Chapter>;

export const WORD_CHAPTERS: readonly WordChapter[] = pack.items
  .map((i) => Chapter.parse(i.data))
  .sort((a, b) => a.chapter - b.chapter);

/** A session: due words first, then up to NEW_PER_SESSION new ones, then words you know. */
export const SESSION_WORDS = 12;
export const NEW_PER_SESSION = 5;
const CHOICES = 4;

export interface DeckLine {
  arabic: string;
  latin: string;
  english: string;
  audio: string;
}

export interface CoreWord {
  /** The deck item, e.g. `pcav:0685`. */
  deck: string;
  /** The spaced-repetition item: `word:pcav:0685`. */
  itemId: string;
  chapter: number;
  arabic: string;
  latin: string;
  /** How it sounds, in Hebrew letters (from the deck's Latin). */
  hebrew: string;
  meaning: string;
  audio: string;
  /** A deck sentence that uses the word, with its recording, when the deck has one. */
  sentence?: DeckLine;
}

export const itemIdOf = (deck: string) => `word:${deck}`;

/** Deck notes that don't belong on a card: blanks ("__ واحد"), "[pl.]" tags, construct forms. */
const tidy = (s: string) =>
  dropGroups(s, (g) => !g.includes('_'))
    .replace(/_+\s*/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function line(item: Item | undefined): DeckLine | undefined {
  const d = item?.data as { arabic?: unknown; pronunciation?: unknown; english?: unknown };
  const audio = item?.media.find((m) => m.kind === 'audio')?.path;
  if (!item || !audio || typeof d.arabic !== 'string') return undefined;
  return {
    arabic: tidy(d.arabic),
    latin: tidy(typeof d.pronunciation === 'string' ? d.pronunciation : ''),
    english: typeof d.english === 'string' ? d.english.trim() : '',
    audio,
  };
}

/** Every chapter's words from the deck's items; a word the deck lacks is left out. */
export function coreWordsFrom(items: readonly Item[]): CoreWord[][] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return WORD_CHAPTERS.map((c) =>
    c.words.flatMap((w) => {
      const own = line(byId.get(w.deck));
      if (!own) return [];
      const sentence = w.sentence ? line(byId.get(w.sentence)) : undefined;
      return [
        {
          deck: w.deck,
          itemId: itemIdOf(w.deck),
          chapter: c.chapter,
          arabic: own.arabic,
          latin: own.latin,
          hebrew: latinToHebrew(own.latin),
          meaning: w.gloss,
          audio: own.audio,
          ...(sentence ? { sentence } : {}),
        },
      ];
    }),
  );
}

type Rand = () => number;

function shuffle<T>(list: readonly T[], rand: Rand): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/**
 * A session's words: due ones (from any chapter you've reached) first, then up to 5 of your
 * chapter's words you haven't met, in teaching order, then words you've met, shuffled.
 */
export function pickSession(
  chapters: readonly (readonly CoreWord[])[],
  chapter: number,
  met: ReadonlySet<string>,
  due: ReadonlySet<string>,
  rand: Rand,
  size = SESSION_WORDS,
): { words: CoreWord[]; fresh: CoreWord[] } {
  const reached = chapters.slice(0, chapter).flat();
  const dueWords = shuffle(
    reached.filter((w) => met.has(w.deck) && due.has(w.itemId)),
    rand,
  ).slice(0, size);
  const fresh = (chapters[chapter - 1] ?? [])
    .filter((w) => !met.has(w.deck))
    .slice(0, Math.min(NEW_PER_SESSION, size - dueWords.length));
  const taken = new Set([...dueWords, ...fresh].map((w) => w.deck));
  const known = shuffle(
    reached.filter((w) => met.has(w.deck) && !taken.has(w.deck)),
    rand,
  ).slice(0, size - taken.size);
  return { words: shuffle([...dueWords, ...fresh, ...known], rand), fresh };
}

export type WordQuestionKind = 'listen' | 'read' | 'recall';

export interface WordQuestion {
  kind: WordQuestionKind;
  word: CoreWord;
  /** Listen and Read: meanings to pick from. Recall: the Arabic of 4 words. */
  choices: string[];
  answer: string;
}

/** The Glicko skill a question rates: recall is reading the Arabic choices. */
export const skillOf = (kind: WordQuestionKind) => (kind === 'listen' ? 'listen' : 'read');

/** One question a word, taking turns: listen, read, recall. Wrong choices come from the pool. */
export function wordQuestions(
  words: readonly CoreWord[],
  pool: readonly CoreWord[],
  rand: Rand,
): WordQuestion[] {
  const kinds: WordQuestionKind[] = ['listen', 'read', 'recall'];
  return words.map((word, i) => {
    const kind = kinds[i % kinds.length] ?? 'listen';
    const field = (w: CoreWord) => (kind === 'recall' ? w.arabic : w.meaning);
    const answer = field(word);
    // Prefer other words from the same chapter: they're the ones you'd mix up.
    const near = shuffle(
      pool.filter((w) => w.chapter === word.chapter),
      rand,
    );
    const far = shuffle(
      pool.filter((w) => w.chapter !== word.chapter),
      rand,
    );
    const others = [...new Set([...near, ...far].map(field))].filter((x) => x && x !== answer);
    return {
      kind,
      word,
      answer,
      choices: shuffle([answer, ...others.slice(0, CHOICES - 1)], rand),
    };
  });
}

export const gradeOf = (right: boolean): ReviewGrade => (right ? 'good' : 'again');

/** XP: 2 a right answer (about 10 a minute), and 20 for passing a chapter. */
export const CHAPTER_BONUS = 20;
export const wordXp = (right: number, passed: boolean) => 2 * right + (passed ? CHAPTER_BONUS : 0);
