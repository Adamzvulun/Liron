import { describe, expect, it } from 'vitest';
import { MARKET_STAGE, paintMarket } from './paintMarket.ts';

describe('the painted bazaar lane behind the Market (roadmap A3)', () => {
  it('paints the same lane every time', () => {
    expect(paintMarket()).toBe(paintMarket());
  });

  it('paints a whole lane for its stage, with no unfinished numbers', () => {
    const svg = paintMarket();
    expect(MARKET_STAGE).toEqual({ width: 1920, height: 1080 });
    expect(svg).toContain('<defs>');
    expect(svg).toContain('mk-sky');
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });
});
