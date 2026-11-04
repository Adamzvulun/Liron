// Writing by tracing (#41): a rough check of a drawn letter against the font's own shape. No
// handwriting AI and no stroke order: the letter's pixels and the ink's pixels are compared on
// a small grid. Coverage is how much of the letter the ink went over; stray is how much ink
// fell outside the letter (with a margin for an unsteady hand).

/** A square grid of on/off cells, row by row. */
export interface Grid {
  size: number;
  cells: Uint8Array;
}

export interface TraceScore {
  /** Share of the letter's cells the ink covered, 0..1. */
  coverage: number;
  /** Share of the ink's cells outside the letter's margin, 0..1. */
  stray: number;
  passed: boolean;
}

/** Tracing over a visible guide: most of the letter, little ink outside it. */
export const TRACE_PASS = { coverage: 0.75, stray: 0.25 } as const;
/** Writing from memory is looser: the shape must be there, roughly in place. */
export const FREE_PASS = { coverage: 0.55, stray: 0.4 } as const;

export function scoreTrace(
  letter: Grid,
  margin: Grid,
  ink: Grid,
  pass: { coverage: number; stray: number } = TRACE_PASS,
): TraceScore {
  let need = 0;
  let got = 0;
  let inked = 0;
  let out = 0;
  for (let i = 0; i < letter.cells.length; i++) {
    const l = letter.cells[i] === 1;
    const k = ink.cells[i] === 1;
    if (l) need++;
    if (l && k) got++;
    if (k) inked++;
    if (k && margin.cells[i] !== 1) out++;
  }
  const coverage = need ? got / need : 0;
  const stray = inked ? out / inked : 1;
  return { coverage, stray, passed: coverage >= pass.coverage && stray <= pass.stray };
}

/** Reads a canvas's alpha channel onto a size×size grid (a cell is on if any pixel is). */
export function gridFrom(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  size: number,
): Grid {
  const cells = new Uint8Array(size * size);
  for (let y = 0; y < height; y++) {
    const gy = Math.min(size - 1, Math.floor((y * size) / height));
    for (let x = 0; x < width; x++) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) < 128) continue;
      const gx = Math.min(size - 1, Math.floor((x * size) / width));
      cells[gy * size + gx] = 1;
    }
  }
  return { size, cells };
}

/** Grows a grid's on cells by `r` cells in every direction (the margin for a shaky hand). */
export function dilate(g: Grid, r: number): Grid {
  const { size } = g;
  const cells = new Uint8Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (g.cells[y * size + x] !== 1) continue;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < size && ny < size) cells[ny * size + nx] = 1;
        }
    }
  return { size, cells };
}
