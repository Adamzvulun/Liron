// The coffee corner's survival phrases (#45): small sets of the deck's own phrases, picked for
// a first week of daily life (content/arabic/phrases.json lists the deck ids only; the phrases
// themselves stay private, ADR 0011). Each phrase carries its recording, its Arabic, the deck's
// Latin, the Hebrew bridge made from that Latin, and its meaning.
import { z } from 'zod';
import type { Item } from '../../../core/content/schema.ts';
import pack from '../../../../content/arabic/phrases.json';
import { dropGroups, latinToHebrew } from './hebrew.ts';

const PhraseSet = z.object({
  order: z.number().int().positive(),
  title: z.string(),
  intro: z.string(),
  items: z.array(z.string()).min(4),
});
export type PhraseSet = z.infer<typeof PhraseSet>;

export const PHRASE_SETS: readonly PhraseSet[] = pack.items
  .map((i) => PhraseSet.parse(i.data))
  .sort((a, b) => a.order - b.order);

/** A set is passed when you understand this share of its phrases in one session. */
export const SET_PASS = 0.9;

export interface Phrase {
  /** The deck item, e.g. `pcav:4757`; spaced repetition points at it. */
  id: string;
  arabic: string;
  latin: string;
  hebrew: string;
  meaning: string;
  audio: string;
}

/** Deck notes that don't belong in a phrase: blanks for a noun, "(plural)" forms, "[m.]". */
// A construct form with a blank, "تلاتة (تلات __)", is dropped: a phrase shows its counting form.
const tidy = (s: string) =>
  dropGroups(s, (g) => !g.includes('_'))
    .replace(/_+\s*/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** A set's phrases from the deck's items, in the set's order; missing ones are left out. */
export function phrasesOf(set: PhraseSet, items: readonly Item[]): Phrase[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return set.items.flatMap((id) => {
    const item = byId.get(id);
    const d = item?.data as { arabic?: unknown; pronunciation?: unknown; english?: unknown };
    const audio = item?.media.find((m) => m.kind === 'audio')?.path;
    if (!item || !audio || typeof d.arabic !== 'string') return [];
    const latin = tidy(typeof d.pronunciation === 'string' ? d.pronunciation : '');
    return [
      {
        id,
        arabic: tidy(d.arabic),
        latin,
        hebrew: latinToHebrew(latin),
        meaning: tidy(typeof d.english === 'string' ? d.english : '').replace(/;\s*/g, ' / '),
        audio,
      },
    ];
  });
}

/** Hear a phrase, pick its meaning: the other choices are other phrases' meanings. */
export interface UnderstandQuestion {
  phrase: Phrase;
  choices: string[];
}

export function understandQuestions(
  phrases: readonly Phrase[],
  pool: readonly Phrase[],
  rand: () => number,
): UnderstandQuestion[] {
  const shuffle = <T>(a: readonly T[]) =>
    a
      .map((x) => [rand(), x] as const)
      .sort((x, y) => x[0] - y[0])
      .map(([, x]) => x);
  return shuffle(phrases).map((phrase) => {
    const others = [...new Set(pool.map((p) => p.meaning))].filter(
      (m) => m && m !== phrase.meaning,
    );
    return { phrase, choices: shuffle([phrase.meaning, ...shuffle(others).slice(0, 3)]) };
  });
}
