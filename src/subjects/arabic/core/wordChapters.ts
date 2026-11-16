// The word path's chapters (#160, E11): deck ids and our glosses in chapters of 30, from
// content/arabic/core-words.json. Kept apart from coreWords.ts so the square's compass
// (road.ts) loads the chapters without the 2,000-odd own sentences (#137).
import { z } from 'zod';
import pack from '../../../../content/arabic/core-words.json' with { type: 'json' };

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
