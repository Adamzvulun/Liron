import { describe, expect, it } from 'vitest';
import * as house from '../city/paintHouse.ts';
import items from '../../../content/core/items.json' with { type: 'json' };
import {
  FURNITURE_PIECES,
  ownedStyles,
  ROOM,
  STARTER,
  STARTER_PIECES,
  STYLES,
  type Layout,
  type PieceDef,
} from './layout.ts';
import { FURNITURE } from './paintFurniture.ts';
import { paintHome } from './paintHome.ts';

// The furniture to buy or find, and the room's styles (task 7.4, the-home.md §7).
const defs = new Map<string, PieceDef>(
  [...STARTER_PIECES, ...FURNITURE_PIECES].map((d) => [d.id, d]),
);
const closed = (svg: string) =>
  (svg.match(/<[a-z]+[\s>]/g)?.length ?? 0) ===
  (svg.match(/\/>/g)?.length ?? 0) + (svg.match(/<\/[a-z]+>/g)?.length ?? 0);

describe('the furniture', () => {
  it('paints every piece in content/core/home.json, at its size, and nothing else', () => {
    expect(Object.keys(FURNITURE).sort()).toEqual(FURNITURE_PIECES.map((d) => d.id).sort());
    for (const d of FURNITURE_PIECES) {
      const painted = FURNITURE[d.id as keyof typeof FURNITURE];
      expect(painted.size, d.id).toEqual(d.size);
      expect('wallX' in painted, d.id).toBe(d.place === 'wall');
    }
  });

  for (const d of FURNITURE_PIECES)
    it(`paints the ${d.name} as one finished piece, with no filters`, () => {
      const painted = FURNITURE[d.id as keyof typeof FURNITURE];
      const svg = painted.paint();
      expect(svg).toBe(painted.paint());
      expect(svg.length).toBeGreaterThan(200);
      expect(svg).not.toMatch(/NaN|undefined|Infinity|filter|mix-blend/);
      expect(closed(svg), 'every element closed').toBe(true);
      // Floor pieces are painted left of the middle, so the side they show is the right one.
      if ('origin' in painted) expect(painted.origin[0]).toBeLessThan(960);
    });

  it('carries each piece into the room, wherever it is placed', () => {
    const spots: Record<string, Layout['pieces'][number]> = {
      'home-chair': { id: 'home-chair', at: [6, 2], facing: 'left' },
      'home-bench': { id: 'home-bench', at: [4, 4], facing: 'left' },
      'home-table': { id: 'home-table', at: [5, 1], facing: 'left' },
      'home-plant': { id: 'home-plant', at: [3, 0], facing: 'left' },
      'home-bookcase': { id: 'home-bookcase', at: [6, 0], facing: 'left' },
      'home-cushion': { id: 'home-cushion', at: [2, 4], facing: 'left' },
      'home-stove': { id: 'home-stove', at: [6, 1], facing: 'left' },
      'home-kilim': { id: 'home-kilim', at: [4, 0], facing: 'left' },
      'home-window-seat': { id: 'home-window-seat', at: [4, 4], facing: 'left' },
    };
    for (const d of FURNITURE_PIECES) {
      const placed =
        spots[d.id] ??
        // Wall pieces take the picture's place.
        ({ id: d.id, slot: 0 } as const);
      const pieces =
        'slot' in placed ? STARTER.pieces.filter((p) => p.id !== 'home:picture') : STARTER.pieces;
      const svg = paintHome({ ...STARTER, pieces: [...pieces, placed] }, defs);
      const art = FURNITURE[d.id as keyof typeof FURNITURE].paint();
      expect(svg, d.id).toContain(`">${art}</g>`);
    }
  });
});

describe('the wallpapers and floors', () => {
  it('sells every painted style but the plain ones, each an item of kind style (#443)', () => {
    expect(STYLES.filter((s) => s.part === 'wallpaper').map((s) => s.style)).toEqual(
      house.WALLPAPERS.filter((w) => !ROOM.wallpapers.includes(w)),
    );
    expect(STYLES.filter((s) => s.part === 'floor').map((s) => s.style)).toEqual(
      house.FLOORS.filter((w) => !ROOM.floors.includes(w)),
    );
    const sold = items.items.filter((i) => i.data.kind === 'style').map((i) => i.id);
    expect(sold.sort()).toEqual(STYLES.map((s) => s.id).sort());
    for (const s of STYLES) expect(s.id).toBe(`${s.part}-${s.style}`);
  });

  it('lets a player use the plain room and the styles they own', () => {
    expect(ownedStyles([])).toEqual({ wallpapers: ['plaster'], floors: ['planks'] });
    expect(ownedStyles(['wallpaper-zellige', 'floor-dark-oak', 'home-chair'])).toEqual({
      wallpapers: ['plaster', 'zellige'],
      floors: ['planks', 'dark-oak'],
    });
  });

  it('leaves the plain room as it was painted', () => {
    expect(house.room({ wallpaper: 'plaster', floor: 'planks' })).toBe(house.room());
  });

  it('paints each style, each one different', () => {
    const seen = new Set<string>();
    for (const wallpaper of house.WALLPAPERS)
      for (const floor of house.FLOORS) {
        const svg = house.room({ wallpaper, floor });
        expect(svg).not.toMatch(/NaN|undefined|Infinity|filter|mix-blend/);
        expect(closed(svg)).toBe(true);
        seen.add(svg);
      }
    expect(seen.size).toBe(house.WALLPAPERS.length * house.FLOORS.length);
  });

  it('draws the room in the layout’s style, and the plain room for one it doesn’t know', () => {
    expect(paintHome({ ...STARTER, wallpaper: 'zellige', floor: 'terracotta' }, defs)).toContain(
      'url(#hs-floor-terracotta)',
    );
    expect(paintHome({ ...STARTER, wallpaper: 'gold-leaf', floor: 'marble' }, defs)).toContain(
      house.room(),
    );
  });
});
