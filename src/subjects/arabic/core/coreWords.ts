// The word path (#160, E11): its words in chapters of 30 (wordChapters.ts, from
// content/arabic/core-words.json, #159, #163). That file holds only deck ids and our glosses; the Arabic,
// the Latin and the recordings come from the private deck (ADR 0011).
import type { Item } from '../../../core/content/schema.ts';
import type { ReviewGrade } from '../../../core/subject.ts';
import { dropGroups, latinToHebrew } from '../phrases/hebrew.ts';
import type { OwnSentence } from './ownSentences.ts';
import { SHARED_ROOTS, type Kin } from './sharedRoots.ts';
import { VERB_SHAPES, type Binyan } from './verbShapes.ts';
import { WORD_CHAPTERS } from './wordChapters.ts';

export { WORD_CHAPTERS, type WordChapter } from './wordChapters.ts';

/** Our own sentences by deck word, loaded on demand: the Caravanserai opens without them. */
export const loadOwnSentences = () => import('./ownSentences.ts').then((m) => m.OWN_SENTENCES);

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
  /** A deck sentence that uses the word, with its recording and deck id, when the deck has one. */
  sentence?: DeckLine & { deck: string };
  /** Otherwise our own sentence (#164), text only: no recording, so it isn't shadowed. */
  written?: { arabic: string; latin: string; hebrew: string; english: string };
  /** The Hebrew word that shares its root, if one does (ADR 0002). */
  kin?: Kin;
  /** The Hebrew binyan its shape matches, for a verb that has one (ADR 0002). */
  shape?: Binyan;
}

export const itemIdOf = (deck: string) => `word:${deck}`;

/** How many verbs of the same shape a card lists. */
export const MATES = 6;

/**
 * Other verbs of a word's shape from its chapter and the ones before it, latest first: what the
 * pattern badge opens to.
 */
export function shapeMates(word: CoreWord, pool: readonly CoreWord[], n = MATES): CoreWord[] {
  if (!word.shape) return [];
  return pool
    .filter((w) => w.shape === word.shape && w.chapter <= word.chapter && w.deck !== word.deck)
    .sort((a, b) => b.chapter - a.chapter)
    .slice(0, n);
}

/** Deck notes that don't belong on a card: blanks ("__ واحد"), "[pl.]" tags, construct forms. */
const tidy = (s: string) =>
  dropGroups(s, (g) => !g.includes('_'))
    .replace(/_+\s*/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function line(item: Item | undefined): DeckLine | undefined {
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

/**
 * Every chapter's words from the deck's items; a word the deck lacks is left out. A word with no
 * deck sentence takes ours from `ownSentences` (see `loadOwnSentences`).
 */
export function coreWordsFrom(
  items: readonly Item[],
  ownSentences: ReadonlyMap<string, OwnSentence> = new Map(),
): CoreWord[][] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return WORD_CHAPTERS.map((c) =>
    c.words.flatMap((w) => {
      const own = line(byId.get(w.deck));
      if (!own) return [];
      const said = w.sentence ? line(byId.get(w.sentence)) : undefined;
      const sentence = said && w.sentence ? { ...said, deck: w.sentence } : undefined;
      const mine = sentence ? undefined : ownSentences.get(w.deck);
      const kin = SHARED_ROOTS.get(w.deck);
      const shape = VERB_SHAPES.get(w.deck);
      const written = mine && {
        arabic: mine.arabic,
        latin: mine.latin,
        hebrew: latinToHebrew(mine.latin),
        english: mine.english,
      };
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
          ...(written ? { written } : {}),
          ...(kin ? { kin } : {}),
          ...(shape ? { shape } : {}),
        },
      ];
    }),
  );
}

type Rand = () => number;

export function shuffle<T>(list: readonly T[], rand: Rand): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/**
 * A session's words: due ones (from any chapter you've reached) first, then up to 5 words you
 * haven't met, in teaching order (any left in earlier chapters first, then your chapter's), then
 * words you've met, shuffled. A chapter only passes once all its words are met (review,
 * 2026-11-15), and words an older version skipped come back this way.
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
  const fresh = reached
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

/** A word's Arabic without its vowel marks, shadda or tatweel, to tell which words look alike. */
const bareArabic = (arabic: string) => arabic.replace(/[\u064b-\u0652\u0670\u0640]/g, '');

/** One question a word, taking turns: listen, read, recall. Wrong choices come from the pool. */
export function wordQuestions(
  words: readonly CoreWord[],
  pool: readonly CoreWord[],
  rand: Rand,
  kinds: readonly WordQuestionKind[] = ['listen', 'read', 'recall'],
): WordQuestion[] {
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
    // A second word for the same thing (two words for *belt*) is never a wrong choice, and
    // neither is a word written the same way with another meaning (*dry* and *stubborn*): when
    // you hear or read the Arabic, its meaning would be right too.
    const bare = bareArabic(word.arabic);
    const others = [
      ...new Set(
        [...near, ...far]
          .filter((w) => w.meaning !== word.meaning && bareArabic(w.arabic) !== bare)
          .map(field),
      ),
    ].filter((x) => x && x !== answer);
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
