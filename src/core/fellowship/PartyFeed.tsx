import { useEffect, useState } from 'react';
import { dayLabel, milestoneLine, type FellowshipSource, type Milestone } from './fellowship.ts';
import './fellowship.css';

/**
 * The party feed on the Notice Board (task 3.3, #328): friends' milestones and yours, newest
 * first, written by the database. Shown only to a player with at least one friend, so a player
 * alone sees nothing social (fellowship-build.md §6 test 9).
 */
export function PartyFeed({
  source,
  places,
  today,
}: {
  source: FellowshipSource;
  /** Each subject's building by id, e.g. `morse` → "the Signal Tower". */
  places: ReadonlyMap<string, string>;
  today: string;
}) {
  const [rows, setRows] = useState<Milestone[] | null | 'failed'>(null);
  useEffect(() => {
    let live = true;
    Promise.all([source.cards(), source.feed()]).then(
      ([cards, feed]) => live && setRows(cards.some((c) => !c.me) ? feed : null),
      () => live && setRows('failed'),
    );
    return () => {
      live = false;
    };
  }, [source]);
  if (rows === null || rows === 'failed') return null;
  return (
    <section className="party-feed" aria-labelledby="party-feed-title">
      <h2 id="party-feed-title" className="party-feed__title">
        Word in the square
      </h2>
      {rows.length === 0 ? (
        <p className="party-feed__slip">
          No news yet. When you or a friend takes a rank, passes a trial or keeps a long streak, it
          is pinned here.
        </p>
      ) : (
        <ul className="party-feed__list">
          {rows.map((m) => (
            <li key={m.id} className={`party-feed__slip${m.me ? ' party-feed__slip--mine' : ''}`}>
              <span className="party-feed__line">{milestoneLine(m, places)}</span>
              <span className="party-feed__day">{dayLabel(m.day, today)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
