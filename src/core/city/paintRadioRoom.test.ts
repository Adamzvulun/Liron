import { describe, expect, it } from 'vitest';
import { paintRadioRoom, RADIO_STAGE } from './paintRadioRoom.ts';

describe('the painted Radio Room off the Signal Tower (roadmap A5)', () => {
  it('paints the same room every time', () => {
    expect(paintRadioRoom()).toBe(paintRadioRoom());
  });

  it('paints a whole room for its stage, with no unfinished numbers', () => {
    const svg = paintRadioRoom();
    expect(RADIO_STAGE).toEqual({ width: 1920, height: 1080 });
    expect(svg).toContain('<defs>');
    expect(svg).toContain('rr-dial');
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });
});
