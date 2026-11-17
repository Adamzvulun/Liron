import { describe, expect, it } from 'vitest';
import { BEACON_STAGE, paintBeacon } from './paintBeacon.ts';

describe('the painted lantern room, Forty Winters (task 4.2)', () => {
  it('paints the same room every time', () => {
    expect(paintBeacon()).toBe(paintBeacon());
  });

  it('paints a whole room for its stage, with no unfinished numbers', () => {
    const svg = paintBeacon();
    expect(BEACON_STAGE).toEqual({ width: 1200, height: 800 });
    expect(svg).toContain('bc-sky');
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });
});
