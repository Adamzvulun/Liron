import { useRoadFacts } from '../../core/road/facts.ts';

/**
 * What a station says when the deck gave it nothing (ADR 0050 §3). An account without a licence
 * is told so, and what to do about it; for everyone else the deck really hasn't been uploaded
 * (the keeper's step, RUNNING.md). The hall's "← Courtyard" stays beside it, so it's never a
 * dead end.
 */
export function NoDeck({ what }: { what: 'words' | 'phrases' | 'sentences' }) {
  const { licensee } = useRoadFacts();
  return (
    <p className="lesson__card" role="status">
      {licensee
        ? `The deck’s ${what} haven’t been loaded into Waymark yet.`
        : `The ${what} here come from a deck this account can’t read yet. Ask whoever invited you to Waymark to open it; the rest of the city is open to you meanwhile.`}
    </p>
  );
}
