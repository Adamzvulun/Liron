// Today's quests on the Notice Board (#26). Each subject names its own line (ADR 0019); the
// platform adds the daily contract. Subject lines carry no reward until quests are real (E10,
// #46), so the board never promises what nothing pays (2026-11-04 review). Once a subject's
// questline is started, its line tracks it instead (ADR 0032, #47). Below them come today's
// contracts (#46): each on the Notice Board, one summary line in the HUD.
import { PLACE_PATHS } from '../city/layout.ts';
import type { TodaysContracts } from '../progress/store.ts';
import type { QuestlineStatus, SubjectInfo, SubjectQuest } from '../subject.ts';
import type { Questlines } from './questlines.ts';

export interface Quest extends SubjectQuest {
  /** Unique in the list (defaults to the giver). */
  key?: string;
  /** Finished and paid: the board stamps it. */
  done?: boolean;
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
      giver: 'Daily goal',
      text: `Practice ${goalMinutes} minutes today`,
      reward: 'The daily chest',
      href: '/notice-board',
      color: '#e8a93a',
    },
  ];
}

const BOARD_COLOR = '#e8a93a';

/** Said when a streak shield covered the days just missed (ADR 0034), or null. */
export function shieldNote(today: { streak: number; shieldedDays: number }): string | null {
  if (!today.shieldedDays) return null;
  const days = `${today.streak}-day streak`;
  return today.shieldedDays === 1
    ? `A streak shield saved your ${days}`
    : `${today.shieldedDays} streak shields saved your ${days}`;
}

/**
 * Today's contracts (ADR 0032): one line each on the Notice Board (`full`), or one line in the
 * HUD saying how many are done and what's left to earn.
 */
export function contractQuests(
  subjects: readonly SubjectInfo[],
  today: TodaysContracts | null,
  full: boolean,
): Quest[] {
  const contracts = today?.contracts ?? [];
  if (!contracts.length) return [];
  if (!full) {
    const done = contracts.filter((c) => c.paid).length;
    const left = contracts.filter((c) => !c.paid).reduce((sum, c) => sum + c.gold, 0);
    return [
      {
        giver: 'Contracts',
        text: `${done} of ${contracts.length} done today`,
        reward: left ? `${left} gold left to earn` : 'All paid',
        href: '/notice-board',
        color: BOARD_COLOR,
        done: left === 0,
      },
    ];
  }
  return contracts.map((c) => {
    const subject = subjects.find((s) => s.id === c.subject);
    return {
      key: c.id,
      giver: subject ? `${subject.place} contract` : 'Habit contract',
      text: c.text,
      progress: c.paid ? 'Done' : `${c.progress}/${c.target}`,
      reward: `${c.gold} gold`,
      href: subject?.building ? PLACE_PATHS[subject.building] : '/notice-board',
      color: subject?.guildColor ?? BOARD_COLOR,
      done: c.paid,
    };
  });
}

/** The HUD's line for chests waiting to be opened (ADR 0033), if any. */
export function chestQuests(waiting: number): Quest[] {
  if (!waiting) return [];
  return [
    {
      giver: 'Chests',
      text: `${waiting} to open`,
      reward: 'On the Notice Board',
      href: '/notice-board',
      color: BOARD_COLOR,
    },
  ];
}
