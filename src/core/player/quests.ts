// Today's quests on the Notice Board (#26). Each subject names its own line (ADR 0019); the
// platform adds the daily contract. Subject lines carry no reward until quests are real (E10,
// #46), so the board never promises what nothing pays (2026-11-04 review).
import { PLACE_PATHS } from '../city/layout.ts';
import type { SubjectInfo, SubjectQuest } from '../subject.ts';

export interface Quest extends SubjectQuest {
  /** Who gives the quest, shown in capitals above it. */
  giver: string;
  /** What it pays, if anything. */
  reward?: string;
  /** Where to go for it. */
  href: string;
  /** CSS colour of its guild. */
  color: string;
}

export function todaysQuests(subjects: readonly SubjectInfo[], goalMinutes: number): Quest[] {
  const fromSubjects = subjects.flatMap((s) =>
    s.quest && s.building
      ? [{ ...s.quest, giver: s.place, href: PLACE_PATHS[s.building], color: s.guildColor }]
      : [],
  );
  return [
    ...fromSubjects,
    {
      giver: 'Daily contract',
      text: `Practise ${goalMinutes} minutes today`,
      reward: 'The daily chest',
      href: '/notice-board',
      color: '#e8a93a',
    },
  ];
}
