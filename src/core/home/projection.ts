// Where the room's grid lies on the 1920 × 1080 stage (docs/game/the-home.md §2, ADR 0055).
// The house is painted in one-point perspective: the vanishing point is at (960, 430) and the
// back wall stands on y = 720. A floor point at lateral distance X from the middle, at depth
// factor t (1 at the back wall, larger toward you), is drawn at (960 + X·t, 430 + 290·t).
//
// The 12 × 5 grid spans X = −450 to 450, and its rows are equal in real depth, from the back
// wall (t = 1) to the front of the floor (t = 2). Cells are given by their column and row, and
// may be fractional: (0, 0) is the back left corner, (12, 5) the front right one.
import { ROOM } from './layout.ts';

export type Pt = readonly [x: number, y: number];

export const VP: Pt = [960, 430];
const FOOT = 720;
const HALF_WIDTH = 450;
const FRONT_T = 2;

/** The depth factor at a row line (0 is the back wall, 5 the front of the floor). */
export const depthAt = (row: number): number => 1 / (1 - (1 - 1 / FRONT_T) * (row / ROOM.rows));

/** The lateral world position of a column line (0 is the left edge of the grid). */
export const lateralAt = (col: number): number => -HALF_WIDTH + (2 * HALF_WIDTH * col) / ROOM.cols;

/** A point of the floor, by (fractional) column and row, on the stage. */
export function floorPoint(col: number, row: number): Pt {
  const t = depthAt(row);
  return [VP[0] + lateralAt(col) * t, VP[1] + (FOOT - VP[1]) * t];
}

/** The four corners of a run of cells: back left, back right, front right, front left. */
export function cellsQuad(col: number, row: number, w = 1, d = 1): Pt[] {
  return [
    floorPoint(col, row),
    floorPoint(col + w, row),
    floorPoint(col + w, row + d),
    floorPoint(col, row + d),
  ];
}

/**
 * The SVG transform that carries a floor piece to a place on the grid. `origin` is the point
 * where it was painted standing: the middle of its front edge, on the floor. The piece is
 * scaled by the change in depth there, as everything shrinks toward the vanishing point, and
 * set down with that point on the middle of the front edge of its new footprint. Mirrored when
 * it crosses the middle of the room, so its side shows the right way.
 */
export function moveFloor(
  origin: Pt,
  to: readonly [number, number],
  size: readonly [number, number],
): string {
  const [w, d] = size;
  const ta = (origin[1] - VP[1]) / (FOOT - VP[1]);
  const [x, y] = floorPoint(to[0] + w / 2, to[1] + d);
  const s = depthAt(to[1] + d) / ta;
  const parts = [`translate(${r(x)} ${r(y)})`, `scale(${r(s)})`];
  if (Math.sign(origin[0] - VP[0]) * Math.sign(x - VP[0]) < 0) parts.push('scale(-1 1)');
  parts.push(`translate(${r(-origin[0])} ${r(-origin[1])})`);
  return parts.join(' ');
}

/** The transform that carries a wall piece painted at slot x `from` to slot x `to`. */
export const moveWall = (from: number, to: number): string =>
  from === to ? '' : `translate(${r(to - from)} 0)`;

/**
 * How large the avatar is drawn, standing on a row (0 at the back, 4 at the front). Kept a
 * little flatter than true perspective, so the avatar never fills the stage at the front
 * (checked by eye, 2026-11-22).
 */
export const avatarScale = (row: number): number => 1.22 + (0.5 * row) / (ROOM.rows - 1);

/** Where the avatar's feet go, standing in the middle of a cell. */
export const cellFeet = (col: number, row: number): Pt => floorPoint(col + 0.5, row + 0.5);

const r = (n: number) => Math.round(n * 100) / 100;
