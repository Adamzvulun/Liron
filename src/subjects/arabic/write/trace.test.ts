import { describe, expect, it } from 'vitest';
import { dilate, FREE_PASS, gridFrom, scoreTrace, type Grid } from './trace.ts';

/** A grid from rows of '#' and '.'. */
const g = (...rows: string[]): Grid => ({
  size: rows.length,
  cells: Uint8Array.from(rows.join('').split(''), (c) => (c === '#' ? 1 : 0)),
});

const LETTER = g('.....', '.###.', '.....', '..#..', '.....');

describe('the slate’s rough check (#41)', () => {
  it('passes ink that covers the letter and stays near it', () => {
    const ink = g('.....', '.###.', '.....', '..#..', '.....');
    const s = scoreTrace(LETTER, dilate(LETTER, 1), ink);
    expect(s).toMatchObject({ coverage: 1, stray: 0, passed: true });
  });

  it('fails ink that misses most of the letter', () => {
    const ink = g('.....', '.#...', '.....', '.....', '.....');
    expect(scoreTrace(LETTER, dilate(LETTER, 1), ink).passed).toBe(false);
  });

  it('fails scribbling over everything', () => {
    const ink = g('#####', '#####', '#####', '#####', '#####');
    const s = scoreTrace(LETTER, dilate(LETTER, 0), ink);
    expect(s.coverage).toBe(1);
    expect(s.passed).toBe(false);
  });

  it('is looser from memory', () => {
    const ink = g('.....', '.##..', '.#...', '.....', '.....');
    const strict = scoreTrace(LETTER, dilate(LETTER, 1), ink);
    const loose = scoreTrace(LETTER, dilate(LETTER, 1), ink, FREE_PASS);
    expect(strict.passed).toBe(false);
    expect(loose.coverage).toBeCloseTo(0.5);
    expect(dilate(LETTER, 1).cells.filter((c) => c).length).toBeGreaterThan(4);
  });

  it('reads a canvas’s alpha onto a smaller grid', () => {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    data[(1 * 4 + 1) * 4 + 3] = 255; // pixel (1, 1)
    const grid = gridFrom(data, 4, 4, 2);
    expect([...grid.cells]).toEqual([1, 0, 0, 0]);
  });
});
