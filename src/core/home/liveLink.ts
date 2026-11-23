// Visiting together, live (task 9.1, #482; the-home.md §17, ADR 0056). While you're in a house,
// yours or a friend's, the friends there see where you walk, sit and climb, in real time. It goes
// over the wire's kind of channel (ADR 0046): a private Supabase Realtime channel per friendship,
// `visit:<low id>:<high id>`, which only the two friends may join. A guest opens the one to their
// host; a host at home opens one to each friend, so whoever comes by is seen. What goes over it
// is whose house, which room, the cell and the seat. Nothing is stored.

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { GONE_AFTER_MS, HERE_EVERY_MS } from '../fellowship/wire.ts';
// Kept free of the house's content and React: the app makes the link at startup.
import type { RoomId } from './layout.ts';
import type { Cell } from './path.ts';
import type { Pt } from './projection.ts';

export { GONE_AFTER_MS, HERE_EVERY_MS };

/** Sitting: the point on the floor and the row it's drawn at (Room's `seated`). */
export interface Seat {
  point: Pt;
  row: number;
}

/** Where you are in a house: which room, the cell, and the seat if you're sitting. */
export interface Standing {
  room: RoomId;
  at: Cell;
  seat: Seat | null;
}

/** A friend in the same house, as last heard. */
export interface Mate extends Standing {
  id: string;
}

/** The pair's channel: the same from both sides. */
export const visitTopic = (a: string, b: string) => (a < b ? `visit:${a}:${b}` : `visit:${b}:${a}`);

/** A cell's coordinates are below this; the room's own grid is checked where it's drawn. */
const MOST_CELLS = 64;

/** The most friends a house listens for: Realtime allows 100 channels a connection. */
export const MOST_LINES = 40;

/** What goes over the channel. */
interface Said {
  h: string;
  r: RoomId;
  c: [number, number];
  s?: [number, number, number];
}

export const said = (house: string, spot: Standing): Said => ({
  h: house,
  r: spot.room,
  c: [spot.at[0], spot.at[1]],
  ...(spot.seat
    ? {
        s: [Math.round(spot.seat.point[0]), Math.round(spot.seat.point[1]), spot.seat.row] as [
          number,
          number,
          number,
        ],
      }
    : {}),
});

const whole = (n: unknown, below: number): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < below;
const fine = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 10_000;

/** Reads what a friend said: whose house and where in it, or null for anything else. */
export function heardSpot(p: unknown): { house: string; spot: Standing } | null {
  if (!p || typeof p !== 'object') return null;
  const { h, r, c, s } = p as Record<string, unknown>;
  if (typeof h !== 'string' || h.length > 64) return null;
  if (r !== 'home' && r !== 'roof') return null;
  if (!Array.isArray(c) || c.length !== 2 || !whole(c[0], MOST_CELLS) || !whole(c[1], MOST_CELLS))
    return null;
  let seat: Seat | null = null;
  if (s !== undefined) {
    if (
      !Array.isArray(s) ||
      s.length !== 3 ||
      !fine(s[0]) ||
      !fine(s[1]) ||
      !whole(s[2], MOST_CELLS)
    )
      return null;
    seat = { point: [s[0], s[1]], row: s[2] };
  }
  return { house: h, spot: { room: r, at: [c[0], c[1]], seat } };
}

/**
 * Who is in this house now, from what each friend last said: pure timing, so it can be tested
 * without a network. `now` is ms on this side's clock.
 */
export class Gathering {
  private heard = new Map<string, { spot: Standing; at: number }>();
  private last = '';

  constructor(
    private readonly house: string,
    private readonly onMates: (mates: Mate[]) => void,
  ) {}

  /** A friend said where they are; true when they've just come into this house. */
  hear(friend: string, house: string, spot: Standing, now: number): boolean {
    if (house !== this.house) {
      const was = this.heard.delete(friend);
      if (was) this.tell();
      return false;
    }
    const fresh = !this.heard.has(friend);
    this.heard.set(friend, { spot, at: now });
    this.tell();
    return fresh;
  }

  /** A friend said goodbye. */
  left(friend: string) {
    if (this.heard.delete(friend)) this.tell();
  }

  /** Call every second or so: a friend silent too long has gone. */
  tick(now: number) {
    let gone = false;
    for (const [id, h] of this.heard) {
      if (now - h.at >= GONE_AFTER_MS) {
        this.heard.delete(id);
        gone = true;
      }
    }
    if (gone) this.tell();
  }

  /** Whether a friend is in this house. */
  has(friend: string) {
    return this.heard.has(friend);
  }

  get mates(): Mate[] {
    return [...this.heard].map(([id, { spot }]) => ({ id, ...spot }));
  }

  private tell() {
    const mates = this.mates;
    const key = JSON.stringify(mates);
    if (key === this.last) return;
    this.last = key;
    this.onMates(mates);
  }
}

export interface LiveLink {
  /** Where you are now. */
  move(spot: Standing): void;
  close(): void;
}

export interface LiveApi {
  /**
   * Opens the lines of a house: `house` is its owner's id, `friends` whom to open a line to (a
   * guest: the host; the owner: their friends). `onMates` hears who is in the house.
   */
  join(house: string, friends: readonly string[], onMates: (mates: Mate[]) => void): LiveLink;
}

/** Without a database: nobody else is ever there. */
export const NO_LIVE: LiveApi = {
  join: () => ({ move: () => {}, close: () => {} }),
};

export function supabaseLive(client: SupabaseClient): LiveApi {
  return {
    join(house, friends, onMates) {
      let closed = false;
      let spot: Standing | null = null;
      const now = () => performance.now();
      const gathering = new Gathering(house, (m) => {
        if (!closed) onMates(m);
      });
      const lines = new Map<string, RealtimeChannel>();
      const say = (friend: string, event: string) => {
        const ch = lines.get(friend);
        if (!ch || !spot || ch.state !== 'joined') return;
        void ch.send({ type: 'broadcast', event, payload: said(house, spot) });
      };
      const timer = setInterval(() => {
        gathering.tick(now());
      }, 1_000);
      const beat = setInterval(() => {
        for (const f of lines.keys()) say(f, 'here');
      }, HERE_EVERY_MS);

      void (async () => {
        const { data } = await client.auth.getSession();
        const me = data.session?.user.id;
        if (closed || !me) return;
        await client.realtime.setAuth();
        if (closed) return;
        for (const friend of friends.slice(0, MOST_LINES)) {
          if (friend === me) continue;
          const ch = client.channel(visitTopic(me, friend), {
            config: { private: true, broadcast: { self: false } },
          });
          lines.set(friend, ch);
          const heard = ({ payload }: { payload: unknown }) => {
            const got = heardSpot(payload);
            if (!got || closed) return;
            // Answer a newcomer at once, so both see each other without waiting for a beat.
            if (gathering.hear(friend, got.house, got.spot, now())) say(friend, 'here');
          };
          ch.on('broadcast', { event: 'here' }, heard)
            .on('broadcast', { event: 'at' }, heard)
            .on('broadcast', { event: 'bye' }, () => gathering.left(friend))
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') say(friend, 'here');
            });
        }
      })().catch(() => undefined);

      return {
        move(s) {
          const first = spot === null;
          spot = s;
          // Moves go to friends in this house; the first place you stand to every line.
          for (const f of lines.keys()) {
            if (gathering.has(f)) say(f, 'at');
            else if (first) say(f, 'here');
          }
        },
        close() {
          closed = true;
          clearInterval(timer);
          clearInterval(beat);
          for (const [f, ch] of lines) {
            if (ch.state === 'joined' && spot) say(f, 'bye');
            void client.removeChannel(ch);
          }
          lines.clear();
        },
      };
    },
  };
}
