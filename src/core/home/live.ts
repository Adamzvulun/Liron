// Visiting together, live, on the screen (task 9.1, #482; the-home.md §17): the hook that opens
// a house's lines (liveLink.ts) while a room is shown.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ROOMS } from './layout.ts';
import type { LiveApi, LiveLink, Mate, Standing } from './liveLink.ts';

export type { LiveApi, Mate, Seat, Standing } from './liveLink.ts';

/** Inside its room's grid: anything else isn't drawn. */
const inRoom = (m: Mate) => {
  const r = ROOMS[m.room];
  return m.at[0] < r.cols && m.at[1] < r.rows && (!m.seat || m.seat.row < r.rows);
};

/**
 * Opens a house's lines while the screen is up: who else is in it, and where to tell them you
 * are. `friends` null waits (still loading); a change of house or friends opens new lines.
 */
export function useGathering(
  api: LiveApi | undefined,
  house: string | null,
  friends: readonly string[] | null,
): [Mate[], (spot: Standing) => void] {
  const [mates, setMates] = useState<Mate[]>([]);
  const link = useRef<LiveLink | null>(null);
  const last = useRef<Standing | null>(null);
  const key = friends?.join(',') ?? null;
  useEffect(() => {
    if (!api || !house || key === null || key === '') return;
    const l = api.join(house, key.split(','), (m) => setMates(m.filter(inRoom)));
    link.current = l;
    if (last.current) l.move(last.current);
    return () => {
      l.close();
      link.current = null;
      setMates([]);
    };
  }, [api, house, key]);
  const move = useCallback((s: Standing) => {
    last.current = s;
    link.current?.move(s);
  }, []);
  return [mates, move];
}
