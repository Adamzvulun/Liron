// What a station's result screen needs to know to offer the road's next step
// (docs/game/the-road.md §6): given by the hall around it, read by <NextStep>.
import { createContext } from 'react';
import type { ReactNode } from 'react';
import type { RoadAnswer, RoadStep } from './road.ts';

export interface RoadReading {
  answer: RoadAnswer;
  /** The steps of this player's road that are done, in road order. */
  done: readonly RoadStep[];
}

export interface RoadHere {
  /** The door this screen is behind. */
  view: string;
  /** The ids of the steps that were done when the door was opened; null until read. */
  before: ReadonlySet<string> | null;
  /** The subject's saved state now (it waits for a save still on its way). */
  loadState(): Promise<unknown>;
  read(state: unknown): RoadReading;
  /** Opens a door of the hall, afresh even if it is this one; 'hall' goes back to the hall. */
  go(door: string): void;
  /** Shows a beat; a subject with its own script marks it up here. */
  text?: (words: string) => ReactNode;
}

export const RoadHereContext = createContext<RoadHere | null>(null);
