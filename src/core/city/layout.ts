// Where things stand in the painted square (stage coordinates, 1920×1080), and which subject
// lives in which building. Subjects are matched by id, so the city never imports a subject.
import type { PlaceId } from './painter.js';

export const STAGE = { width: 1920, height: 1080 } as const;

export interface Plaque {
  x: number;
  y: number;
  width: number;
  /** Name shown on the plaque when no subject lives there. */
  title: string;
  /** Smaller lettering, e.g. the Notice Board's plaque. */
  small?: boolean;
}

export const PLAQUES: Record<PlaceId, Plaque> = {
  tower: { x: 615, y: 700, width: 180, title: 'Signal Tower' },
  caravanserai: { x: 1135, y: 704, width: 210, title: 'Caravanserai' },
  board: { x: 810, y: 806, width: 148, title: 'Notice Board', small: true },
  house: { x: 240, y: 940, width: 190, title: 'Your House' },
  market: { x: 1560, y: 944, width: 160, title: 'Market' },
};

/** The building each subject's hall is in. */
export const SUBJECT_BUILDINGS: Readonly<Record<string, PlaceId>> = {
  morse: 'tower',
  arabic: 'caravanserai',
};

/** What each building is, for screen readers. */
export const PLACE_LABELS: Record<PlaceId, string> = {
  tower: 'Morse code',
  caravanserai: 'Palestinian Arabic',
  board: "Today's quests",
  house: 'Wardrobe, trophies and stats',
  market: 'Gear and items',
};

/** The Arena's sign: locked until the Fellowship opens (M5). */
export const ARENA_SIGN = { x: 250, y: 262, text: 'The Arena · Locked' } as const;
