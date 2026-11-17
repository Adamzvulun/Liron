import { describe, expect, it } from 'vitest';
import { TABLE_STAGE, paintTable } from './paintTable.ts';

describe('the painted innkeeper’s table, The Stranger at the Gate (task 4.2)', () => {
  it('paints the same table every time', () => {
    expect(paintTable()).toBe(paintTable());
  });

  it('paints a whole table for its stage, with no unfinished numbers', () => {
    const svg = paintTable();
    expect(TABLE_STAGE).toEqual({ width: 1200, height: 800 });
    expect(svg).toContain('tb-wall');
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });
});
