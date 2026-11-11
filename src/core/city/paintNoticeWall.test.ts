import { describe, expect, it } from 'vitest';
import { NOTICE_WALL_STAGE, paintNoticeWall } from './paintNoticeWall.ts';

describe('the painted guildhall wall behind the Notice Board (roadmap A4)', () => {
  it('paints the same wall every time', () => {
    expect(paintNoticeWall()).toBe(paintNoticeWall());
  });

  it('paints a whole wall for its stage, with no unfinished numbers', () => {
    const svg = paintNoticeWall();
    expect(NOTICE_WALL_STAGE).toEqual({ width: 1920, height: 1080 });
    expect(svg).toContain('<defs>');
    expect(svg).toContain('nw-wall');
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });
});
