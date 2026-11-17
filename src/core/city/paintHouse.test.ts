import { describe, expect, it } from 'vitest';
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
});
