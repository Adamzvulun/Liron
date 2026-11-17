import { describe, expect, it } from 'vitest';
import { ARENA_STAGE, paintArena } from './paintArena.ts';

describe('the painted Arena (task 3.4)', () => {
  it('paints the same Arena every time', () => {
    expect(paintArena()).toBe(paintArena());
  });

  it('paints a whole Arena for its stage, with no unfinished numbers', () => {
    const svg = paintArena();
    expect(ARENA_STAGE).toEqual({ width: 1920, height: 1080 });
    expect(svg).toContain('ar-sky');
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });
});
