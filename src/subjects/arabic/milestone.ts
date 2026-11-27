// Arabic's part of the milestone check: its six statements, and a probe of Read words from the
// chapters you've passed. Hear it sentences join the probe once there are any (hear.ts has none
// yet: the deck isn't here), so today it is Read words alone.
import { lazy } from 'react';
import pack from '../../../content/arabic/milestone.json' with { type: 'json' };
import type { MilestoneKit } from '../../core/subject.ts';
import { shuffle, type CoreWord } from './core/coreWords.ts';
import type { ArabicProgress } from './progress.ts';

export const PROBE_WORDS = 6;

export const kit: MilestoneKit = {
  statements: (pack.items[0]?.data as { statements: string[] }).statements,
  Probe: lazy(() => import('./MilestoneProbe.tsx').then((m) => ({ default: m.MilestoneProbe }))),
};

/** Up to six words, at random, from the chapters passed (all of them once the path is done). */
export function probeWords(
  chapters: readonly (readonly CoreWord[])[],
  progress: ArabicProgress,
  rand: () => number,
): CoreWord[] {
  const passed = progress.words.done ? chapters.length : progress.words.chapter - 1;
  return shuffle(chapters.slice(0, passed).flat(), rand).slice(0, PROBE_WORDS);
}
