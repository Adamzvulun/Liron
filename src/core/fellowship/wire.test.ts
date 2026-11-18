import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  GONE_AFTER_MS,
  LineWatch,
  LOST_AFTER_MS,
  supabaseWire,
  wireTopic,
  type WireState,
} from './wire.ts';

const watch = () => {
  const seen: WireState[] = [];
  return { w: new LineWatch((s) => seen.push(s)), seen };
};

describe('the wire’s name', () => {
  it('is the same from both sides', () => {
    expect(wireTopic('b', 'a')).toBe('wire:a:b');
    expect(wireTopic('a', 'b')).toBe('wire:a:b');
  });
});

describe('watching the line (task 3.6)', () => {
  it('waits on the line until the friend is heard, then is open', () => {
    const { w, seen } = watch();
    w.status('SUBSCRIBED', 0);
    w.heard(1000);
    expect(seen).toEqual(['waiting', 'open']);
  });

  it('a friend silent too long, or saying goodbye, is waited for again', () => {
    const { w, seen } = watch();
    w.status('SUBSCRIBED', 0);
    w.heard(0);
    w.tick(GONE_AFTER_MS - 1);
    expect(w.state).toBe('open');
    w.tick(GONE_AFTER_MS + 1);
    expect(w.state).toBe('waiting');
    w.heard(GONE_AFTER_MS + 2);
    w.left(GONE_AFTER_MS + 3);
    expect(seen).toEqual(['waiting', 'open', 'waiting', 'open', 'waiting']);
  });

  it('a drop says so, recovers by itself, or is lost after a while', () => {
    const { w } = watch();
    w.status('SUBSCRIBED', 0);
    w.heard(0);
    w.status('CHANNEL_ERROR', 100);
    expect(w.state).toBe('dropped');
    w.status('SUBSCRIBED', 2000);
    w.heard(2000);
    expect(w.state).toBe('open');
    w.status('TIMED_OUT', 3000);
    w.tick(3000 + LOST_AFTER_MS + 1);
    expect(w.state).toBe('lost');
    // Lost is final for this line: "Try again" opens a new one.
    w.status('SUBSCRIBED', 3000 + LOST_AFTER_MS + 2);
    expect(w.state).toBe('lost');
  });

  it('a line refused at the start fails', () => {
    const { w, seen } = watch();
    w.status('CHANNEL_ERROR', 0);
    expect(seen).toEqual(['failed']);
  });
});

describe('closing the line (review, 2026-11-19)', () => {
  it('tells the screen nothing more once it has closed it', async () => {
    const handlers = new Map<string, (m: { payload: unknown }) => void>();
    let onStatus: (s: string) => void = () => {};
    const channel = {
      on: (_t: string, { event }: { event: string }, f: (m: { payload: unknown }) => void) => {
        handlers.set(event, f);
        return channel;
      },
      subscribe: (f: (s: string) => void) => {
        onStatus = f;
        return channel;
      },
      send: async () => 'ok',
    };
    const client = {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'a' } } } }) },
      realtime: { setAuth: async () => {} },
      channel: () => channel,
      // Supabase reports CLOSED to the channel as it's removed.
      removeChannel: async () => onStatus('CLOSED'),
    };
    const states: string[] = [];
    const edges: unknown[] = [];
    const link = supabaseWire(client as unknown as SupabaseClient, async () => []).open('b', {
      onState: (s) => states.push(s),
      onEdge: (e) => edges.push(e),
    });
    await vi.waitFor(() => expect(handlers.has('key')).toBe(true));
    onStatus('SUBSCRIBED');
    handlers.get('key')?.({ payload: { d: 1, t: 5 } });
    expect(edges).toHaveLength(1);
    const before = [...states];
    link.close();
    await Promise.resolve();
    handlers.get('key')?.({ payload: { d: 0, t: 9 } });
    onStatus('CLOSED');
    expect(edges).toHaveLength(1);
    expect(states).toEqual(before);
  });
});
