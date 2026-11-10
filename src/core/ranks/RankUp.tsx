import { useState } from 'react';
import type { Rank, RankStanding } from './ranks.ts';
import './ranks.css';

/**
 * The rank-up moment (#174): a card over the hall when you've earned a rank you haven't taken
 * yet. Taking it saves the rank and sends its event (ADR 0035); the database gives its gear.
 */
export function RankUp({
  guild,
  rank,
  after,
  onTake,
}: {
  guild: string;
  rank: Rank;
  /** Where you stand once it's taken: the next rank and its conditions. */
  after: RankStanding;
  onTake: () => Promise<void>;
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'failed'>('idle');
  const take = () => {
    setState('saving');
    onTake().then(
      () => setState('idle'),
      () => setState('failed'),
    );
  };
  return (
    <div className="rankup" role="dialog" aria-modal="true" aria-labelledby="rankup-title">
      <div className="rankup__card">
        <p className="rankup__kicker">{guild} · a new rank</p>
        {rank.arabic && (
          <p className="rankup__arabic" lang="ar" dir="rtl">
            {rank.arabic}
          </p>
        )}
        <h2 id="rankup-title" className="rankup__title">
          {rank.name}
        </h2>
        <ul className="rankup__done">
          {rank.conditions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        {after.next && (
          <p className="rankup__next">
            Next: <strong>{after.next.name}</strong>
            {after.later ? ` · ${after.next.later ?? 'comes later'}` : ''}
          </p>
        )}
        {state === 'failed' && (
          <p className="rankup__warning" role="alert">
            Your rank couldn’t be saved. Check your connection and try again.
          </p>
        )}
        <button type="button" className="rankup__go" onClick={take} disabled={state === 'saving'}>
          {state === 'saving' ? 'Saving…' : 'Take the rank'}
        </button>
      </div>
    </div>
  );
}
