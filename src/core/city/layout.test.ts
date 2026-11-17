import { describe, expect, it } from 'vitest';
import { placeAt, stageFit } from './layout.ts';

const visible = (w: number, h: number) => {
  const { scale, x, y } = stageFit(w, h);
  return { scale, x, y, right: x + 1920 * scale, bottom: y + 1080 * scale };
};

describe('stageFit', () => {
  it('fits a 16:9 window exactly', () => {
    const v = visible(1920, 1080);
    expect([v.scale, v.x + 0, v.y + 0, v.right, v.bottom]).toEqual([1, 0, 0, 1920, 1080]);
  });

  it('fills a wider window, cutting mostly sky off the top', () => {
    const v = visible(1866, 935); // Adam's browser window
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.right).toBeCloseTo(1866, 6);
    expect(v.y).toBeLessThan(0);
    expect(v.bottom).toBeGreaterThan(935);
    expect(-v.y).toBeGreaterThan(2 * (v.bottom - 935)); // more off the top than the bottom
  });

  it('fills a squarer window by trimming the sides a little', () => {
    const v = visible(1600, 1000);
    expect(v.y).toBeCloseTo(0, 6);
    expect(v.bottom).toBeCloseTo(1000, 6);
    expect(v.x).toBeCloseTo(-(v.right - 1600), 6); // the same off each side
  });

  it('never cuts more than 18% of an edge; beyond that it leaves room around', () => {
    const v = visible(1280, 1024); // 5:4
    expect((v.right - v.x - 1280) / (v.right - v.x)).toBeCloseTo(0.18, 6);
    expect(v.y).toBeGreaterThan(0);
    const wide = visible(3440, 1440); // ultrawide
    expect((wide.bottom - wide.y - 1440) / (wide.bottom - wide.y)).toBeCloseTo(0.18, 6);
    expect(wide.x).toBeGreaterThan(0);
  });
});

describe('placeAt', () => {
  it('finds a place with or without a trailing slash (review, 2026-11-15)', () => {
    expect(placeAt('/market')).toBe('market');
    expect(placeAt('/market/')).toBe('market');
    expect(placeAt('/')).toBeUndefined();
    expect(placeAt('/nowhere')).toBeUndefined();
  });
});

describe('the walk to a door (task 4.6)', () => {
  it('goes part of the way toward the door, never down, and never far', async () => {
    const { stepToward, AVATAR_SPOT } = await import('./layout.ts');
    const right = stepToward({ x: AVATAR_SPOT.x + 400, y: 300, w: 200, h: 300 });
    expect(right.dx).toBeGreaterThan(0);
    expect(right.dy).toBeLessThan(0);
    expect(Math.hypot(right.dx, right.dy)).toBeLessThanOrEqual(240);
    const near = stepToward({ x: AVATAR_SPOT.x - 60, y: AVATAR_SPOT.feetY - 100, w: 20, h: 100 });
    expect(near).toEqual({ dx: -20, dy: 0 });
    const below = stepToward({ x: AVATAR_SPOT.x, y: AVATAR_SPOT.feetY, w: 0, h: 50 });
    expect(below.dy).toBe(0);
  });
});
