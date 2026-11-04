// Writing by tracing (#41): a rough check of a drawn letter against the font's own shape. No
// handwriting AI and no stroke order: the letter's pixels and the ink's pixels are compared on
// a small grid. Coverage is how much of the letter the ink went over; stray is how much ink
// fell outside the letter (with a margin for an unsteady hand). Dots count on their own: each of
// the letter's separate small parts (its dots, or ك's inner stroke) needs ink of its own, since a
// body covers most of the letter's cells and ث without dots is ب (full review, concern 4).

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
  /** Share of the letter's dots (its small separate parts) that got ink of their own, 0..1. */
  dots: number;
  passed: boolean;
}

export interface Pass {
  coverage: number;
  stray: number;
  /** How far (in cells) ink may sit from a dot and still count for it. */
  dotReach: number;
}

/** Tracing over a visible guide: most of the letter, little ink outside it. */
export const TRACE_PASS: Pass = { coverage: 0.75, stray: 0.25, dotReach: 2 };
/** Writing from memory is looser: the shape must be there, roughly in place. */
export const FREE_PASS: Pass = { coverage: 0.55, stray: 0.4, dotReach: 4 };

/** Ink a dot needs, as a share of its cells: about a tap of the pen on a 64-cell grid. */
const DOT_INK = 0.25;

/** A grid's connected groups of on cells (touching sideways or diagonally), largest first. */
export function parts(g: Grid): number[][] {
  const { size, cells } = g;
  const seen = new Uint8Array(size * size);
  const out: number[][] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== 1 || seen[i]) continue;
    const part: number[] = [];
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop() as number;
      part.push(j);
      const x = j % size;
      const y = Math.floor(j / size);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          const k = ny * size + nx;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size || seen[k] || cells[k] !== 1) continue;
          seen[k] = 1;
          stack.push(k);
        }
    }
    out.push(part);
  }
  return out.sort((a, b) => b.length - a.length);
}

/** Share of the letter's dots with ink of their own, near the dot but not on the body. */
function dotsFound(letter: Grid, ink: Grid, reach: number): number {
  const [body, ...dots] = parts(letter);
  if (!body || dots.length === 0) return 1;
  const { size } = letter;
  const near = (cells: number[], r: number) => {
    const g = { size, cells: new Uint8Array(size * size) };
    for (const c of cells) g.cells[c] = 1;
    return dilate(g, r).cells;
  };
  const onBody = near(body, 1);
  let found = 0;
  for (const dot of dots) {
    const zone = near(dot, reach);
    let inked = 0;
    for (let i = 0; i < zone.length; i++) if (zone[i] && !onBody[i] && ink.cells[i] === 1) inked++;
    if (inked >= Math.max(1, dot.length * DOT_INK)) found++;
  }
  return found / dots.length;
}

export function scoreTrace(
  letter: Grid,
  margin: Grid,
  ink: Grid,
  pass: Pass = TRACE_PASS,
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
  const dots = dotsFound(letter, ink, pass.dotReach);
  return {
    coverage,
    stray,
    dots,
    passed: coverage >= pass.coverage && stray <= pass.stray && dots === 1,
  };
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
