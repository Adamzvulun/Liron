// Our own sentences (#164) for words the deck has none for: text only, written by us and checked
// against the deck and free references (ADR 0012). No recording. Loaded on demand (`loadOwnSentences`
// in coreWords.ts) so the Caravanserai opens without them (#137).
import { z } from 'zod';
import ownPack from '../../../../content/arabic/own-sentences.json' with { type: 'json' };

const OwnSentence = z.object({
  word: z.string(),
  arabic: z.string().min(1),
  latin: z.string().min(1),
  english: z.string().min(1),
});
export type OwnSentence = z.infer<typeof OwnSentence>;

export const OWN_SENTENCES: ReadonlyMap<string, OwnSentence> = new Map(
  ownPack.items.map((i) => {
    const s = OwnSentence.parse(i.data);
    return [s.word, s];
  }),
);
