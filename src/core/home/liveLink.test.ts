import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  Gathering,
  GONE_AFTER_MS,
  heardSpot,
  MOST_LINES,
  said,
  supabaseLive,
  visitTopic,
  type Mate,
  type Standing,
} from './liveLink.ts';

const AT: Standing = { room: 'home', at: [3, 2], seat: null };

describe('a visit’s line (task 9.1)', () => {
  it('has the same name from both sides', () => {
    expect(visitTopic('b', 'a')).toBe('visit:a:b');
    expect(visitTopic('a', 'b')).toBe('visit:a:b');
  });

  it('says only whose house, which room, the cell and the seat, and reads it back', () => {
    const sitting: Standing = { room: 'roof', at: [4, 1], seat: { point: [812.4, 700.6], row: 2 } };
    expect(said('h', sitting)).toEqual({ h: 'h', r: 'roof', c: [4, 1], s: [812, 701, 2] });
    expect(heardSpot(said('h', AT))).toEqual({ house: 'h', spot: AT });
    expect(heardSpot(said('h', sitting))?.spot.seat).toEqual({ point: [812, 701], row: 2 });
  });

  it('ignores anything else a friend might send', () => {
    for (const p of [
      null,
      'here',
      { h: 1, r: 'home', c: [1, 1] },
      { h: 'h', r: 'cellar', c: [1, 1] },
      { h: 'h', r: 'home', c: [1] },
      { h: 'h', r: 'home', c: [-1, 1] },
      { h: 'h', r: 'home', c: [1.5, 1] },
      { h: 'h', r: 'home', c: [1, 1], s: [1, 2] },
      { h: 'h', r: 'home', c: [1, 1], s: [Infinity, 2, 1] },
      { h: 'x'.repeat(65), r: 'home', c: [1, 1] },
    ]) {
      expect(heardSpot(p)).toBeNull();
    }
  });
});

describe('who is in the house', () => {
  const gather = () => {
    const seen: Mate[][] = [];
    return { g: new Gathering('h', (m) => seen.push(m)), seen };
  };

  it('a friend heard in this house comes in once, and moves', () => {
    const { g, seen } = gather();
    expect(g.hear('b', 'h', AT, 0)).toBe(true);
    expect(g.hear('b', 'h', AT, 100)).toBe(false);
    g.hear('b', 'h', { ...AT, at: [4, 2] }, 200);
    expect(seen).toEqual([[{ id: 'b', ...AT }], [{ id: 'b', ...AT, at: [4, 2] }]]);
  });

  it('a friend in another house isn’t here, and leaving for one takes them out', () => {
    const { g } = gather();
    expect(g.hear('b', 'elsewhere', AT, 0)).toBe(false);
    expect(g.has('b')).toBe(false);
    g.hear('b', 'h', AT, 0);
    g.hear('b', 'elsewhere', AT, 10);
    expect(g.mates).toEqual([]);
  });

  it('goodbye, or silence too long, means they’ve gone', () => {
    const { g } = gather();
    g.hear('b', 'h', AT, 0);
    g.hear('c', 'h', AT, 0);
    g.left('b');
    expect(g.mates.map((m) => m.id)).toEqual(['c']);
    g.tick(GONE_AFTER_MS - 1);
    expect(g.has('c')).toBe(true);
    g.tick(GONE_AFTER_MS);
    expect(g.has('c')).toBe(false);
  });
});

describe('the lines of a house', () => {
  function fakeClient() {
    const channels = new Map<
      string,
      {
        handlers: Map<string, (m: { payload: unknown }) => void>;
        onStatus: (s: string) => void;
        sent: { event: string; payload: unknown }[];
        state: string;
        removed: boolean;
      }
    >();
    const client = {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'a' } } } }) },
      realtime: { setAuth: async () => {} },
      channel: (topic: string) => {
        const c = {
          handlers: new Map<string, (m: { payload: unknown }) => void>(),
          onStatus: (() => {}) as (s: string) => void,
          sent: [] as { event: string; payload: unknown }[],
          state: 'joining',
          removed: false,
        };
        channels.set(topic, c);
        const ch = {
          get state() {
            return c.state;
          },
          on: (_t: string, { event }: { event: string }, f: (m: { payload: unknown }) => void) => {
            c.handlers.set(event, f);
            return ch;
          },
          subscribe: (f: (s: string) => void) => {
            c.onStatus = (s) => {
              c.state = s === 'SUBSCRIBED' ? 'joined' : 'closed';
              f(s);
            };
            return ch;
          },
          send: async ({ event, payload }: { event: string; payload: unknown }) => {
            c.sent.push({ event, payload });
            return 'ok';
          },
          topic,
        };
        return ch;
      },
      removeChannel: async (ch: { topic: string }) => {
        const c = channels.get(ch.topic);
        if (c) c.removed = true;
      },
    };
    return { client: client as unknown as SupabaseClient, channels };
  }

  it('a host opens a line to each friend, answers a newcomer and walks for them', async () => {
    const { client, channels } = fakeClient();
    const seen: Mate[][] = [];
    const link = supabaseLive(client).join('a', ['b', 'c', 'a'], (m) => seen.push(m));
    await vi.waitFor(() => expect([...channels.keys()]).toEqual(['visit:a:b', 'visit:a:c']));
    const b = channels.get('visit:a:b');
    const c = channels.get('visit:a:c');
    if (!b || !c) throw new Error('no lines');
    b.onStatus('SUBSCRIBED');
    c.onStatus('SUBSCRIBED');
    link.move(AT);
    // The first place you stand goes to every line.
    expect(b.sent).toEqual([{ event: 'here', payload: said('a', AT) }]);
    expect(c.sent).toHaveLength(1);
    // b comes in: they're answered at once, and see each move; c, elsewhere, doesn't.
    b.handlers.get('here')?.({ payload: said('a', { ...AT, at: [0, 4] }) });
    expect(seen.at(-1)).toEqual([{ id: 'b', ...AT, at: [0, 4] }]);
    expect(b.sent).toHaveLength(2);
    c.handlers.get('here')?.({ payload: said('c', AT) });
    link.move({ ...AT, at: [3, 3] });
    expect(b.sent.at(-1)).toEqual({ event: 'at', payload: said('a', { ...AT, at: [3, 3] }) });
    expect(c.sent).toHaveLength(1);
    link.close();
    expect(b.sent.at(-1)?.event).toBe('bye');
    expect(b.removed && c.removed).toBe(true);
    // Nothing reaches the screen once it has closed.
    const before = seen.length;
    b.handlers.get('at')?.({ payload: said('a', AT) });
    expect(seen).toHaveLength(before);
  });

  it('listens for at most MOST_LINES friends', async () => {
    const { client, channels } = fakeClient();
    const many = Array.from({ length: MOST_LINES + 5 }, (_, i) => `f${String(i).padStart(3, '0')}`);
    const link = supabaseLive(client).join('a', many, () => {});
    await vi.waitFor(() => expect(channels.size).toBe(MOST_LINES));
    link.close();
  });
});
