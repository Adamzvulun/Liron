// The ledger in Your House (docs/game/ledger.md): what you've learned, from data already saved.
// Every number here is defined in that doc, and tested against it in ledger.test.ts.
import type { CardSummary, MilestoneRow } from '../progress/store.ts';
import { addDays } from '../progress/economy.ts';
import type { SubjectInfo } from '../subject.ts';

/** A card is known when FSRS waits this many days or more before asking it again. */
export const KNOWN_DAYS = 21;

/** What the platform hands a subject to fill its block of the ledger. */
export interface LedgerLook {
  /** Every card of the subject. */
  cards: readonly CardSummary[];
  /** The item of each review in the last 7 days, one entry per review. */
  week: readonly string[];
  /** Reviews due now, the compass's number. */
  due: number;
}

export interface LedgerRow {
  label: string;
  value: string;
}

/** A subject's block: its lines, and one sentence on the week. */
export interface LedgerAnswer {
  rows: LedgerRow[];
  trend: string;
}

const matching = (prefix: string) => (id: string) => id.startsWith(prefix);

/** Cards whose id starts with `prefix` that are known. */
export function knownCount(cards: readonly CardSummary[], prefix: string): number {
  const is = matching(prefix);
  return cards.filter((c) => is(c.itemId) && c.interval >= KNOWN_DAYS).length;
}

/**
 * This week's reviews of items starting with `prefix`, and how many of those items were met
 * this week: every review a card has had falls in the week.
 */
export function weekOf(look: LedgerLook, prefix: string): { reviews: number; met: number } {
  const is = matching(prefix);
  const perItem = new Map<string, number>();
  for (const id of look.week) if (is(id)) perItem.set(id, (perItem.get(id) ?? 0) + 1);
  let reviews = 0;
  for (const n of perItem.values()) reviews += n;
  const met = look.cards.filter((c) => {
    const n = perItem.get(c.itemId);
    return n !== undefined && c.reps > 0 && c.reps <= n;
  }).length;
  return { reviews, met };
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "This week: 12 new words met, 40 reviews." */
export function trendLine(
  week: { reviews: number; met: number },
  noun: { one: string; many: string },
): string {
  if (week.reviews === 0) return 'No reviews this week yet.';
  const met = week.met > 0 ? `${count(week.met, `new ${noun.one}`, `new ${noun.many}`)} met, ` : '';
  return `This week: ${met}${count(week.reviews, 'review', 'reviews')}.`;
}

/** "3 of 28". */
export const outOf = (n: number, all: number) => `${n} of ${all}`;

export interface Habit {
  /** Days with any minutes among the last 30, today included. */
  days30: number;
  /** Minutes over the last 7 days, today included. */
  weekMinutes: number;
  /** The most days in a row with any minutes, ever. */
  longestRun: number;
}

/** The habit lines from each day's minutes (days as YYYY-MM-DD, the player's local day). */
export function habitOf(
  activity: readonly { day: string; minutes: number }[],
  today: string,
): Habit {
  const practiced = new Map(activity.filter((a) => a.minutes > 0).map((a) => [a.day, a.minutes]));
  const from30 = addDays(today, -29);
  const from7 = addDays(today, -6);
  let days30 = 0;
  let weekMinutes = 0;
  for (const [day, minutes] of practiced) {
    if (day > today) continue;
    if (day >= from30) days30++;
    if (day >= from7) weekMinutes += minutes;
  }
  let longestRun = 0;
  for (const day of practiced.keys()) {
    if (practiced.has(addDays(day, -1))) continue;
    let run = 1;
    while (practiced.has(addDays(day, run))) run++;
    longestRun = Math.max(longestRun, run);
  }
  return { days30, weekMinutes, longestRun };
}

/** The habit as the ledger shows it. */
export function habitRows(h: Habit): LedgerRow[] {
  return [
    { label: 'Days practiced, last 30', value: outOf(h.days30, 30) },
    { label: 'Minutes this week', value: String(h.weekMinutes) },
    { label: 'Longest run of days', value: count(h.longestRun, 'day', 'days') },
  ];
}

/** Where the ledger reads from: the store, through the platform. */
export interface LedgerSources {
  loadState(subjectId: string): Promise<unknown>;
  due(subjectId: string): Promise<number>;
  cards(subjectId: string): Promise<readonly CardSummary[]>;
  reviewsSince(subjectId: string, since: Date): Promise<readonly string[]>;
  activity(): Promise<readonly { day: string; minutes: number }[]>;
  /** Every saved milestone check (docs/game/milestone-check.md). */
  milestones?(): Promise<readonly MilestoneRow[]>;
}

export interface LedgerBlock {
  subject: string;
  place: string;
  color: string;
  /** null when this subject's numbers couldn't be read. */
  answer: LedgerAnswer | null;
}

export interface Ledger {
  /** null when the days couldn't be read. */
  habit: Habit | null;
  blocks: LedgerBlock[];
  /** null when the milestone checks couldn't be read. */
  checks: readonly MilestoneRow[] | null;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Reads the whole ledger; a part that fails is null, and the rest still shows. */
export async function loadLedger(
  subjects: readonly SubjectInfo[],
  sources: LedgerSources,
  today: string,
  now = new Date(),
): Promise<Ledger> {
  const since = new Date(now.getTime() - WEEK_MS);
  const block = async (s: SubjectInfo & { ledger: NonNullable<SubjectInfo['ledger']> }) => {
    try {
      const [state, due, cards, week] = await Promise.all([
        sources.loadState(s.id),
        sources.due(s.id),
        sources.cards(s.id),
        sources.reviewsSince(s.id, since),
      ]);
      return await s.ledger(state, { cards, week, due });
    } catch {
      return null;
    }
  };
  const [habit, checks, blocks] = await Promise.all([
    sources.activity().then(
      (a) => habitOf(a, today),
      () => null,
    ),
    (sources.milestones?.() ?? Promise.resolve([])).catch(() => null),
    Promise.all(
      subjects.flatMap((s) =>
        s.ledger
          ? [
              block({ ...s, ledger: s.ledger }).then((answer) => ({
                subject: s.id,
                place: s.place,
                color: s.guildColor,
                answer,
              })),
            ]
          : [],
      ),
    ),
  ]);
  return { habit, blocks, checks };
}
