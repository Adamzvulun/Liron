// Hear it (#503, Phase 11; docs/game/arabic-listening.md): a deck sentence plays with no text,
// you pick its meaning, then put its words in order. The sentences are a list of deck ids with
// the chapter each needs (content/arabic/hear-sentences.json, built locally from the deck).
import { z } from 'zod';
import pack from '../../../../content/arabic/hear-sentences.json' with { type: 'json' };
import type { ReviewGrade } from '../../../core/subject.ts';
import { shuffle } from '../core/coreWords.ts';
import type { ArabicProgress } from '../progress.ts';

type Rand = () => number;

const List = z.object({
  sentences: z.array(z.object({ deck: z.string(), chapter: z.number().int().positive() }).strict()),
});

export interface HearSentence {
  /** The deck item, e.g. `pcav:0635`. */
  deck: string;
  /** Its spaced-repetition item: `hear:pcav:0635`. */
  itemId: string;
  /** The latest word chapter its words need. */
  chapter: number;
}

export const hearIdOf = (deck: string) => `hear:${deck}`;

export const HEAR_SENTENCES: readonly HearSentence[] = pack.items.flatMap((i) =>
  List.parse(i.data).sentences.map((s) => ({ ...s, itemId: hearIdOf(s.deck) })),
);

export const HEAR_ROUND = 8;
/** With fewer sentences than this a round isn't worth it: Hear it stays locked. */
export const HEAR_MIN = 4;
/** The word bank holds this many spare words besides the sentence's own. */
export const SPARES = 2;
export const CHOICES = 4;

/** The sentences whose words your chapter has taught. */
export const hearable = (
  progress: ArabicProgress,
  pool: readonly HearSentence[] = HEAR_SENTENCES,
) => pool.filter((s) => s.chapter <= progress.words.chapter);

/** Open once the first word-path chapter is passed and enough sentences qualify. */
export const hearOpen = (
  progress: ArabicProgress,
  pool: readonly HearSentence[] = HEAR_SENTENCES,
) => progress.words.chapter > 1 && hearable(progress, pool).length >= HEAR_MIN;

/**
 * A round: sentences due for review first, then ones you've never heard, then the rest, each
 * group shuffled; as many as qualify, up to `n`.
 */
export function pickSentences(
  progress: ArabicProgress,
  due: ReadonlySet<string>,
  done: ReadonlySet<string>,
  rand: Rand,
  pool: readonly HearSentence[] = HEAR_SENTENCES,
  n = HEAR_ROUND,
): HearSentence[] {
  const mine = hearable(progress, pool);
  const group = (keep: (s: HearSentence) => boolean) => shuffle(mine.filter(keep), rand);
  return [
    ...group((s) => due.has(s.itemId)),
    ...group((s) => !due.has(s.itemId) && !done.has(s.itemId)),
    ...group((s) => !due.has(s.itemId) && done.has(s.itemId)),
  ].slice(0, n);
}

/** The right meaning and wrong ones from other sentences, shuffled; never the same text twice. */
export function meaningChoices(right: string, others: readonly string[], rand: Rand): string[] {
  const key = (s: string) => s.trim().toLowerCase();
  const seen = new Set([key(right)]);
  const wrong = shuffle(others, rand).filter((o) => !seen.has(key(o)) && seen.add(key(o)));
  return shuffle([right, ...wrong.slice(0, CHOICES - 1)], rand);
}

export interface BankWord {
  /** Its place in the bank, so two copies of the same word are two tiles. */
  id: number;
  text: string;
}

/** The sentence's words plus up to 2 spare words it doesn't use, all shuffled. */
export function wordBank(
  sentence: readonly string[],
  spares: readonly string[],
  rand: Rand,
): BankWord[] {
  const used = new Set(sentence);
  const extra = shuffle(
    [...new Set(spares)].filter((w) => !used.has(w)),
    rand,
  ).slice(0, SPARES);
  return shuffle([...sentence, ...extra], rand).map((text, id) => ({ id, text }));
}

/** Each placed word in or out of its place; a repeated word fits either of its places. */
export const markPlaced = (placed: readonly string[], sentence: readonly string[]) =>
  placed.map((w, i) => w === sentence[i]);

/** Both parts right is Good, one is Hard, neither is Again. */
export function gradeHear(meaningRight: boolean, orderRight: boolean): ReviewGrade {
  return meaningRight && orderRight ? 'good' : meaningRight || orderRight ? 'hard' : 'again';
}
