// "The Long Road In", the Caravanserai's main questline (#43, discovery 04): chapter I has one
// milestone per script lesson and ends with a trial, the Painted Sign, that makes you ضيف
// (Guest). The text is content data in content/arabic/questline.json.
import { z } from 'zod';
import questline from '../../../content/arabic/questline.json' with { type: 'json' };
import type { ArabicProgress } from './progress.ts';
import { WORD_CHAPTERS } from './core/coreWords.ts';

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

const Regular = z.object({
  number: z.number().int().min(2),
  /** The word chapter this regular comes with. */
  wordChapter: z.number().int().positive(),
  title: z.string(),
  who: z.string(),
  intro: z.string(),
  /** Beats at 10, 20 and 30 of the chapter's words met. */
  milestones: z.array(z.string()).length(3),
  trial: Trial,
  outro: z.string(),
});
export type Regular = z.infer<typeof Regular>;

/** Chapters II onward (#161, #205): a regular for each word chapter, in order. */
export const REGULARS: readonly Regular[] = items
  .filter((i) => i.type === 'regular')
  .map((i) => Regular.parse(i.data))
  .sort((a, b) => a.number - b.number);

const NUMERALS: [number, string][] = [
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];
/** A chapter's number as the road writes it: II, XI, XXXV (1–89). */
export function roman(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 89) return String(n);
  let out = '';
  for (const [value, numeral] of NUMERALS) {
    while (n >= value) {
      out += numeral;
      n -= value;
    }
  }
  return out;
}

/** Words met per milestone on a regular's chapter. */
export const WORDS_PER_MILESTONE = 10;

/**
 * Where the regulars stand (#161), for a guest: the first regular whose trial you haven't
 * passed, among the word chapters you've reached. Milestones light as you meet the chapter's
 * words; the trial opens once the chapter itself is passed.
 */
export function regularStatus(p: ArabicProgress) {
  const w = p.words;
  const reached = w.done ? WORD_CHAPTERS.length : w.chapter;
  const open = REGULARS.filter((r) => r.wordChapter <= reached);
  const regular =
    open.find((r) => !w.trials.includes(r.number)) ?? open[open.length - 1] ?? REGULARS[0];
  if (!regular) return undefined;
  const met = new Set(w.met);
  const words = WORD_CHAPTERS[regular.wordChapter - 1]?.words ?? [];
  const lit = Math.min(
    Math.floor(words.filter((x) => met.has(x.deck)).length / WORDS_PER_MILESTONE),
    regular.milestones.length,
  );
  const passed = w.trials.includes(regular.number);
  const chapterPassed = w.done || w.chapter > regular.wordChapter;
  return {
    regular,
    lit,
    beat: passed ? regular.outro : lit > 0 ? regular.milestones[lit - 1] : regular.intro,
    trialReady: chapterPassed && !passed,
    chapterPassed,
    passed,
  };
}

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
