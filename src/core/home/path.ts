// Walking in the home (docs/game/the-home.md §4, ADR 0055): the floor is a grid of cells, and
// the avatar steps between neighbors, up, down, left and right. Small on purpose: the room is
// 12 × 5, so a plain A* is instant.

export type Cell = readonly [x: number, y: number];

/** Whether a cell can be stood on. Cells off the grid are never open. */
export type Open = (x: number, y: number) => boolean;

const STEPS: readonly Cell[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

const key = (x: number, y: number) => `${x},${y}`;

/** The neighbors of a cell, in a fixed order, so paths are the same on every run. */
export function neighbors([x, y]: Cell): Cell[] {
  return STEPS.map(([dx, dy]) => [x + dx, y + dy] as const);
}

/**
 * The cells to walk from `from` to `to`, not counting `from`: `[]` when already there, `null`
 * when there is no way. Both ends must be open.
 */
export function findPath(open: Open, from: Cell, to: Cell): Cell[] | null {
  if (!open(...from) || !open(...to)) return null;
  if (from[0] === to[0] && from[1] === to[1]) return [];
  const h = ([x, y]: Cell) => Math.abs(x - to[0]) + Math.abs(y - to[1]);
  const came = new Map<string, Cell>();
  const cost = new Map<string, number>([[key(...from), 0]]);
  // The room has at most 60 cells: a sorted array is a fine queue.
  const queue: { cell: Cell; f: number; n: number }[] = [{ cell: from, f: h(from), n: 0 }];
  let order = 0;
  for (;;) {
    queue.sort((a, b) => a.f - b.f || a.n - b.n);
    const first = queue.shift();
    if (!first) return null;
    const { cell } = first;
    if (cell[0] === to[0] && cell[1] === to[1]) {
      const path: Cell[] = [];
      for (let c: Cell | undefined = cell; c && key(...c) !== key(...from); c = came.get(key(...c)))
        path.unshift(c);
      return path;
    }
    const g = (cost.get(key(...cell)) ?? 0) + 1;
    for (const next of neighbors(cell)) {
      if (!open(...next)) continue;
      const k = key(...next);
      if (g >= (cost.get(k) ?? Infinity)) continue;
      cost.set(k, g);
      came.set(k, cell);
      queue.push({ cell: next, f: g + h(next), n: ++order });
    }
  }
}

/** Every open cell that can be walked to from `from`, `from` included. */
export function reachable(open: Open, from: Cell): Set<string> {
  const seen = new Set<string>();
  if (!open(...from)) return seen;
  const todo: Cell[] = [from];
  seen.add(key(...from));
  for (let cell = todo.pop(); cell; cell = todo.pop()) {
    for (const next of neighbors(cell)) {
      const k = key(...next);
      if (seen.has(k) || !open(...next)) continue;
      seen.add(k);
      todo.push(next);
    }
  }
  return seen;
}

export const cellKey = (c: Cell) => key(...c);
