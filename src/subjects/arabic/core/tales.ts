// The regulars' tales (#491): once you pass a regular's trial, they tell you a short tale made
// only of words you know (taught in their chapter or before). Our own text, from
// content/arabic/tales.json; no recordings. tests/tales-deck.test.ts checks the words locally.
import { z } from 'zod';
import pack from '../../../../content/arabic/tales.json' with { type: 'json' };
import { latinToHebrew } from '../phrases/hebrew.ts';

const Line = z.object({ arabic: z.string(), latin: z.string(), english: z.string() });
const Tale = z.object({
  chapter: z.number().int().positive(),
  /** The regular who tells it: `road:N`. */
  regular: z.string().regex(/^road:\d+$/),
  title: z.string(),
  lines: z.array(Line).min(3),
});

export interface TaleLine {
  arabic: string;
  latin: string;
  /** How it sounds, in Hebrew letters (from the Latin). */
  hebrew: string;
  english: string;
}

export interface Tale {
  id: string;
  chapter: number;
  /** The road chapter of the regular who tells it, as in `progress.words.trials`. */
  road: number;
  title: string;
  lines: TaleLine[];
}

export const TALES: readonly Tale[] = pack.items.map((i) => {
  const t = Tale.parse(i.data);
  return {
    id: i.id,
    chapter: t.chapter,
    road: Number(t.regular.slice('road:'.length)),
    title: t.title,
    lines: t.lines.map((l) => ({ ...l, hebrew: latinToHebrew(l.latin) })),
  };
});

/** The tales you've earned: those of the regulars whose trials you've passed, in road order. */
export const talesEarned = (trials: readonly number[]): Tale[] =>
  TALES.filter((t) => trials.includes(t.road)).sort((a, b) => a.road - b.road);

/** A regular's tale, if they have one. */
export const taleOf = (road: number): Tale | undefined => TALES.find((t) => t.road === road);
