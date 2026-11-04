// Scoring a copy run (docs/game/morse-lessons.md): per character, like LCWO. What you copied is
// aligned to what played (edit distance), so one missed or extra character doesn't push the rest
// out of line. "?" means "skipped" and never matches.

export interface CharResult {
  char: string;
  /** What you typed in its place, or "" if nothing lined up with it. */
  copied: string;
  right: boolean;
}

export interface RunScore {
  results: CharResult[];
  right: number;
  played: number;
  /** Copied characters that line up with nothing that played (they count as errors). */
  extra: number;
  /** right ÷ (played + extra), 0 to 1, so mashing keys can't score well. */
  accuracy: number;
  /** Accuracy for each character that played. */
  byChar: Map<string, { right: number; played: number }>;
}

export function scoreCopy(played: readonly string[], copied: readonly string[]): RunScore {
  const n = played.length;
  const m = copied.length;
  // cost[i][j]: edits to turn played[0..i) into copied[0..j).
  const cost = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  const at = (i: number, j: number) => cost[i]?.[j] ?? Infinity;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const same = played[i - 1] === copied[j - 1] ? 0 : 1;
      const row = cost[i];
      if (row) row[j] = Math.min(at(i - 1, j - 1) + same, at(i - 1, j) + 1, at(i, j - 1) + 1);
    }
  }

  // Walk back from the end, preferring matches, to see which copied character fits each one.
  const results: CharResult[] = [];
  let i = n;
  let j = m;
  let extra = 0;
  while (i > 0 || j > 0) {
    const p = played[i - 1] ?? '';
    const c = copied[j - 1] ?? '';
    const same = p === c ? 0 : 1;
    if (i > 0 && j > 0 && at(i, j) === at(i - 1, j - 1) + same) {
      results.push({ char: p, copied: c, right: same === 0 });
      i--;
      j--;
    } else if (i > 0 && at(i, j) === at(i - 1, j) + 1) {
      results.push({ char: p, copied: '', right: false });
      i--;
    } else {
      extra++;
      j--;
    }
  }
  results.reverse();

  const byChar = new Map<string, { right: number; played: number }>();
  for (const r of results) {
    const tally = byChar.get(r.char) ?? { right: 0, played: 0 };
    tally.played++;
    if (r.right) tally.right++;
    byChar.set(r.char, tally);
  }
  const right = results.filter((r) => r.right).length;
  const total = n + extra;
  return { results, right, played: n, extra, accuracy: n ? right / total : 0, byChar };
}

/** Koch gate (ADR 0028): two runs in a row at 90% or better. */
export const GATE_ACCURACY = 0.9;
export const GATE_RUNS = 2;

export function passesGate(recentAccuracies: readonly number[]): boolean {
  const last = recentAccuracies.slice(-GATE_RUNS);
  return last.length === GATE_RUNS && last.every((a) => a >= GATE_ACCURACY);
}

/** Farnsworth steps after a run (docs/game/morse-lessons.md). */
export function nextEffectiveWpm(current: number, accuracy: number, charWpm: number): number {
  const step = accuracy >= 0.95 ? 1 : accuracy < 0.85 ? -1 : 0;
  return Math.min(charWpm, Math.max(6, current + step));
}
