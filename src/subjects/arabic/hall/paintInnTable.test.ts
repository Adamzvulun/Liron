import { describe, expect, it } from 'vitest';
import { INN_TABLE_STAGE, paintInnTable } from './paintInnTable.ts';

describe('the innkeeper’s table up close (roadmap A6)', () => {
  it('paints the same table every time', () => {
    expect(paintInnTable()).toBe(paintInnTable());
  });

  it('paints a whole scene for its stage, with no unfinished numbers', () => {
    const svg = paintInnTable();
    expect(INN_TABLE_STAGE).toEqual({ width: 1920, height: 1080 });
    expect(svg).toContain('<defs>');
    expect(svg).toContain('it-brass');
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });
});
