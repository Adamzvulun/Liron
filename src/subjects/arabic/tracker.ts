// The Caravanserai's line in the questline tracker (ADR 0032, #47): where The Long Road In
// stands, from the saved Arabic state. Loaded lazily by index.ts, so the square stays small.
import type { QuestlineStatus } from '../../core/subject.ts';
import { parseProgress } from './progress.ts';
import { questStatus, regularStatus } from './questline.ts';
import { arabicStanding } from './ranks.ts';

export function questlineStatus(state: unknown): QuestlineStatus | null {
  if (state === null || state === undefined) return null;
  const progress = parseProgress(state);
  const quest = questStatus(progress);
  const { chapter } = quest;
  // After the Painted Sign: the regular at the innkeeper's table (#161).
  const road = quest.guest ? regularStatus(progress) : undefined;
  if (road) {
    const r = road.regular;
    const next = road.trialReady
      ? `Trial: ${r.trial.name}`
      : road.passed
        ? `${r.who} keeps a place at the table`
        : undefined;
    return {
      questline: chapter.questline,
      chapter: `Chapter ${r.number}: ${r.title}`,
      done: road.lit,
      total: r.milestones.length,
      unit: 'milestones',
      ...(next && { next }),
    };
  }
  const next = quest.trialReady
    ? `Trial: ${chapter.trial.name}`
    : progress.guest
      ? `${arabicStanding(progress).rank.name} of the house`
      : undefined;
  return {
    questline: chapter.questline,
    chapter: `Chapter ${chapter.number}: ${chapter.title}`,
    done: quest.lit,
    total: chapter.lessons,
    unit: 'milestones',
    ...(next && { next }),
  };
}
