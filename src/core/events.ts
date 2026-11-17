// World events (task 4.4, docs/game/events.md): a few weeks a year the city keeps one. The
// calendar is data (content/core/events.json); the database holds the same dates and decides the
// contracts and chests. Here the browser only dresses the square and says what's on.
import pack from '../../content/core/events.json' with { type: 'json' };

export interface WorldEvent {
  id: string;
  name: string;
  /** Month and day, both ends included; `from` after `to` runs over the new year. */
  from: string;
  to: string;
  /** The chest a day's contracts give in its week. */
  chest: string;
  /** The bunting's colors. */
  colors: string[];
  /** What the Notice Board says. */
  line: string;
}

export const EVENTS: readonly WorldEvent[] = pack.items.map((i) => ({ id: i.id, ...i.data }));

/**
 * The event on a day (YYYY-MM-DD, the player's local day), or null. The same rule as the
 * database's `event_on`: if two ever overlapped, the one that starts first in the year wins.
 */
export function eventOn(day: string | undefined, events = EVENTS): WorldEvent | null {
  if (!day) return null;
  const md = day.slice(5, 10);
  const on = events.filter((e) =>
    e.from <= e.to ? md >= e.from && md <= e.to : md >= e.from || md <= e.to,
  );
  return [...on].sort((a, b) => a.from.localeCompare(b.from))[0] ?? null;
}
