// One voice at a time (docs/game/the-guide.md R5, R9; #408). The first page, the celebrations
// (a level-up, the daily goal) and the guide all want the screen; on a phone they would stack and
// their focus traps would fight. Only one speaks, and the guide, the least urgent, waits for a
// visit to the square with no celebration in it.
import { useState } from 'react';

export type Voice = 'celebration' | 'first-page' | 'guide' | null;

export interface Wanting {
  /** A level-up or a daily goal is waiting to be celebrated. */
  celebration: boolean;
  /** The first page is due (a player with no step done, who hasn't closed it). */
  firstPage: boolean;
  /** The guide has a line due. */
  guide: boolean;
  /** The player is on the square: the guide speaks nowhere else. */
  onSquare: boolean;
  /** Something else already spoke during this visit to the square. */
  spokenThisVisit: boolean;
  /** The player tapped Nour: the guide answers even in a visit something else spoke in. */
  asked?: boolean;
}

/** Who has the screen now. A celebration first, then the first page, then the guide. */
export function whoSpeaks(w: Wanting): Voice {
  if (w.celebration) return 'celebration';
  if (w.firstPage && w.onSquare) return 'first-page';
  if (w.guide && w.onSquare && (w.asked || !w.spokenThisVisit)) return 'guide';
  return null;
}

/** What the square remembers of this visit. */
export interface Visit {
  onSquare: boolean;
  /** A celebration has spoken since the player arrived. */
  spoken: boolean;
}

/**
 * The visit after one more render. A visit starts each time the player arrives on the square,
 * so a celebration quiets the guide until the player leaves and comes back.
 */
export function nextVisit(before: Visit, onSquare: boolean, speaking: Voice): Visit {
  const arrived = onSquare && !before.onSquare;
  // The first page opens the way for the welcome (R2), so only a celebration quiets the visit.
  const spoke = onSquare && speaking === 'celebration';
  return { onSquare, spoken: spoke || (!arrived && onSquare && before.spoken) };
}

/** Whether a celebration has spoken during this visit to the square. */
export function useSpokenThisVisit(onSquare: boolean, speaking: Voice): boolean {
  // React's "information from previous renders" pattern: the visit moves on when what it's
  // made from changes, during render, so the guide never shows for a frame it shouldn't.
  const [kept, setKept] = useState(() => ({
    onSquare,
    speaking,
    visit: nextVisit({ onSquare: false, spoken: false }, onSquare, speaking),
  }));
  if (kept.onSquare !== onSquare || kept.speaking !== speaking) {
    const visit = nextVisit(kept.visit, onSquare, speaking);
    setKept({ onSquare, speaking, visit });
    return visit.spoken;
  }
  return kept.visit.spoken;
}
