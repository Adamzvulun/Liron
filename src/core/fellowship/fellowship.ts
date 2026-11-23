// The Fellowship (task 3.1, #326; docs/game/fellowship-build.md): friend codes, requests and
// friends' cards. Everything comes from the database's functions, which return only the
// fields of fellowship.md §3; this file reads them as another person's input, never trusting
// a shape or a string.

import type { SupabaseClient } from '@supabase/supabase-js';
import { ACHIEVEMENTS } from '../achievements/achievements.ts';
import { parseOthersLook, type Look } from '../avatar/looks.ts';
import { noteById, noteLine } from '../home/notes.ts';

/** What a friend sees of you, and you of them (fellowship.md §3). */
export interface FriendCard {
  id: string;
  /** Your own card. */
  me: boolean;
  name: string;
  look: Look;
  title: string;
  level: number;
  streak: number;
  /** `subject:rank-id`, from the rank events. */
  ranks: string[];
  /** Achievement ids. */
  achievements: string[];
  /** How many different things their room has ever held (task 8.2); 0 for an older database. */
  cozy: number;
}

export interface FriendRequest {
  id: string;
  name: string;
  look: Look;
}

/** Why a Fellowship action didn't happen. */
export type FellowshipProblem = 'daily-limit' | 'waiting' | 'full' | 'failed';

export class FellowshipError extends Error {
  constructor(readonly problem: FellowshipProblem) {
    super(`Fellowship: ${problem}`);
    this.name = 'FellowshipError';
  }
}

export interface FellowshipSource {
  /** Your friend code, made the first time. */
  code(): Promise<string>;
  /** A new code; the old one stops working. */
  newCode(): Promise<string>;
  /** Sends a request to a code's owner. Says nothing about whether the code was real. */
  ask(code: string): Promise<void>;
  answer(id: string, accept: boolean): Promise<void>;
  /** Ends a friendship, from either side. */
  remove(id: string): Promise<void>;
  /** Your card first, then your friends'. */
  cards(): Promise<FriendCard[]>;
  /** Requests waiting for your answer. */
  requests(): Promise<FriendRequest[]>;
  /** The party feed: your friends' milestones and yours, newest first (task 3.3). */
  feed(): Promise<Milestone[]>;
  /** Whether your own milestones go to the feed. */
  sharing(): Promise<boolean>;
  setSharing(on: boolean): Promise<void>;
  /** A friend's room as saved (task 7.3), raw: read it with `parseLayout`. Null for a stranger. */
  home(id: string): Promise<unknown>;
  /** Leaves today's note at a friend's letterbox (task 8.1), replacing one from earlier today. */
  leaveNote(id: string, note: string): Promise<void>;
  /** The note you left a friend today, if any. */
  noteFor(id: string): Promise<string | null>;
  /** The notes at your letterbox from friends, newest first. */
  notes(): Promise<LetterNote[]>;
}

/** A note a friend left at your letterbox (task 8.1): who, which note from the set, the day. */
export interface LetterNote {
  id: number;
  from: string;
  name: string;
  note: string;
  day: string;
}

/** One line of the party feed, as codes; the words are made by `milestoneLine`. */
export interface Milestone {
  id: number;
  who: string;
  name: string;
  me: boolean;
  /** `visit` is a friend who left a note at your letterbox; only you see it (task 8.1). */
  kind: 'rank' | 'trial' | 'achievement' | 'streak' | 'visit';
  detail: string;
  /** The day only, never the time (fellowship-build.md §4). */
  day: string;
}

const text = (v: unknown, max = 40) => (typeof v === 'string' ? v.slice(0, max) : '');
const count = (v: unknown) =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 ? Math.min(v, 100_000) : 0;
const ids = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 200) : [];
const UUID = /^[0-9a-f-]{36}$/i;

/** A card from the database, or null if it isn't one. */
export function readCard(raw: unknown): FriendCard | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !UUID.test(r.id)) return null;
  return {
    id: r.id,
    me: r.me === true,
    name: text(r.name).trim() || 'A traveler',
    look: parseOthersLook(r.look),
    title: text(r.title),
    level: Math.max(1, count(r.level)),
    streak: count(r.streak),
    ranks: ids(r.ranks),
    achievements: ids(r.achievements),
    cozy: count(r.cozy),
  };
}

export function readRequest(raw: unknown): FriendRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !UUID.test(r.id)) return null;
  return { id: r.id, name: text(r.name).trim() || 'A traveler', look: parseOthersLook(r.look) };
}

const list = <T>(raw: unknown, read: (x: unknown) => T | null): T[] =>
  Array.isArray(raw) ? raw.map(read).filter((x): x is T => x !== null) : [];

/** A code as people say it: `abcd-efgh` and `ABCD EFGH` are the same code. */
export const tidyCode = (code: string) => code.toUpperCase().replace(/[\s-]/g, '');

/** A code shown in two halves, easier to read aloud. */
export const showCode = (code: string) =>
  code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

/** A rank's name from its id: `morse:rank-listener` is "Listener". */
export function rankName(rank: string): string {
  const id =
    rank
      .split(':')
      .pop()
      ?.replace(/^rank-/, '') ?? '';
  const words = id.split('-').filter(Boolean).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The Fellowship through Supabase's functions. */
export function supabaseFellowship(client: SupabaseClient): FellowshipSource {
  const call = async (fn: string, args?: Record<string, unknown>) => {
    const { data, error } = await client.rpc(fn, args);
    if (error) {
      const hint = (error as { hint?: string }).hint;
      throw new FellowshipError(
        hint === 'daily-limit' || hint === 'waiting' || hint === 'full' ? hint : 'failed',
      );
    }
    return data as unknown;
  };
  return {
    code: async () => text(await call('my_friend_code'), 8),
    newCode: async () => text(await call('new_friend_code'), 8),
    ask: async (code) => void (await call('ask_friend', { p_code: tidyCode(code) })),
    answer: async (id, accept) =>
      void (await call('answer_friend', { p_other: id, p_accept: accept })),
    remove: async (id) => void (await call('remove_friend', { p_other: id })),
    cards: async () => list(await call('fellowship'), readCard),
    requests: async () => list(await call('fellowship_requests'), readRequest),
    home: (id) => call('home_of', { p_friend: id }),
    leaveNote: async (id, note) => void (await call('leave_note', { p_friend: id, p_note: note })),
    noteFor: async (id) => {
      const raw = await call('my_note_for', { p_friend: id });
      return typeof raw === 'string' && noteById(raw) ? raw : null;
    },
    notes: async () => list(await call('my_notes'), readNote),
    feed: async () => list(await call('fellowship_feed'), readMilestone),
    sharing: async () => {
      const { data, error } = await client
        .from('profiles')
        .select('share_milestones')
        .maybeSingle<{ share_milestones: boolean }>();
      if (error) throw new FellowshipError('failed');
      return data?.share_milestones !== false;
    },
    setSharing: async (on) => {
      const { data } = await client.auth.getSession();
      const id = data.session?.user.id;
      if (!id) throw new FellowshipError('failed');
      const { error } = await client.from('profiles').update({ share_milestones: on }).eq('id', id);
      if (error) throw new FellowshipError('failed');
    },
  };
}

/** A note at your letterbox from the database, or null if it isn't one we know. */
export function readNote(raw: unknown): LetterNote | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'number' || !Number.isSafeInteger(r.id) || r.id < 1) return null;
  if (typeof r.from !== 'string' || !UUID.test(r.from)) return null;
  if (typeof r.note !== 'string' || !noteById(r.note)) return null;
  if (typeof r.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.day)) return null;
  return {
    id: r.id,
    from: r.from,
    name: text(r.name).trim() || 'A traveler',
    note: r.note,
    day: r.day,
  };
}

/** Where to visit a friend's house (task 3.2). */
export const visitPath = (id: string) => `/house/visit/${id}`;

/** A friend's achievements by name, in the wall's order (task 3.2). */
export const achievementNames = (ids: readonly string[]) =>
  ACHIEVEMENTS.filter((a) => ids.includes(a.id)).map((a) => a.name);

const KINDS = ['rank', 'trial', 'achievement', 'streak', 'visit'] as const;

export function readMilestone(raw: unknown): Milestone | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const kind = KINDS.find((k) => k === r.kind);
  if (!kind || typeof r.who !== 'string' || typeof r.detail !== 'string') return null;
  if (typeof r.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.day)) return null;
  // The feed's ids count every milestone of every player: not capped like a count, since the
  // feed's lines are keyed by them (review, 2026-11-19). A note's row has a negative id (task
  // 8.1), so the two never meet.
  if (typeof r.id !== 'number' || !Number.isSafeInteger(r.id)) return null;
  if (kind === 'visit' ? r.id > -1 : r.id < 1) return null;
  return {
    id: r.id,
    who: r.who,
    name: text(r.name).trim() || 'A traveler',
    me: r.me === true,
    kind,
    detail: text(r.detail, 64),
    day: r.day,
  };
}

/**
 * A milestone in words, from its codes alone, so the feed can't carry anything a player typed
 * except their name. `places` names each subject's building, e.g. `morse` → "the Signal Tower".
 */
export function milestoneLine(m: Milestone, places: ReadonlyMap<string, string>): string {
  const who = m.me ? 'You' : m.name;
  const [subject, what = ''] = m.detail.split(':');
  const at = subject ? places.get(subject) : undefined;
  switch (m.kind) {
    case 'rank':
      return `${who} took the rank of ${rankName(m.detail)}${at ? ` at ${at}` : ''}.`;
    case 'trial': {
      const n = Number(what.replace(/^trial-/, ''));
      return `${who} passed the chapter ${Number.isFinite(n) ? n : ''} trial${at ? ` at ${at}` : ''}.`;
    }
    case 'achievement': {
      const name = achievementNames([m.detail])[0];
      return name ? `${who} earned ${name}.` : `${who} earned an achievement.`;
    }
    case 'streak':
      return `${who} kept a ${Number(m.detail) || ''}-day streak.`;
    case 'visit': {
      const note = noteById(m.detail);
      return note
        ? `${m.name} stopped by your room and left a note: ${noteLine(note)}`
        : `${m.name} stopped by your room.`;
    }
  }
}

/** "Today", "Yesterday", or the date, e.g. "Nov 14". */
export function dayLabel(day: string, today: string): string {
  if (day === today) return 'Today';
  // A day that isn't one says nothing, rather than "Invalid Date" (review, 2026-11-19).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return '';
  const d = new Date(`${day}T12:00:00Z`);
  const t = new Date(`${today}T12:00:00Z`);
  if (Math.round((t.getTime() - d.getTime()) / 86_400_000) === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
