import { describe, expect, it } from 'vitest';
import { LISTENING_DESK_STAGE, paintListeningDesk } from './paintListeningDesk.ts';
import { MORSE_CHARS } from '../code.ts';

describe('the listening desk up close (roadmap A6)', () => {
  it('paints the same desk every time', () => {
    expect(paintListeningDesk()).toBe(paintListeningDesk());
  });

  it('paints a whole scene for its stage, with no unfinished numbers', () => {
    const svg = paintListeningDesk();
    expect(LISTENING_DESK_STAGE).toEqual({ width: 1920, height: 1080 });
    expect(svg).toContain('Koch order');
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('puts the Koch order on the chart, K and M first', () => {
    const letters = [...paintListeningDesk().matchAll(/font-size="28"[^>]*>([^<]+)</g)].map(
      (m) => m[1],
    );
    expect(letters.slice(0, 2)).toEqual(['K', 'M']);
    expect(letters).toEqual(MORSE_CHARS.map((c) => c.char));
  });
});
