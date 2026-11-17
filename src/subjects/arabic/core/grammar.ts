// Grammar cards (#162, E11): short rules shown just before the first word session that needs
// them, and kept in a grammar book at the innkeeper's table. The text is ours
// (content/arabic/grammar.json); the examples are deck sentences, read from the private deck
// with their recordings (ADR 0011).
import type { Item } from '../../../core/content/schema.ts';
import type { ArabicProgress } from '../progress.ts';
import { line, type DeckLine } from './coreWords.ts';
import type { GrammarCardData } from './grammarCards.ts';

export type { GrammarCardData } from './grammarCards.ts';

/** The cards' text, loaded with the word lessons (#137). */
export const loadGrammarCards = () => import('./grammarCards.ts').then((m) => m.GRAMMAR_CARDS);

export interface GrammarCard extends GrammarCardData {
  /** The examples the deck has, with their recordings. */
  lines: DeckLine[];
}

/** Every card, with its examples read from the deck (an example the deck lacks is left out). */
export function grammarFrom(
  items: readonly Item[],
  cards: readonly GrammarCardData[],
): GrammarCard[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return cards.map((c) => ({
    ...c,
    lines: c.examples.flatMap((id) => {
      const l = line(byId.get(id));
      return l ? [l] : [];
    }),
  }));
}

/** The first card of a chapter you've reached that you haven't read yet. */
export function cardDue<T extends GrammarCardData>(
  cards: readonly T[],
  p: ArabicProgress,
): T | undefined {
  const read = new Set(p.words.cards);
  return cards.find((c) => c.chapter <= p.words.chapter && !read.has(c.id));
}

/** The cards you've read, for the grammar book, in chapter order. */
export const cardsRead = <T extends GrammarCardData>(cards: readonly T[], p: ArabicProgress) =>
  cards.filter((c) => p.words.cards.includes(c.id));

/** Marks a card read: it's saved with the session it came before. */
export const withCardRead = (p: ArabicProgress, id: string): ArabicProgress =>
  p.words.cards.includes(id) ? p : { ...p, words: { ...p.words, cards: [...p.words.cards, id] } };
