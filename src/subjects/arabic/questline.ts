// "The Long Road In", the Caravanserai's main questline (#43, discovery 04): chapter I has one
// milestone per script lesson and ends with a trial, the Painted Sign, that makes you ضيف
// (Guest). The text is content data in content/arabic/questline.json.
import { z } from 'zod';
import questline from '../../../content/arabic/questline.json';
import type { ArabicProgress } from './progress.ts';

const Trial = z.object({
  name: z.string(),
  text: z.string(),
  words: z.number().int().positive(),
  accuracy: z.number().min(0).max(1),
  xp: z.number().int().positive(),
});

const Chapter = z.object({
  questline: z.string(),
  number: z.number().int().positive(),
  title: z.string(),
  lessons: z.number().int().positive(),
  intro: z.string(),
  trial: Trial,
  outro: z.string(),
});

const Milestone = z.object({ lesson: z.number().int().positive(), text: z.string() });

export type Chapter = z.infer<typeof Chapter> & { milestones: string[] };

const items = questline.items as { id: string; type: string; data: unknown }[];

/** Chapter I, with each milestone's story beat by lesson (index 0 is lesson 1). */
export const CHAPTER: Chapter = (() => {
  const head = items.find((i) => i.type === 'chapter');
  const chapter = Chapter.parse(head?.data);
  const beats = items
    .filter((i) => i.type === 'milestone')
    .map((i) => Milestone.parse(i.data))
    .sort((a, b) => a.lesson - b.lesson)
    .map((m) => m.text);
  return { ...chapter, milestones: beats };
})();

/** Lessons passed so far: every lesson before the current one, or all of them when done. */
export const lessonsPassed = (p: ArabicProgress) => (p.done ? CHAPTER.lessons : p.lesson - 1);

/** Where the learner stands on the road: milestones lit, the newest beat, the trial. */
export function questStatus(p: ArabicProgress) {
  const lit = Math.min(lessonsPassed(p), CHAPTER.lessons);
  return {
    chapter: CHAPTER,
    lit,
    beat: lit > 0 ? CHAPTER.milestones[lit - 1] : undefined,
    /** Every milestone lit and not yet a guest: the Painted Sign is next. */
    trialReady: lit >= CHAPTER.lessons && !p.guest,
    guest: p.guest,
  };
}

/** The house's ranks for a traveller: a stranger until the Painted Sign, then a guest. */
export function rankOf(p: ArabicProgress) {
  return p.guest
    ? { arabic: 'ضيف', english: 'Guest', next: 'Regular (the coffee corner, coming soon)' }
    : { arabic: 'غريب', english: 'Stranger', next: 'Guest: read the Painted Sign' };
}
