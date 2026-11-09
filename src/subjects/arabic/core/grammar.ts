// Grammar cards (#162, E11): short rules shown just before the first word session that needs
// them, and kept in a grammar book at the innkeeper's table. The text is ours
// (content/arabic/grammar.json); the examples are deck sentences, read from the private deck
// with their recordings (ADR 0011).
import { z } from 'zod';
import type { Item } from '../../../core/content/schema.ts';
import pack from '../../../../content/arabic/grammar.json' with { type: 'json' };
import type { ArabicProgress } from '../progress.ts';
import { line, type DeckLine } from './coreWords.ts';

const Card = z.object({
  chapter: z.number().int().positive(),
  title: z.string(),
  points: z.array(z.string()).min(1),
  table: z.array(z.tuple([z.string(), z.string()])).optional(),
  letters: z.string().optional(),
  examples: z.array(z.string()),
});

export type GrammarCardData = z.infer<typeof Card> & { id: string };

export const GRAMMAR_CARDS: readonly GrammarCardData[] = pack.items
  .map((i) => ({ id: i.id, ...Card.parse(i.data) }))
  .sort((a, b) => a.chapter - b.chapter);

export interface GrammarCard extends GrammarCardData {
  /** The examples the deck has, with their recordings. */
  lines: DeckLine[];
}

/** Every card, with its examples read from the deck (an example the deck lacks is left out). */
export function grammarFrom(items: readonly Item[]): GrammarCard[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return GRAMMAR_CARDS.map((c) => ({
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
