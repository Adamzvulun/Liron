import { describe, expect, it } from 'vitest';
import { lampSpots, paintTower, TOWER_STAGE } from './paintTower.ts';

describe('the painted Signal Tower (#33)', () => {
  it('paints the same room every time', () => {
    expect(paintTower()).toEqual(paintTower());
  });

  it('paints every station inside the stage', () => {
    const { stations } = paintTower();
    for (const { svg, box } of Object.values(stations)) {
      expect(svg).toContain('<path');
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(TOWER_STAGE.width);
      expect(box.y + box.h).toBeLessThanOrEqual(TOWER_STAGE.height);
    }
  });

  it('hangs a chapter’s lamps up the stair, first at the bottom, last at the top', () => {
    const spots = lampSpots(8);
    expect(spots).toHaveLength(8);
    const [first] = spots;
    const last = spots[spots.length - 1];
    expect(first && last && first.y > last.y).toBe(true);
    for (const { x, y } of spots) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(TOWER_STAGE.width);
      expect(y).toBeGreaterThan(0);
    }
  });
});
