// The wire: live Morse between two friends (task 3.6, #331; ADR 0046). A private Supabase
// Realtime channel per friendship, `wire:<low id>:<high id>`, which only the two friends may
// join (migration 20270103000000_the_wire.sql). What goes over it is the key's edges, each with
// the sender's own clock, and a short "here" now and then, so each side knows the other is on
// the line. Nothing is stored.

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

/** One edge of the friend's key: down or up, at `t` ms on their clock since their line opened. */
export interface KeyEdge {
  down: boolean;
  t: number;
}

/**
 * - `connecting`: joining the line.
 * - `waiting`: on the line; the friend isn't.
 * - `open`: both on the line.
 * - `dropped`: the connection fell; it's coming back by itself.
 * - `lost`: it didn't come back. Close and open again.
 * - `failed`: the line couldn't be opened at all.
 */
export type WireState = 'connecting' | 'waiting' | 'open' | 'dropped' | 'lost' | 'failed';

export interface WireHandlers {
  onEdge(edge: KeyEdge): void;
  onState(state: WireState): void;
}

export interface WireLink {
  /** Sends an edge of your key; `t` is ms on your clock since the line opened. */
  key(down: boolean, t: number): void;
  close(): void;
}

export interface WireApi {
  /** Friends you can open a line to (none for a player alone). */
  friends(): Promise<{ id: string; name: string }[]>;
  open(friendId: string, handlers: WireHandlers): WireLink;
}

/** The pair's channel name: the same from both sides. */
export const wireTopic = (a: string, b: string) => (a < b ? `wire:${a}:${b}` : `wire:${b}:${a}`);

/** How often each side says it's here, and how long silence means the friend has gone. */
export const HERE_EVERY_MS = 5_000;
export const GONE_AFTER_MS = 16_000;
/** How long a dropped line may take to come back before it's called lost. */
export const LOST_AFTER_MS = 20_000;

/** The wire for a player with no database: no friends, and no line. */
export const NO_WIRE: WireApi = {
  friends: async () => [],
  open: (_friend, h) => {
    queueMicrotask(() => h.onState('failed'));
    return { key: () => {}, close: () => {} };
  },
};

/**
 * Keeps the line's state from what the channel says and what the friend sends: pure timing, so
 * it can be tested without a network. `now` is ms on this side's clock.
 */
export class LineWatch {
  private joined = false;
  private everJoined = false;
  private heardAt: number | null = null;
  private droppedAt: number | null = null;
  private last: WireState = 'connecting';

  constructor(private readonly onState: (s: WireState) => void) {}

  /** The channel's own status, as supabase-js reports it. */
  status(status: string, now: number) {
    if (status === 'SUBSCRIBED') {
      this.joined = true;
      this.everJoined = true;
      this.droppedAt = null;
    } else if (this.everJoined) {
      this.joined = false;
      this.droppedAt ??= now;
    } else {
      this.set('failed');
      return;
    }
    this.update(now);
  }

  /** Anything from the friend: a key edge or a "here". */
  heard(now: number) {
    this.heardAt = now;
    this.update(now);
  }

  /** The friend said goodbye. */
  left(now: number) {
    this.heardAt = null;
    this.update(now);
  }

  /** Call every second or so: silence and slow reconnects are noticed here. */
  tick(now: number) {
    this.update(now);
  }

  get state() {
    return this.last;
  }

  private update(now: number) {
    if (this.last === 'failed' || this.last === 'lost') return;
    if (!this.joined) {
      if (this.droppedAt === null) return;
      this.set(now - this.droppedAt > LOST_AFTER_MS ? 'lost' : 'dropped');
      return;
    }
    const here = this.heardAt !== null && now - this.heardAt < GONE_AFTER_MS;
    this.set(here ? 'open' : 'waiting');
  }

  private set(s: WireState) {
    if (s === this.last) return;
    this.last = s;
    this.onState(s);
  }
}

export function supabaseWire(
  client: SupabaseClient,
  friends: () => Promise<{ id: string; name: string }[]>,
): WireApi {
  return {
    friends,
    open(friendId, given) {
      let closed = false;
      // Nothing reaches the screen once it has closed the line: removing the channel reports
      // CLOSED, and edges already on their way still arrive (review, 2026-11-19).
      const h: WireHandlers = {
        onState: (s) => {
          if (!closed) given.onState(s);
        },
        onEdge: (e) => {
          if (!closed) given.onEdge(e);
        },
      };
      const watch = new LineWatch(h.onState);
      let channel: RealtimeChannel | null = null;
      const now = () => performance.now();
      const say = (event: string, payload: Record<string, unknown> = {}) =>
        void channel?.send({ type: 'broadcast', event, payload });
      let lastHere = 0;
      const timer = setInterval(() => {
        watch.tick(now());
        const on = watch.state === 'open' || watch.state === 'waiting';
        if (on && now() - lastHere >= HERE_EVERY_MS) {
          lastHere = now();
          say('here');
        }
      }, 1_000);

      void (async () => {
        const { data } = await client.auth.getSession();
        const me = data.session?.user.id;
        if (closed) return;
        if (!me) {
          h.onState('failed');
          return;
        }
        await client.realtime.setAuth();
        if (closed) return;
        channel = client.channel(wireTopic(me, friendId), {
          config: { private: true, broadcast: { self: false } },
        });
        channel
          .on('broadcast', { event: 'key' }, ({ payload }) => {
            const p = payload as { d?: unknown; t?: unknown };
            if (typeof p.t !== 'number' || !Number.isFinite(p.t)) return;
            watch.heard(now());
            h.onEdge({ down: p.d === 1, t: p.t });
          })
          .on('broadcast', { event: 'here' }, () => {
            const first = watch.state !== 'open';
            watch.heard(now());
            // Answer a newcomer at once, so both sides open together.
            if (first && now() - lastHere > 500) {
              lastHere = now();
              say('here');
            }
          })
          .on('broadcast', { event: 'bye' }, () => watch.left(now()))
          .subscribe((status) => {
            watch.status(status, now());
            if (status === 'SUBSCRIBED') {
              lastHere = now();
              say('here');
            }
          });
      })().catch(() => h.onState('failed'));

      return {
        key: (down, t) => say('key', { d: down ? 1 : 0, t: Math.round(t) }),
        close: () => {
          closed = true;
          clearInterval(timer);
          say('bye');
          const c = channel;
          channel = null;
          if (c) void client.removeChannel(c);
        },
      };
    },
  };
}
