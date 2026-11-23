import { describe, expect, it } from 'vitest';
import * as house from '../city/paintHouse.ts';
import {
  FURNITURE_PIECES,
  STARTER,
  STARTER_PIECES,
  type Facing,
  type Layout,
  type PieceDef,
} from './layout.ts';
import { chair } from './paintFurniture.ts';
import { paintHome } from './paintHome.ts';
import { avatarScale, cellsQuad, depthAt, floorPoint, moveFloor, moveWall } from './projection.ts';

const defs = new Map<string, PieceDef>(STARTER_PIECES.map((d) => [d.id, d]));
const moved = (id: string, at: [number, number]): Layout => ({
  ...STARTER,
  pieces: STARTER.pieces.map((p) => (p.id === id ? { ...p, at } : p)),
});

describe('the room on the stage (projection.ts)', () => {
  it('lays the grid from the back wall to the front of the floor', () => {
    expect(depthAt(0)).toBe(1);
    expect(depthAt(5)).toBe(2);
    expect(floorPoint(0, 0)).toEqual([510, 720]);
    expect(floorPoint(12, 0)).toEqual([1410, 720]);
    expect(floorPoint(6, 5)).toEqual([960, 1010]);
    expect(floorPoint(0, 5)).toEqual([60, 1010]);
  });

  it('makes rows shallower toward the back', () => {
    const height = (r: number) => (cellsQuad(0, r)[3]?.[1] ?? 0) - (cellsQuad(0, r)[0]?.[1] ?? 0);
    for (let r = 1; r < 5; r++) expect(height(r)).toBeGreaterThan(height(r - 1));
  });

  it('sets a moved piece down on its new front edge, smaller farther back', () => {
    // The chest, painted standing on (1475, 960), carried to columns 6–7, rows 1–2.
    const t = moveFloor([1475, 960], [6, 1], [2, 2]);
    const [x, y] = floorPoint(7, 3);
    expect(t).toContain(`translate(${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100})`);
    const s = Number(/scale\(([\d.]+)\)/.exec(t)?.[1]);
    expect(s).toBeCloseTo(depthAt(3) / ((960 - 430) / 290), 2);
    expect(t).not.toContain('scale(-1 1)');
    // Across the middle of the room it is mirrored.
    expect(moveFloor([1475, 960], [1, 3], [2, 2])).toContain('scale(-1 1)');
    expect(moveWall(530, 530)).toBe('');
    expect(moveWall(530, 640)).toBe('translate(110 0)');
  });

  it('draws the avatar larger at the front', () => {
    expect(avatarScale(0)).toBe(1.22);
    expect(avatarScale(4)).toBe(1.72);
  });
});

describe('paintHome (task 7.1)', () => {
  it('draws the starter room exactly as painted: every piece in place, none moved', () => {
    const svg = paintHome(STARTER, defs);
    for (const paint of [
      house.bed,
      house.rug,
      house.desk,
      house.cupboard,
      house.chest,
      house.pictureOverTheBed,
      house.lantern,
      house.shelf,
      house.letterbox,
    ])
      expect(svg).toContain(paint());
    expect(svg).not.toContain('<g transform');
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('carries a moved piece, and draws nearer pieces over farther ones', () => {
    const svg = paintHome(moved('home:chest', [6, 1]), defs);
    expect(svg).toContain(`<g transform="${moveFloor([1475, 960], [6, 1], [2, 2])}">`);
    // The chest now stands behind the bed, so it comes first.
    expect(svg.indexOf(house.chest())).toBeLessThan(svg.indexOf(house.bed()));
    expect(paintHome(STARTER, defs).indexOf(house.chest())).toBeGreaterThan(
      paintHome(STARTER, defs).indexOf(house.bed()),
    );
  });

  it('shows the grid, the wall slots and the marks only in Decorate', () => {
    const cells = (svg: string) => (svg.match(/<path d="M[^"]*Z"\/>/g) ?? []).length;
    expect(cells(paintHome(STARTER, defs, { grid: true })) - cells(paintHome(STARTER, defs))).toBe(
      60,
    );
    expect(paintHome(STARTER, defs, { grid: true })).toContain('stroke-dasharray="8 6"');
    expect(
      paintHome(STARTER, defs, {
        marks: [
          {
            cells: [
              [5, 1],
              [6, 1],
            ],
            tone: 'no',
          },
        ],
      }),
    ).toContain('#E0655A');
  });

  it('puts what stands in the room among the pieces by row', () => {
    const svg = paintHome(STARTER, defs, { standing: [{ row: 0, svg: '<g id="me"/>' }] });
    // Standing at the back, the avatar is drawn behind the bed.
    expect(svg.indexOf('<g id="me"/>')).toBeLessThan(svg.indexOf(house.bed()));
  });
});

describe('a turned chair (task 8.3)', () => {
  const all = new Map<string, PieceDef>(
    [...STARTER_PIECES, ...FURNITURE_PIECES].map((d) => [d.id, d]),
  );
  const at = (x: number, facing: Facing): Layout => ({
    ...STARTER,
    pieces: [...STARTER.pieces, { id: 'home-chair', at: [x, 2], facing }],
  });

  it('is painted four different ways', () => {
    const ways = (['right', 'away', 'to-left', 'to-right'] as const).map((f) => chair(f));
    expect(new Set(ways).size).toBe(4);
    // Facing the room is the same chair whichever side it stands.
    expect(chair('left')).toBe(chair('right'));
  });

  it('keeps facing the way it was turned when mirrored across the middle', () => {
    // Left of the middle the chair is painted as turned; right of it, mirrored, the side turns
    // swap, so a chair turned to the left still looks left.
    expect(paintHome(at(2, 'to-left'), all)).toContain(chair('to-left'));
    expect(paintHome(at(9, 'to-left'), all)).toContain(chair('to-right'));
    expect(paintHome(at(9, 'away'), all)).toContain(chair('away'));
    expect(paintHome(at(9, 'left'), all)).toContain(chair());
  });
});
