// What the site knows about this player that a road depends on (task 2.1, ADR 0050; the v1
// review's lows 3 and 4): may they read the deck, and is the AI partner set up on this site.
// The platform asks once per page and hands the answer to the compass and to every hall, so the
// square and the halls never disagree about the next step.
import { createContext, useContext } from 'react';
import type { RoadContext } from './road.ts';

export type RoadFacts = Pick<RoadContext, 'licensee' | 'partner'>;

/**
 * Until the site has answered, or when it can't: the common case. Every account is a licensee
 * (ADR 0050), and a site whose services can't be asked is assumed to have its keys, so a slow
 * answer never sends a player away from a station that works.
 */
export const ASSUMED_FACTS: RoadFacts = { licensee: true, partner: 'ready' };

export interface FactSources {
  /** The database's own answer: is the signed-in account a licensee of the deck? */
  licensee(): Promise<boolean>;
  /** Is Sit and talk switched on (#316)? null when the site couldn't say. */
  talk(): Promise<boolean | null>;
}

/**
 * Asks both at once; whatever fails falls back to the assumed answer. A full answer is kept for
 * the page. One that failed, or a site that couldn't say, is asked again next time, so a moment
 * offline doesn't fix the wrong road for the rest of the visit (review, 2026-11-18).
 */
export function readFacts(sources: FactSources): () => Promise<RoadFacts> {
  let asked: Promise<RoadFacts> | null = null;
  return () =>
    (asked ??= Promise.all([
      sources.licensee().then(
        (yes) => ({ yes, sure: true }),
        () => ({ yes: ASSUMED_FACTS.licensee, sure: false }),
      ),
      sources.talk().catch(() => null),
    ]).then(([licensee, talk]) => {
      if (!licensee.sure || talk === null) asked = null;
      return { licensee: licensee.yes, partner: talk === false ? 'off' : 'ready' };
    }));
}

export const RoadFactsContext = createContext<RoadFacts>(ASSUMED_FACTS);

/** The facts a hall walks its road with. */
export const useRoadFacts = (): RoadFacts => useContext(RoadFactsContext);
