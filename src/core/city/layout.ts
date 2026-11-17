// Where things stand in the painted square (stage coordinates, 1920×1080), and which subject
// lives in which building. Each subject names its building (ADR 0019), so the city never
// imports a subject.
import type { SubjectInfo } from '../subject.ts';
import type { PlaceId } from './painter.js';

export const STAGE = { width: 1920, height: 1080 } as const;

/** At most this share of the stage's width or height may be cut off to fill the window. */
const MAX_CROP = 0.18;
/** When height is cut off, this share of it comes off the top (sky), the rest off the bottom. */
const CROP_FROM_TOP = 0.7;

/**
 * Scale and position for the 1920×1080 stage: it fills the window without distortion, cutting
 * off at most 18% of an edge (mostly sky); windows further from 16:9 show the scene's sky and
 * ground colours around it.
 */
export function stageFit(width: number, height: number) {
  const sx = width / STAGE.width;
  const sy = height / STAGE.height;
  const scale = Math.min(Math.max(sx, sy), sx / (1 - MAX_CROP), sy / (1 - MAX_CROP));
  const overX = STAGE.width * scale - width;
  const overY = STAGE.height * scale - height;
  return {
    scale,
    x: -overX / 2,
    y: overY > 0 ? -overY * CROP_FROM_TOP : -overY / 2,
  };
}

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

/** What each building is, for screen readers. A hall's resident subject gives its own. */
export const PLACE_LABELS: Record<PlaceId, string> = {
  tower: 'An empty guild hall',
  caravanserai: 'An empty guild hall',
  board: 'Today’s quests',
  house: 'Wardrobe, trophies and stats',
  market: 'Gear and items',
};

/** The Arena's sign, over the far amphitheater: challenges between friends (task 3.4). */
export const ARENA_SIGN = { x: 250, y: 262, text: 'The Arena' } as const;

/** Each place's address. Halls and screens get shareable URLs; the square is "/". */
export const PLACE_PATHS: Record<PlaceId, string> = {
  tower: '/signal-tower',
  caravanserai: '/caravanserai',
  board: '/notice-board',
  house: '/house',
  market: '/market',
};

/** What each place's screen says until its real content arrives. */
export const PLACE_SOON: Record<PlaceId, string> = {
  tower: 'No guild has moved in yet.',
  caravanserai: 'No guild has moved in yet.',
  board: 'Today’s quests will be posted here.',
  house: 'Your wardrobe, ledger and trophies are kept here.',
  market: 'Gear and items will be for sale here.',
};

/** Where the player's avatar stands in the square: by the compass, 190 design px tall. */
export const AVATAR_SPOT = { x: 1010, feetY: 938, scale: 0.74 } as const;

/**
 * Where friends stand in the square (task 3.3), nearest first, a little smaller than you. At
 * most eight, so the square stays inside the speed budget (fellowship-build.md §5).
 */
export const FRIEND_SPOTS = [
  { x: 800, feetY: 960 },
  { x: 1220, feetY: 965 },
  { x: 660, feetY: 1010 },
  { x: 1370, feetY: 1015 },
  { x: 900, feetY: 1040 },
  { x: 1110, feetY: 1045 },
  { x: 520, feetY: 1050 },
  { x: 1520, feetY: 1055 },
] as const;
export const FRIEND_SCALE = 0.56;

/** Which subject lives in which building. */
export function residentsOf(subjects: readonly SubjectInfo[]): Map<PlaceId, SubjectInfo> {
  const residents = new Map<PlaceId, SubjectInfo>();
  for (const s of subjects) {
    if (s.building) residents.set(s.building, s);
  }
  return residents;
}

/** The place at a path, if any; a trailing slash ("/market/") is the same place. */
export function placeAt(path: string): PlaceId | undefined {
  const at = path.replace(/\/+$/, '') || '/';
  return (Object.keys(PLACE_PATHS) as PlaceId[]).find((id) => PLACE_PATHS[id] === at);
}

/** How long the avatar walks before the place opens, in ms: long enough to see, short enough not to wait. */
export const WALK_MS = 300;

/** The avatar's walk toward a building's door: part of the way, at most 240 stage pixels. */
export function stepToward(door: { x: number; y: number; w: number; h: number }) {
  const dx = door.x + door.w / 2 - AVATAR_SPOT.x;
  const dy = Math.min(0, door.y + door.h - AVATAR_SPOT.feetY);
  const far = Math.hypot(dx, dy) || 1;
  const go = Math.min(far * 0.4, 240) / far;
  return { dx: Math.round(dx * go), dy: Math.round(dy * go) };
}
