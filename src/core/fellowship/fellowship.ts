// The Fellowship (task 3.1, #326; docs/game/fellowship-build.md): friend codes, requests and
// friends' cards. Everything comes from the database's functions, which return only the
// fields of fellowship.md §3; this file reads them as another person's input, never trusting
// a shape or a string.

import type { SupabaseClient } from '@supabase/supabase-js';
import { ACHIEVEMENTS } from '../achievements/achievements.ts';
import { parseOthersLook, type Look } from '../avatar/looks.ts';

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
  };
}

/** Where to visit a friend's house (task 3.2). */
export const visitPath = (id: string) => `/house/visit/${id}`;

/** A friend's achievements by name, in the wall's order (task 3.2). */
export const achievementNames = (ids: readonly string[]) =>
  ACHIEVEMENTS.filter((a) => ids.includes(a.id)).map((a) => a.name);
