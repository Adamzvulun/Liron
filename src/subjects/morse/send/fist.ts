// How clean your keying is (#37): your "fist". After a drill: the dah-to-dit ratio, the three
// kinds of spacing against the ideal 1:3:7, how steady your timing is, and one tip.

import type { Decoded } from './decoder.ts';
import { wpmFor } from './decoder.ts';

export interface Measure {
  /** Measured, in dits (the ratio is dah ÷ dit). */
  value: number;
  ideal: number;
  /** The range that counts as fine. */
  low: number;
  high: number;
}

export interface Fist {
  wpm: number;
  /** Dah length ÷ dit length. Ideal 3. */
  ratio?: Measure;
  /** Gaps inside a letter, in dits. Ideal 1. */
  element?: Measure;
  /** Gaps between letters, in dits. Ideal 3. */
  letter?: Measure;
  /** Gaps between words, in dits. Ideal 7. */
  word?: Measure;
  /** 0 to 1: how alike your dits are, and your dahs (1 = metronome). */
  steadiness?: number;
  /** One concrete thing to work on. */
  tip: string;
}

const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
};

/** Spread relative to size (coefficient of variation). */
const spread = (xs: readonly number[]) => {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length;
  return Math.sqrt(v) / m;
};

/** How far outside its fine range a measure is: 0 inside, 1 at twice the distance, … */
function badness(m: Measure): number {
  if (m.value >= m.low && m.value <= m.high) return 0;
  const edge = m.value < m.low ? m.low : m.high;
  return Math.abs(Math.log(m.value / edge)) / Math.abs(Math.log(edge / m.ideal)) + 0.01;
}

/** Steadier than this is fine. */
export const STEADY = 0.75;

const TIPS = {
  ratio: [
    'Your dahs are short. Hold each dah as long as three dits.',
    'Your dahs are long. A dah is three dits, no longer.',
  ],
  element: [
    'The parts of a letter are a little rushed. Let each one breathe for a dit.',
    'The parts of each letter drift apart. Keep them close, one dit apart, so the letter holds together.',
  ],
  letter: [
    'Your letters run together. Leave a gap of about one dah between letters.',
    'Your letters are far apart. Close the gap between letters to about one dah.',
  ],
  word: [
    'Your words run together. Leave about seven dits between words.',
    'Your word gaps are long. About seven dits is enough.',
  ],
} as const;

export function analyseFist(decoded: Decoded): Fist {
  const dits = decoded.marks.filter((m) => m.kind === 'dit').map((m) => m.up - m.down);
  const dahs = decoded.marks.filter((m) => m.kind === 'dah').map((m) => m.up - m.down);
  const unit = dits.length ? median(dits) : decoded.ditMs;
  const gaps = (kind: 'element' | 'letter' | 'word') =>
    decoded.gaps.filter((g) => g.kind === kind).map((g) => g.ms / unit);
  const measure = (values: number[], ideal: number, low: number, high: number) =>
    values.length ? { value: median(values), ideal, low, high } : undefined;

  const fist: Omit<Fist, 'tip'> = {
    wpm: Math.round(wpmFor(unit)),
    ratio:
      dits.length && dahs.length
        ? { value: median(dahs) / unit, ideal: 3, low: 2.5, high: 3.6 }
        : undefined,
    element: measure(gaps('element'), 1, 0.6, 1.7),
    letter: measure(gaps('letter'), 3, 2.3, 4.5),
    word: measure(gaps('word'), 7, 5, 10),
    steadiness:
      dits.length + dahs.length >= 4
        ? Math.max(
            0,
            1 -
              (spread(dits) * dits.length + spread(dahs) * dahs.length) /
                (dits.length + dahs.length) /
                0.4,
          )
        : undefined,
  };

  // A press or three is too little to judge; praising it would be unearned (review, 2026-11-15).
  if (dits.length + dahs.length < 4) {
    return { ...fist, tip: 'Too little keying to judge your fist. Key the whole line next time.' };
  }
  let tip = 'A clean fist. Next time, try keying a little faster.';
  let worst = 0;
  for (const key of ['ratio', 'element', 'letter', 'word'] as const) {
    const m = fist[key];
    if (!m) continue;
    const b = badness(m);
    if (b > worst) {
      worst = b;
      tip = TIPS[key][m.value < m.low ? 0 : 1];
    }
  }
  if (!worst && fist.steadiness !== undefined && fist.steadiness < STEADY) {
    tip = 'Keep a steadier rhythm: your dits (and dahs) vary in length. Count them in your head.';
  }
  return { ...fist, tip };
}
