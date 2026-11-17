// Types for painter.js (plain JS, ported from the concept tool).
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * One animated piece, cut out of the static scene (#123, ADR 0025 amended). The page draws it
 * as its own small layer and animates only its transform and opacity.
 */
export interface Sprite {
  /** The motion's class in city.css, e.g. `wm-pulse`. */
  motion: string;
  /** Where the piece sits on the 1920×1080 stage. */
  box: Box;
  /** SVG markup in stage coordinates. */
  svg: string;
  /** The point it scales or rotates about, in stage pixels; the box's centre if absent. */
  origin?: { x: number; y: number };
}

/** Static SVG markup and sprites, in paint order. */
export type Segment = string | Sprite;

export interface PaintedPart {
  /** Where the part sits on the 1920×1080 stage. */
  box: Box;
  /** Its static markup (in stage coordinates) and sprites, in paint order. */
  segments: Segment[];
}

export type PlaceId = 'tower' | 'caravanserai' | 'board' | 'house' | 'market';

export interface PaintedCity {
  /** Gradients and filters every layer refers to. */
  defs: string;
  layers: { sky: Segment[]; ground: Segment[]; mid: Segment[]; front: Segment[] };
  places: Record<PlaceId, PaintedPart>;
  avatar: PaintedPart;
  /** Empty plots where future guilds can build. */
  plots: PaintedPart[];
}

export function paintCity(): PaintedCity;
