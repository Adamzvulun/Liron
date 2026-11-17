import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  bestLine,
  ChallengeError,
  readChallenge,
  supabaseChallenges,
  takenOn,
  takeOn,
  type Challenge,
} from './challenges.ts';

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';
const S = '00000000-0000-4000-8000-0000000000ff';

const raw = {
  id: C,
  kind: 'rush',
  mine: false,
  from: { id: A, name: 'Basma', score: 534, best: 610 },
  to: { id: B, name: 'Adam', score: null, best: 498 },
  state: 'open',
  sent: '2026-11-17',
};

function storage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

/** A client whose rpc answers by function name; an Error value is returned as the error. */
function client(answers: Record<string, unknown>) {
  const rpc = vi.fn(async (fn: string) => {
    const a = answers[fn];
    return a instanceof Error || (a && typeof a === 'object' && 'hint' in a)
      ? { data: null, error: a }
      : { data: a ?? null, error: null };
  });
  return { rpc, client: { rpc } as unknown as SupabaseClient };
}

describe('readChallenge', () => {
  it('reads a challenge from the database', () => {
    expect(readChallenge(raw)).toEqual(raw);
  });

  it('refuses a stranger kind, state or side', () => {
    expect(readChallenge({ ...raw, kind: 'darts' })).toBeNull();
    expect(readChallenge({ ...raw, state: 'won' })).toBeNull();
    expect(readChallenge({ ...raw, from: { id: 'nope' } })).toBeNull();
    expect(readChallenge(null)).toBeNull();
  });

  it('keeps names short, and gives a nameless player a name', () => {
    const c = readChallenge({ ...raw, from: { ...raw.from, name: ' ' + 'x'.repeat(80) } });
    expect(c?.from.name).toHaveLength(39);
    expect(readChallenge({ ...raw, to: { ...raw.to, name: '' } })?.to.name).toBe('A traveler');
  });

  it('reads a negative or missing score as none', () => {
    const c = readChallenge({ ...raw, from: { ...raw.from, score: -3, best: 'many' } });
    expect(c?.from).toMatchObject({ score: null, best: null });
  });
});

describe('bestLine', () => {
  it('says so only when your score is your best', () => {
    const done = readChallenge({ ...raw, state: 'answered', to: { ...raw.to, score: 498 } });
    expect(bestLine(done as Challenge)).toBe('That was your best yet.');
    const less = readChallenge({ ...raw, state: 'answered', to: { ...raw.to, score: 400 } });
    expect(bestLine(less as Challenge)).toBeNull();
  });
});

describe('taking a challenge on', () => {
  beforeEach(() => vi.stubGlobal('sessionStorage', storage()));
  afterEach(() => vi.unstubAllGlobals());

  it('remembers one challenge, and forgets it', () => {
    takeOn({ id: C, kind: 'rush', name: 'Basma', theirs: 534 });
    expect(takenOn()).toEqual({ id: C, kind: 'rush', name: 'Basma', theirs: 534 });
    takeOn(null);
    expect(takenOn()).toBeNull();
  });

  it('records a round and answers the challenge taken on with it', async () => {
    takeOn({ id: C, kind: 'rush', name: 'Basma', theirs: 534 });
    const { rpc, client: c } = client({});
    const source = supabaseChallenges(c, async () => []);
    expect(await source.record(S, 'rush', 498)).toEqual({
      answered: { name: 'Basma', theirs: 534 },
    });
    expect(rpc).toHaveBeenCalledWith('record_round_score', {
      p_session: S,
      p_kind: 'rush',
      p_score: 498,
    });
    expect(rpc).toHaveBeenCalledWith('answer_challenge', { p_challenge: C, p_session: S });
    expect(takenOn()).toBeNull();
  });

  it('leaves a challenge of another kind for later', async () => {
    takeOn({ id: C, kind: 'words', name: 'Basma', theirs: 7 });
    const { rpc, client: c } = client({});
    expect(await supabaseChallenges(c, async () => []).record(S, 'rush', 498)).toEqual({
      answered: null,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(takenOn()?.id).toBe(C);
  });

  it('forgets a closed challenge, and keeps one whose answer failed to send', async () => {
    takeOn({ id: C, kind: 'rush', name: 'Basma', theirs: 534 });
    const failed = client({ answer_challenge: { message: 'down', hint: '' } });
    await supabaseChallenges(failed.client, async () => []).record(S, 'rush', 1);
    expect(takenOn()?.id).toBe(C);
    const closed = client({ answer_challenge: { message: 'closed', hint: 'closed' } });
    await supabaseChallenges(closed.client, async () => []).record(S, 'rush', 1);
    expect(takenOn()).toBeNull();
  });

  it('resolves null when the score is refused', async () => {
    const { client: c } = client({ record_round_score: { message: 'no', hint: '' } });
    expect(await supabaseChallenges(c, async () => []).record(S, 'rush', 1)).toBeNull();
  });
});

describe('supabaseChallenges', () => {
  it('maps the database’s hints to problems', async () => {
    for (const hint of ['not-friends', 'open', 'daily-limit']) {
      const { client: c } = client({ send_challenge: { message: 'no', hint } });
      await expect(supabaseChallenges(c, async () => []).send(B, S)).rejects.toEqual(
        new ChallengeError(hint as 'open'),
      );
    }
    const { client: c } = client({ send_challenge: { message: 'no', hint: 'no-round' } });
    await expect(supabaseChallenges(c, async () => []).send(B, S)).rejects.toMatchObject({
      problem: 'failed',
    });
  });

  it('lists only the challenges it can read', async () => {
    const { client: c } = client({ my_challenges: [raw, { ...raw, kind: 'darts' }] });
    expect(await supabaseChallenges(c, async () => []).list()).toHaveLength(1);
  });
});
