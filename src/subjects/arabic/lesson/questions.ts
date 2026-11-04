// One script session's questions (#38, #41): Listen (hear a word, pick its first letter) and
// Read (see a word, pick how it sounds, in Hebrew letters). Built from the deck's words and the
// letters you know; the letter you're likeliest to confuse is always among the choices.
import { lettersUpTo, lookalikes, type Letter, LESSONS } from '../letters.ts';
import { readableWith, type Word } from '../words.ts';

export const LISTEN_COUNT = 10;
export const READ_COUNT = 8;
const CHOICES = 4;

export interface ListenQuestion {
  kind: 'listen';
  word: Word;
  answer: Letter;
  choices: Letter[];
}

export interface ReadQuestion {
  kind: 'read';
  word: Word;
  /** Choices in Hebrew letters; the right one is the word's own. */
  choices: string[];
}

export type Question = ListenQuestion | ReadQuestion;

type Rand = () => number;

function shuffle<T>(list: readonly T[], rand: Rand): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/** Picks n, preferring `first` (shuffled), then the rest; no repeats. */
function pick<T>(first: readonly T[], rest: readonly T[], n: number, rand: Rand): T[] {
  const out = shuffle(first, rand).slice(0, n);
  for (const x of shuffle(rest, rand)) {
    if (out.length >= n) break;
    if (!out.includes(x)) out.push(x);
  }
  return out;
}

/** Short words read best and are quickest to hear. */
const short = (w: Word) => w.letters.length <= 6;

/** Hear a word, pick its first letter: mostly the lesson's new letters, some older ones. */
export function listenQuestions(
  words: readonly Word[],
  lesson: number,
  rand: Rand,
  count = LISTEN_COUNT,
): ListenQuestion[] {
  const known = lettersUpTo(lesson);
  const fresh = new Set(LESSONS[lesson - 1]?.letters.map((l) => l.id));
  // Alif rarely starts a spoken word (its hamza does), so it's asked in the middle only: skip it.
  const usable = words.filter(
    (w) => short(w) && w.letters[0]?.letter !== 'ا' && known.some((k) => k.id === w.letters[0]?.id),
  );
  const freshWords = usable.filter((w) => fresh.has(w.letters[0]?.id ?? ''));
  const chosen = pick(freshWords, usable, count, rand);
  return chosen.map((word) => {
    const answer = word.letters[0] as Letter;
    const near = lookalikes(answer).filter((l) => known.some((k) => k.id === l.id));
    const others = known.filter((l) => l.id !== answer.id && l.letter.length === 1);
    const wrong = pick(near.slice(0, 2), others, CHOICES - 1, rand);
    return { kind: 'listen', word, answer, choices: shuffle([answer, ...wrong], rand) };
  });
}

/** See a word you can read, pick its sound: other readable words make the wrong choices. */
export function readQuestions(
  words: readonly Word[],
  lesson: number,
  rand: Rand,
  count = READ_COUNT,
): ReadQuestion[] {
  const known = new Set(lettersUpTo(lesson).map((l) => l.id));
  const fresh = new Set(LESSONS[lesson - 1]?.letters.map((l) => l.id));
  const readable = readableWith(words, known).filter(short);
  const withFresh = readable.filter((w) => w.letters.some((l) => fresh.has(l.id)));
  const chosen = pick(withFresh, readable, count, rand);
  return chosen.map((word) => {
    // Wrong choices look alike: the same length if possible.
    const pool = [...new Set(readable.map((w) => w.hebrew))].filter((h) => h !== word.hebrew);
    const close = pool.filter((h) => Math.abs(h.length - word.hebrew.length) <= 1);
    const wrong = pick(close, pool, CHOICES - 1, rand);
    return { kind: 'read', word, choices: shuffle([word.hebrew, ...wrong], rand) };
  });
}

/** A seeded random number generator (mulberry32), so a session can be replayed in tests. */
export function seeded(seed: number): Rand {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
