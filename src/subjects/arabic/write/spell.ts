// Spell it (#519, docs/game/arabic-spelling.md): type a taught word, checked on its letters only.
import type { ReviewGrade, SessionEvent } from '../../../core/subject.ts';
import { SLATE_IDS } from '../ranks.ts';
import { normalizeArabic } from '../phrases/understood.ts';
import { shuffle } from '../core/coreWords.ts';
import { readableWith, type Word } from '../words.ts';

/** Words in a round. */
export const SPELL_WORDS = 8;
/** The share of a round you can't miss for `spell-90`. */
export const SPELL_90 = 0.9;
/** The share of a round that counts as passed, for the inn's keyboard (EARS 6). */
export const SPELL_PASS = 0.8;
/** The events a finished round sends: `spell-90` only at a share of 0.9 or more. */
export const spellEvents = (share: number): SessionEvent[] => [
  { kind: 'spell-round' },
  ...(share >= SPELL_90 ? [{ kind: 'spell-90' }] : []),
];
/** XP for each word spelled, on either try. */
export const XP_PER_WORD = 4;

/** Spell it opens once every letter has been met. */
export const spellOpen = (met: readonly string[]) => SLATE_IDS.every((id) => met.includes(id));

/** The spaced-repetition item of a deck word: `spell:pcav:0685`. */
export const spellItemId = (word: Pick<Word, 'id'>) => `spell:${word.id}`;

/** Right if the letters match once marks are dropped, ة = ه, أ إ آ = ا and ى = ي. */
export const isSpelledRight = (target: string, typed: string) => {
  const t = normalizeArabic(typed);
  return t !== '' && t === normalizeArabic(target);
};

/** Right first time is Good, on the second try Hard, otherwise Again (#519, EARS 4). */
export const spellGrade = (tries: 1 | 2 | null): ReviewGrade =>
  tries === 1 ? 'good' : tries === 2 ? 'hard' : 'again';
/** The `write` skill's score for the same answer. */
export const spellScore = (tries: 1 | 2 | null) => (tries === 1 ? 1 : tries === 2 ? 0.5 : 0);

/** A letter with the marks that sit on it, and whether it matches the other spelling. */
export interface Cluster {
  text: string;
  ok: boolean;
}

/** A word's letters, each with its marks. Spaces and punctuation are kept (and never wrong). */
const clustersOf = (word: string) => word.normalize('NFC').match(/[^ً-ْٰـ][ً-ْٰـ]*/gu) ?? [];

/** For each of `a`, whether it is part of the longest run of letters it shares with `b`. */
function shared(a: readonly string[], b: readonly string[]): boolean[] {
  // len[i][j]: the longest shared run of a[i..] and b[j..].
  const len = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  const at = (i: number, j: number) => len[i]?.[j] ?? 0;
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      (len[i] as number[])[j] =
        a[i] === b[j] ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1));
  const out = a.map(() => false);
  let j = 0;
  for (let i = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) {
      out[i] = true;
      i++;
      j++;
    } else if (at(i + 1, j) >= at(i, j + 1)) i++;
    else j++;
  }
  return out;
}

/**
 * Each side's letters, marked where it differs from the other (the right spelling's missing
 * letters, your wrong or extra ones). Marks don't count: the letters are compared normalized.
 */
export function markLetters(target: string, typed: string): { right: Cluster[]; yours: Cluster[] } {
  const side = (word: string, other: string): Cluster[] => {
    const own = clustersOf(word);
    const keys = own.map(normalizeArabic);
    const ok = shared(keys, clustersOf(other).map(normalizeArabic));
    return own.map((text, i) => ({ text, ok: keys[i] === '' || !!ok[i] }));
  };
  return { right: side(target, typed), yours: side(typed, target) };
}

/**
 * A round's words: due ones first, then new, then known (EARS 2), among the words whose letters
 * you have met. `isNew` says which of the rest were never practiced.
 */
export function pickSpellRound(
  words: readonly Word[],
  met: ReadonlySet<string>,
  due: ReadonlySet<string>,
  isNew: (itemId: string) => boolean,
  rand: () => number,
  size = SPELL_WORDS,
): Word[] {
  const pool = shuffle(readableWith(words, met), rand);
  const dueWords = pool.filter((w) => due.has(spellItemId(w)));
  const rest = pool.filter((w) => !due.has(spellItemId(w)));
  return shuffle(
    [
      ...dueWords,
      ...rest.filter((w) => isNew(spellItemId(w))),
      ...rest.filter((w) => !isNew(spellItemId(w))),
    ].slice(0, size),
    rand,
  );
}
