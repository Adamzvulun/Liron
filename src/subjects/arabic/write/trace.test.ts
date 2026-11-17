import { describe, expect, it } from 'vitest';
import { dilate, FREE_PASS, gridFrom, parts, scoreTrace, type Grid } from './trace.ts';

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

  // A ب-like letter: a long body and one dot under it, on a 12-cell grid.
  const BEH = g(
    '............',
    '............',
    '............',
    '.##########.',
    '.##########.',
    '............',
    '............',
    '.....##.....',
    '.....##.....',
    '............',
    '............',
    '............',
  );
  const body = (dot: string[]) =>
    g(
      '............',
      '............',
      '............',
      '.##########.',
      '.##########.',
      '............',
      '............',
      ...dot,
      '............',
      '............',
      '............',
    );

  it('finds the body and the dot as separate parts, body first', () => {
    expect(parts(BEH).map((p) => p.length)).toEqual([20, 4]);
  });

  it('fails a letter without its dot, even when the body covers most of it (review concern 4)', () => {
    const s = scoreTrace(BEH, dilate(BEH, 1), body(['............', '............']));
    expect(s.coverage).toBeGreaterThan(0.8);
    expect(s.dots).toBe(0);
    expect(s.passed).toBe(false);
  });

  it('passes the dot traced in place, or written from memory a little off', () => {
    expect(scoreTrace(BEH, dilate(BEH, 1), body(['.....##.....', '.....##.....'])).passed).toBe(
      true,
    );
    const off = scoreTrace(BEH, dilate(BEH, 3), body(['.......##...', '.......##...']), FREE_PASS);
    expect(off.dots).toBe(1);
    expect(off.passed).toBe(true);
  });
});
