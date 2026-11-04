// "The Silent Beacon", the Signal Tower's main questline (#34, discovery 04): each chapter is
// eight Koch characters, one lamp each, and ends with a trial. The text is content data in
// content/morse/questline.json.

import { z } from 'zod';
import questline from '../../../content/morse/questline.json' with { type: 'json' };

const Trial = z.object({
  name: z.string(),
  text: z.string(),
  chars: z.number().int().positive(),
  accuracy: z.number().min(0).max(1),
  xp: z.number().int().positive(),
});

const Chapter = z.object({
  questline: z.string(),
  number: z.number().int().positive(),
  title: z.string(),
  letters: z.array(z.string()).min(1),
  intro: z.string(),
  trial: Trial,
  outro: z.string(),
});

export type Chapter = z.infer<typeof Chapter> & { lamps: Map<string, string> };

/** The chapters in order, each with its lamps' story beats by character. */
export const CHAPTERS: readonly Chapter[] = questline.items
  .filter((i) => i.type === 'chapter')
  .map((i) => {
    const chapter = Chapter.parse(i.data);
    const lamps = new Map(
      questline.items
        .filter((l) => l.type === 'lamp' && l.id.startsWith(`${i.id}:`))
        .map((l) => [String(l.data.char), String(l.data.text)]),
    );
    return { ...chapter, lamps };
  })
  .sort((a, b) => a.number - b.number);

/** Roman numerals for chapter titles. */
export const roman = (n: number) =>
  ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n - 1] ?? `${n}`;

/**
 * Where the learner is: the chapter holding their newest letter (or the last written chapter),
 * how many of its lamps are lit, and the newest lit lamp's story beat.
 */
export function questStatus(unlocked: readonly string[]) {
  const newest = unlocked[unlocked.length - 1];
  const chapter =
    CHAPTERS.find((c) => newest !== undefined && c.letters.includes(newest)) ??
    CHAPTERS[CHAPTERS.length - 1];
  if (!chapter) return null;
  const lit = chapter.letters.filter((c) => unlocked.includes(c));
  const beat = newest !== undefined ? chapter.lamps.get(newest) : undefined;
  return {
    chapter,
    lit,
    beat: lit.length ? beat : undefined,
    /** All eight lamps lit: the trial is next. */
    trialReady: lit.length === chapter.letters.length,
  };
}
