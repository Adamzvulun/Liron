// Types for painter.js (plain JS, ported from the concept tool).
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PaintedPart {
  /** Where the part sits on the 1920×1080 stage. */
  box: Box;
  /** SVG markup in stage coordinates. */
  svg: string;
}

export type PlaceId = 'tower' | 'caravanserai' | 'board' | 'house' | 'market';

export interface PaintedCity {
  /** Gradients and filters every layer refers to. */
  defs: string;
  layers: { sky: string; ground: string; mid: string; front: string };
  places: Record<PlaceId, PaintedPart>;
  avatar: PaintedPart;
}

export function paintCity(): PaintedCity;
