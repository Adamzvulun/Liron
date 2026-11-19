// Fellowship quests and gifts (task 3.5, #330; ADR 0045). The database counts, pays and gives
// (migration 20270102000000_fellowship_quests_and_gifts.sql); this file reads what it says and
// makes the words.

import type { SupabaseClient } from '@supabase/supabase-js';

/** This week's quest for you and your friends together. */
export interface FellowshipQuest {
  id: string;
  metric: 'minutes' | 'event';
  target: number;
  gold: number;
  /** The week's Monday. */
  week: string;
  /** Everyone's part together, yours included. */
  total: number;
  mine: number;
  collected: boolean;
}

/** A gift someone sent you. */
export interface Gift {
  id: number;
  from: string;
  name: string;
  item: string;
  day: string;
}

export type TogetherProblem =
  | 'not-friends'
  | 'not-for-sale'
  | 'owned'
  | 'gold'
  | 'daily-limit'
  | 'not-done'
  | 'not-helped'
  | 'collected'
  | 'failed';

export class TogetherError extends Error {
  constructor(readonly problem: TogetherProblem) {
    super(`Fellowship: ${problem}`);
    this.name = 'TogetherError';
  }
}

export interface TogetherSource {
  /** Null for a player with no friend. */
  quest(): Promise<FellowshipQuest | null>;
  /** Pays this week's quest; resolves to your gold after. */
  collect(): Promise<number>;
  /** Gives a friend one of today's wares; resolves to your gold after. */
  give(friendId: string, item: string): Promise<number>;
  gifts(): Promise<Gift[]>;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function readQuest(raw: unknown): FellowshipQuest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || (r.metric !== 'minutes' && r.metric !== 'event')) return null;
  return {
    id: r.id,
    metric: r.metric,
    target: Math.max(1, num(r.target)),
    gold: num(r.gold),
    week: typeof r.week === 'string' && DAY.test(r.week) ? r.week : '',
    total: num(r.total),
    mine: num(r.mine),
    collected: r.collected === true,
  };
}

export function readGift(raw: unknown): Gift | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'number' || typeof r.from !== 'string' || typeof r.item !== 'string') {
    return null;
  }
  const name = typeof r.name === 'string' ? r.name.slice(0, 40).trim() : '';
  const day = typeof r.day === 'string' && DAY.test(r.day) ? r.day : '';
  return { id: r.id, from: r.from, name: name || 'A traveler', item: r.item, day };
}

/** What each quest asks, in words; a quest the app doesn't know yet still reads sensibly. */
const QUEST_LINES: Record<string, (target: number) => string> = {
  'together-minutes': (t) => `Learn for ${t} minutes between you`,
  'together-hours': (t) => `Learn for ${t / 60} hours between you`,
  'inn-talk': (t) => `Have ${t} chats at the inn between you`,
  'rush-rounds': (t) => `Finish ${t} callsign rushes between you`,
};

export function questLine(q: Pick<FellowshipQuest, 'id' | 'metric' | 'target'>): string {
  const line = QUEST_LINES[q.id];
  if (line) return line(q.target);
  return q.metric === 'minutes'
    ? `Learn for ${q.target} minutes between you`
    : `Reach ${q.target} together`;
}

/** The unit for "12 of 300 …". */
export const questUnit = (q: Pick<FellowshipQuest, 'metric'>) =>
  q.metric === 'minutes' ? 'minutes' : 'done';

const PROBLEMS: readonly TogetherProblem[] = [
  'not-friends',
  'not-for-sale',
  'owned',
  'gold',
  'daily-limit',
  'not-done',
  'not-helped',
  'collected',
];

export function supabaseTogether(client: SupabaseClient): TogetherSource {
  const call = async (fn: string, args?: Record<string, unknown>) => {
    const { data, error } = await client.rpc(fn, args);
    if (error) {
      const hint = (error as { hint?: string }).hint;
      throw new TogetherError(PROBLEMS.find((p) => p === hint) ?? 'failed');
    }
    return data as unknown;
  };
  /** The purse a call left: an odd answer is a failure, not a purse of 0 (review, 2026-11-19). */
  const purse = (v: unknown) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new TogetherError('failed');
    return v;
  };
  return {
    quest: async () => readQuest(await call('fellowship_quest')),
    collect: async () => purse(await call('collect_fellowship_quest')),
    give: async (friendId, item) =>
      purse(await call('give_item', { p_friend: friendId, p_item: item })),
    gifts: async () => {
      const raw = await call('my_gifts');
      return Array.isArray(raw) ? raw.map(readGift).filter((g): g is Gift => g !== null) : [];
    },
  };
}

/** What to say when a gift couldn't be given. */
export function giftProblem(e: unknown, friend: string): string {
  const p = e instanceof TogetherError ? e.problem : 'failed';
  switch (p) {
    case 'owned':
      return `${friend} already has it.`;
    case 'gold':
      return 'Not enough gold yet.';
    case 'daily-limit':
      return 'That’s three gifts today. More tomorrow.';
    case 'not-for-sale':
      return 'That’s gone; the stall has new wares today.';
    case 'not-friends':
      return `${friend} isn’t in your Fellowship any more.`;
    default:
      return 'The gift couldn’t be sent. Try again in a moment.';
  }
}
