// Challenges between friends (task 3.4, #329; docs/game/challenges.md). A score is never sent
// as a number: a round's score is recorded against the session that saved it, and a challenge
// names that session. The database checks both (migration 20270101000000_challenges.sql).

import type { SupabaseClient } from '@supabase/supabase-js';

/** The rounds friends can challenge each other on. */
export type RoundKind = 'rush' | 'words';

export const ROUND_NAMES: Record<RoundKind, string> = {
  rush: 'a callsign rush',
  words: 'a Codebook round',
};

/** Where to play each round (the Signal Tower's drills). */
export const ROUND_PATHS: Record<RoundKind, string> = {
  rush: '/signal-tower?open=rush',
  words: '/signal-tower?open=words',
};

export interface ChallengeSide {
  id: string;
  name: string;
  score: number | null;
  best: number | null;
}

export interface Challenge {
  id: string;
  kind: RoundKind;
  /** You sent it. */
  mine: boolean;
  from: ChallengeSide;
  to: ChallengeSide;
  state: 'open' | 'answered' | 'declined' | 'expired';
  /** The day it was sent. */
  sent: string;
}

export type ChallengeProblem = 'not-friends' | 'open' | 'daily-limit' | 'closed' | 'failed';

export class ChallengeError extends Error {
  constructor(readonly problem: ChallengeProblem) {
    super(`Challenge: ${problem}`);
    this.name = 'ChallengeError';
  }
}

/** What recording a round did: and if it answered a challenge taken on in the Arena, whose. */
export interface Recorded {
  answered: { name: string; theirs: number } | null;
}

/** A round that was saved and scored, as the subject hands it to the offer. */
export interface ScoredRound {
  sessionId: string;
  kind: RoundKind;
  score: number;
  recorded: Recorded;
}

/** What a subject's drills use: record a round, then offer it to a friend. */
export interface RoundsApi {
  /**
   * Records a finished round's score against its saved session, and answers the challenge the
   * player took on in the Arena if it's the same kind. Resolves null if it couldn't record.
   */
  record(sessionId: string, kind: RoundKind, score: number): Promise<Recorded | null>;
  /** Friends who could be challenged (none for a player alone). */
  friends(): Promise<{ id: string; name: string }[]>;
  send(friendId: string, sessionId: string): Promise<void>;
}

/** A challenge the player chose to take on; the next round of its kind answers it. */
export interface TakenOn {
  id: string;
  kind: RoundKind;
  name: string;
  theirs: number;
}

const TAKEN_ON = 'waymark:taken-on';

/** Remembers the challenge taken on, for this tab only (it survives the walk to the tower). */
export function takeOn(c: TakenOn | null): void {
  try {
    if (c) sessionStorage.setItem(TAKEN_ON, JSON.stringify(c));
    else sessionStorage.removeItem(TAKEN_ON);
  } catch {
    // Without storage the answer is simply not sent; the challenge stays open.
  }
}

export function takenOn(): TakenOn | null {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(TAKEN_ON) ?? 'null');
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const kind = KINDS.find((k) => k === r.kind);
    if (typeof r.id !== 'string' || !kind || typeof r.name !== 'string') return null;
    return { id: r.id, kind, name: r.name, theirs: num(r.theirs) ?? 0 };
  } catch {
    return null;
  }
}

export interface ChallengeSource extends RoundsApi {
  list(): Promise<Challenge[]>;
  decline(challengeId: string): Promise<void>;
}

const KINDS: readonly RoundKind[] = ['rush', 'words'];
const STATES: readonly Challenge['state'][] = ['open', 'answered', 'declined', 'expired'];
const UUID = /^[0-9a-f-]{36}$/i;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

function readSide(raw: unknown): ChallengeSide | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !UUID.test(r.id)) return null;
  const name = typeof r.name === 'string' ? r.name.slice(0, 40).trim() : '';
  return { id: r.id, name: name || 'A traveler', score: num(r.score), best: num(r.best) };
}

export function readChallenge(raw: unknown): Challenge | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const kind = KINDS.find((k) => k === r.kind);
  const state = STATES.find((s) => s === r.state);
  const from = readSide(r.from);
  const to = readSide(r.to);
  if (typeof r.id !== 'string' || !kind || !state || !from || !to) return null;
  const sent = typeof r.sent === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.sent) ? r.sent : '';
  return { id: r.id, kind, mine: r.mine === true, from, to, state, sent };
}

/** What a finished challenge says about the player, kindly: never who lost. */
export function bestLine(c: Challenge): string | null {
  const me = c.mine ? c.from : c.to;
  if (me.score === null || me.best === null) return null;
  return me.score >= me.best ? 'That was your best yet.' : null;
}

export function supabaseChallenges(
  client: SupabaseClient,
  friends: () => Promise<{ id: string; name: string }[]>,
): ChallengeSource {
  const call = async (fn: string, args?: Record<string, unknown>) => {
    const { data, error } = await client.rpc(fn, args);
    if (error) {
      const hint = (error as { hint?: string }).hint;
      throw new ChallengeError(
        hint === 'not-friends' || hint === 'open' || hint === 'daily-limit' || hint === 'closed'
          ? hint
          : 'failed',
      );
    }
    return data as unknown;
  };
  return {
    record: async (sessionId, kind, score) => {
      try {
        await call('record_round_score', { p_session: sessionId, p_kind: kind, p_score: score });
      } catch {
        return null;
      }
      const taken = takenOn();
      if (!taken || taken.kind !== kind) return { answered: null };
      try {
        await call('answer_challenge', { p_challenge: taken.id, p_session: sessionId });
        takeOn(null);
        return { answered: { name: taken.name, theirs: taken.theirs } };
      } catch (e) {
        // A closed challenge (expired, let go, no longer friends) is forgotten; a failed call
        // keeps it for the next round.
        if (e instanceof ChallengeError && e.problem === 'closed') takeOn(null);
        return { answered: null };
      }
    },
    friends,
    send: async (friendId, sessionId) =>
      void (await call('send_challenge', { p_friend: friendId, p_session: sessionId })),
    decline: async (challengeId) =>
      void (await call('decline_challenge', { p_challenge: challengeId })),
    list: async () => {
      const raw = await call('my_challenges');
      return Array.isArray(raw)
        ? raw.map(readChallenge).filter((c): c is Challenge => c !== null)
        : [];
    },
  };
}

/** For a player with no database (tests, a fresh checkout): nothing to record or send. */
export const NO_ROUNDS: RoundsApi = {
  record: async () => null,
  friends: async () => [],
  send: () => Promise.reject(new ChallengeError('failed')),
};
