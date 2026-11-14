// The grammar cards' text (#162), in its own chunk: it loads with the word lessons, not with the
// Caravanserai's doors (#137). The text is ours (content/arabic/grammar.json).
import { z } from 'zod';
import pack from '../../../../content/arabic/grammar.json' with { type: 'json' };

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
