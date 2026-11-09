// Today's quests on the Notice Board (#26). Each subject names its own line (ADR 0019); the
// platform adds the daily contract. Subject lines carry no reward until quests are real (E10,
// #46), so the board never promises what nothing pays (2026-11-04 review). Once a subject's
// questline is started, its line tracks it instead (ADR 0032, #47).
import { PLACE_PATHS } from '../city/layout.ts';
import type { QuestlineStatus, SubjectInfo, SubjectQuest } from '../subject.ts';
import type { Questlines } from './questlines.ts';

export interface Quest extends SubjectQuest {
  /** Who gives the quest, shown in capitals above it. */
  giver: string;
  /** How far along it is, e.g. "6/8 lamps · Trial: The Gatekeeper". */
  progress?: string;
  /** What it pays, if anything. */
  reward?: string;
  /** Where to go for it. */
  href: string;
  /** CSS colour of its guild. */
  color: string;
}

/** A started questline's line: its name and chapter, then the steps done and what's next. */
const tracked = (q: QuestlineStatus): SubjectQuest & { progress: string } => ({
  text: `${q.questline} ${q.chapter}`,
  progress: [`${q.done}/${q.total} ${q.unit}`, q.next].filter(Boolean).join(' · '),
});

export function todaysQuests(
  subjects: readonly SubjectInfo[],
  goalMinutes: number,
  questlines: Questlines = new Map(),
): Quest[] {
  const fromSubjects = subjects.flatMap((s) => {
    const status = questlines.get(s.id);
    const line = status ? tracked(status) : s.quest;
    return line && s.building
      ? [{ ...line, giver: s.place, href: PLACE_PATHS[s.building], color: s.guildColor }]
      : [];
  });
  return [
    ...fromSubjects,
    {
      giver: 'Daily contract',
      text: `Practice ${goalMinutes} minutes today`,
      reward: 'The daily chest',
      href: '/notice-board',
      color: '#e8a93a',
    },
  ];
}
