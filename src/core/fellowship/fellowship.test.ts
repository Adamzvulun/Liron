import { describe, expect, it } from 'vitest';
import { paintAvatar } from '../avatar/paint.ts';
import { DEFAULT_LOOK } from '../avatar/looks.ts';
import {
  dayLabel,
  FellowshipError,
  milestoneLine,
  rankName,
  readCard,
  readMilestone,
  readRequest,
  showCode,
  supabaseFellowship,
  tidyCode,
  type Milestone,
} from './fellowship.ts';

const ID = '00000000-0000-0000-0000-0000000000a1';

describe('reading a friend’s card (fellowship-build.md §1 traps 3 and 4)', () => {
  it('keeps the fields it knows, with sane numbers', () => {
    expect(
      readCard({
        id: ID,
        me: false,
        name: 'Basma',
        look: {},
        title: 'Keyer',
        level: 4,
        streak: 3,
        ranks: ['morse:rank-listener'],
        achievements: ['first-light'],
        gold: 999,
      }),
    ).toEqual({
      id: ID,
      me: false,
      name: 'Basma',
      look: DEFAULT_LOOK,
      title: 'Keyer',
      level: 4,
      streak: 3,
      ranks: ['morse:rank-listener'],
      achievements: ['first-light'],
    });
  });

  it('turns away what isn’t a card, and fills a missing name kindly', () => {
    expect(readCard(null)).toBeNull();
    expect(readCard({ id: 'x' })).toBeNull();
    expect(readCard({ id: ID, level: -3, streak: 'many' })).toMatchObject({
      name: 'A traveler',
      level: 1,
      streak: 0,
    });
    expect(readRequest({ id: ID, name: '' })?.name).toBe('A traveler');
  });

  it('a hostile look paints nothing of what was typed', () => {
    const evil = '<script>alert(1)</script>';
    const look = Object.fromEntries(
      ['build', 'skin', 'face', 'hair', 'hairColour', 'beard', 'scarf', 'dye'].map((k) => [
        k,
        evil,
      ]),
    );
    const card = readCard({
      id: ID,
      name: evil,
      look: { ...look, gear: { torso: evil, head: '"><img onerror=x>', pet: 'tunic' } },
    });
    expect(card?.look).toEqual({ ...DEFAULT_LOOK, gear: {} });
    const svg = paintAvatar(card?.look ?? DEFAULT_LOOK, { idPrefix: 'f', shadow: false });
    expect(svg).not.toMatch(/script|onerror|<img/);
  });

  it('keeps a friend’s real gear and dye, which they may own and you may not', () => {
    const card = readCard({
      id: ID,
      look: { ...DEFAULT_LOOK, dye: 'crimson-dye', gear: { torso: 'tunic', pet: 'sand-cat' } },
    });
    expect(card?.look.dye).toBe('crimson-dye');
    expect(card?.look.gear).toEqual({ torso: 'tunic', pet: 'sand-cat' });
  });
});

describe('codes and ranks, as people read them', () => {
  it('a code reads in two halves and is typed any way', () => {
    expect(showCode('ABCDEFGH')).toBe('ABCD-EFGH');
    expect(tidyCode(' abcd-efgh ')).toBe('ABCDEFGH');
  });

  it('a rank’s name comes from its id', () => {
    expect(rankName('morse:rank-listener')).toBe('Listener');
    expect(rankName('arabic:rank-master-storyteller')).toBe('Master storyteller');
  });
});

describe('the party feed in words (task 3.3)', () => {
  const places = new Map([
    ['morse', 'the Signal Tower'],
    ['arabic', 'the Caravanserai'],
  ]);
  const m = (kind: Milestone['kind'], detail: string, me = false): Milestone => ({
    id: 1,
    who: ID,
    name: 'Basma',
    me,
    kind,
    detail,
    day: '2026-11-17',
  });

  it('says each kind of milestone, from its codes alone', () => {
    expect(milestoneLine(m('rank', 'morse:rank-keyer'), places)).toBe(
      'Basma took the rank of Keyer at the Signal Tower.',
    );
    expect(milestoneLine(m('trial', 'arabic:trial-12'), places)).toBe(
      'Basma passed the chapter 12 trial at the Caravanserai.',
    );
    expect(milestoneLine(m('achievement', 'first-light'), places)).toBe(
      'Basma earned First Light.',
    );
    expect(milestoneLine(m('streak', '30', true), places)).toBe('You kept a 30-day streak.');
  });

  it('turns away rows that aren’t milestones', () => {
    expect(readMilestone({ ...m('rank', 'x'), kind: 'gold' })).toBeNull();
    expect(readMilestone({ ...m('rank', 'x'), day: '2026-11-17T10:00' })).toBeNull();
    expect(readMilestone(m('rank', 'morse:rank-keyer'))).toEqual(m('rank', 'morse:rank-keyer'));
    // Ids past any count's cap stay apart: the feed's lines are keyed by them.
    expect(readMilestone({ ...m('rank', 'x'), id: 250_001 })?.id).toBe(250_001);
    expect(readMilestone({ ...m('rank', 'x'), id: '7' })).toBeNull();
  });

  it('dates read as today, yesterday, or the day', () => {
    expect(dayLabel('2026-11-17', '2026-11-17')).toBe('Today');
    expect(dayLabel('2026-11-16', '2026-11-17')).toBe('Yesterday');
    expect(dayLabel('2026-11-03', '2026-11-17')).toBe('Nov 3');
    expect(dayLabel('', '2026-11-17')).toBe('');
  });
});

describe('the Fellowship through Supabase (supabaseFellowship)', () => {
  type Rpc = { data?: unknown; error?: { message: string; hint?: string } | null };
  /** A client whose `rpc` answers from `answers` by function name and records each call. */
  const fake = (answers: Record<string, Rpc>, userId: string | null = 'u1') => {
    const calls: [string, unknown][] = [];
    const updates: unknown[] = [];
    const client = {
      rpc: async (fn: string, args?: unknown) => {
        calls.push([fn, args]);
        const a = answers[fn] ?? {};
        return { data: a.data ?? null, error: a.error ?? null };
      },
      auth: {
        getSession: async () => ({
          data: { session: userId ? { user: { id: userId } } : null },
        }),
      },
      from: () => ({
        update: (row: unknown) => ({
          eq: async () => {
            updates.push(row);
            return { error: null };
          },
        }),
      }),
    };
    return {
      source: supabaseFellowship(client as unknown as Parameters<typeof supabaseFellowship>[0]),
      calls,
      updates,
    };
  };

  it('sends a code the way the server keeps it', async () => {
    const { source, calls } = fake({});
    await source.ask(' abcd-efgh ');
    expect(calls).toEqual([['ask_friend', { p_code: 'ABCDEFGH' }]]);
  });

  it('turns the server’s hints into problems the page can explain', async () => {
    for (const hint of ['daily-limit', 'waiting', 'full'] as const) {
      const { source } = fake({ ask_friend: { error: { message: 'no', hint } } });
      await expect(source.ask('ABCDEFGH')).rejects.toMatchObject({ problem: hint });
    }
    // Any other refusal, or none named, is a plain failure: never the server's own words.
    for (const hint of ['owned', undefined]) {
      const { source } = fake({ remove_friend: { error: { message: 'secret detail', hint } } });
      const error = await source.remove('x').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(FellowshipError);
      expect(error).toMatchObject({ problem: 'failed' });
      expect(String(error)).not.toContain('secret detail');
    }
  });

  it('keeps only real cards and requests, and a code of at most 8 letters', async () => {
    const id = '00000000-0000-4000-8000-000000000001';
    const { source } = fake({
      fellowship: { data: [{ id, name: 'Dana' }, { id: 'not-a-uuid' }, null] },
      fellowship_requests: { data: 'not a list' },
      my_friend_code: { data: 'ABCDEFGHIJKL' },
    });
    expect((await source.cards()).map((c) => c.name)).toEqual(['Dana']);
    expect(await source.requests()).toEqual([]);
    expect(await source.code()).toBe('ABCDEFGH');
  });

  it('changes sharing only when signed in', async () => {
    const signedIn = fake({});
    await signedIn.source.setSharing(false);
    expect(signedIn.updates).toEqual([{ share_milestones: false }]);
    const signedOut = fake({}, null);
    await expect(signedOut.source.setSharing(true)).rejects.toMatchObject({ problem: 'failed' });
    expect(signedOut.updates).toEqual([]);
  });
});
