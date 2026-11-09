// The Caravanserai's line in the questline tracker (ADR 0032, #47): where The Long Road In
// stands, from the saved Arabic state. Loaded lazily by index.ts, so the square stays small.
import type { QuestlineStatus } from '../../core/subject.ts';
import { parseProgress } from './progress.ts';
import { questStatus, rankOf } from './questline.ts';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export function questlineStatus(state: unknown): QuestlineStatus | null {
  if (state === null || state === undefined) return null;
  const progress = parseProgress(state);
  const quest = questStatus(progress);
  const { chapter } = quest;
  const next = quest.trialReady
    ? `Trial: ${chapter.trial.name}`
    : progress.guest
      ? `${rankOf(progress).english} of the house`
      : undefined;
  return {
    questline: chapter.questline,
    chapter: `${ROMAN[chapter.number - 1] ?? chapter.number}: ${chapter.title}`,
    done: quest.lit,
    total: chapter.lessons,
    unit: 'milestones',
    ...(next && { next }),
  };
}
