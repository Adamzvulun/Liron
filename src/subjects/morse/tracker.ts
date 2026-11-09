// The Signal Tower's line in the questline tracker (ADR 0032, #47): where The Silent Beacon
// stands, from the saved Morse state. Loaded lazily by index.ts, so the square stays small.
import type { QuestlineStatus } from '../../core/subject.ts';
import { parseProgress, pendingTrial, unlockedChars } from './lesson/progress.ts';
import { questStatus, roman } from './questline.ts';

export function questlineStatus(state: unknown): QuestlineStatus | null {
  if (state === null || state === undefined) return null;
  const progress = parseProgress(state);
  const quest = questStatus(unlockedChars(progress));
  if (!quest) return null;
  const { chapter } = quest;
  const trial = pendingTrial(progress);
  return {
    questline: chapter.questline,
    chapter: `${roman(chapter.number)}: ${chapter.title}`,
    done: quest.lit.length,
    total: chapter.letters.length,
    unit: 'lamps',
    ...(trial && { next: `Trial: ${trial.trial.name}` }),
    // The whole questline done: the last chapter's trial is passed.
    ...(progress.trials.includes(chapter.number) && { next: 'Trial passed' }),
  };
}
