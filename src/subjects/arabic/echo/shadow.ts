// Shadowing (#194, E14): speak along with a short deck sentence while it plays. The sentences
// are the word path's (content/arabic/core-words.json ties a sentence to each word); you judge
// yourself and that sets the sentence's review. Design: docs/game/mic-practice.md §3.
import type { ReviewGrade } from '../../../core/subject.ts';
import { shuffle, type CoreWord, type DeckLine } from '../core/coreWords.ts';
import type { ArabicProgress } from '../progress.ts';

type Rand = () => number;

export interface ShadowLine extends DeckLine {
  /** The sentence's deck item, e.g. `pcav:0635`. */
  deck: string;
  /** Its spaced-repetition item: `shadow:pcav:0635`. */
  itemId: string;
  /** The word path's word it belongs to, as a hint of what it means. */
  word: string;
  words: number;
}

/** Sentences in a round. */
export const SHADOW_ROUND = 5;
/** The shortest sentences shadow best: 3 to 6 words. */
export const MIN_WORDS = 3;
export const MAX_WORDS = 6;
/** The first time through a sentence is slower; the browser keeps the pitch. */
export const SLOW_RATE = 0.75;
/** 3 XP a sentence shadowed (a sentence takes about 20 seconds: hear, shadow, listen back). */
export const XP_PER_SENTENCE = 3;

export type Judgement = 'in-step' | 'close' | 'lost';
export const GRADE: Record<Judgement, ReviewGrade> = {
  'in-step': 'good',
  close: 'hard',
  lost: 'again',
};

export const shadowIdOf = (deck: string) => `shadow:${deck}`;

/** Words in a sentence, as written (punctuation doesn't count). */
export const wordCount = (arabic: string) =>
  arabic
    .replace(/[.,!?؟،:;"“”«»()-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

/**
 * The sentences you can shadow: those of the words you've met on the word path, each once, 3 to
 * 6 words long. Until you've met any, the first chapter's.
 */
export function shadowLines(
  chapters: readonly (readonly CoreWord[])[],
  met: ReadonlySet<string>,
): ShadowLine[] {
  const all = chapters.flat();
  const mine = all.filter((w) => met.has(w.deck));
  const from = mine.length ? mine : (chapters[0] ?? []);
  const seen = new Set<string>();
  const out: ShadowLine[] = [];
  for (const w of from) {
    const s = w.sentence;
    if (!s || seen.has(s.deck)) continue;
    const words = wordCount(s.arabic);
    if (words < MIN_WORDS || words > MAX_WORDS) continue;
    seen.add(s.deck);
    out.push({ ...s, itemId: shadowIdOf(s.deck), word: w.meaning, words });
  }
  return out;
}

/**
 * A round: sentences due for review first, then ones you've never shadowed (shortest first),
 * then the rest, shuffled.
 */
export function shadowRound(
  lines: readonly ShadowLine[],
  due: ReadonlySet<string>,
  done: ReadonlySet<string>,
  rand: Rand,
  size = SHADOW_ROUND,
): ShadowLine[] {
  const dueLines = shuffle(
    lines.filter((l) => due.has(l.itemId)),
    rand,
  );
  const fresh = lines
    .filter((l) => !done.has(l.itemId) && !due.has(l.itemId))
    .sort((a, b) => a.words - b.words);
  const rest = shuffle(
    lines.filter((l) => done.has(l.itemId) && !due.has(l.itemId)),
    rand,
  );
  return [...dueLines, ...fresh, ...rest].slice(0, size);
}

/** After a round: count the sentences shadowed (for the "Echo" achievement, #197). */
export function applyShadow(p: ArabicProgress, judged: number): ArabicProgress {
  return {
    ...p,
    sessions: p.sessions + 1,
    echo: { ...p.echo, shadowed: p.echo.shadowed + judged },
  };
}
