import { describe, expect, it } from 'vitest';
import * as house from './paintHouse.ts';
import { HOUSE_STAGE, paintHouse } from './paintHouse.ts';

describe('the painted room in Your House (roadmap A2)', () => {
  it('paints the same room every time', () => {
    expect(paintHouse()).toBe(paintHouse());
  });

  it('paints a whole room for its stage, with no unfinished numbers', () => {
    const svg = paintHouse();
    expect(HOUSE_STAGE).toEqual({ width: 1920, height: 1080 });
    expect(svg).toContain('<defs>');
    expect(svg).toContain('hs-pane');
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });

  // The home is drawn from these pieces (task 7.1, the-home.md §3).
  const pieces = {
    bed: house.bed,
    rug: house.rug,
    desk: house.desk,
    cupboard: house.cupboard,
    chest: house.chest,
    picture: house.pictureOverTheBed,
    lantern: house.lantern,
    shelf: house.shelf,
    letterbox: house.letterbox,
  };
  for (const [name, paint] of Object.entries(pieces))
    it(`paints the ${name} as one finished piece`, () => {
      const svg = paint();
      expect(svg).toBe(paint());
      expect(svg.length).toBeGreaterThan(100);
      expect(svg).not.toMatch(/NaN|undefined|Infinity/);
      expect(svg).not.toContain('<defs>');
      // Every element is closed, so the piece can be wrapped in a <g> and moved.
      expect(svg.match(/<[a-z]+[\s>]/g)?.length).toBe(
        (svg.match(/\/>/g)?.length ?? 0) + (svg.match(/<\/[a-z]+>/g)?.length ?? 0),
      );
    });
});
