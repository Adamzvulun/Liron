// What the guide has shown, handed to places and to the subjects' halls (the-guide.md §3.4,
// #411), so a first-visit card shows once per player, on any device. Subjects reach it only
// through FirstVisit, so the platform names no subject and a subject reads no profile.
import { createContext, useContext } from 'react';

export interface GuideMemory {
  /** Ids already shown (seen.ts). */
  seen: ReadonlySet<string>;
  /** Saves an id as shown. */
  mark(id: string): void;
}

export const GuideContext = createContext<GuideMemory | null>(null);

export const useGuide = () => useContext(GuideContext);

/** Where the Guidebook opens (#412), from Settings or by tapping Nour. */
export const GUIDEBOOK_PATH = '/guidebook';
