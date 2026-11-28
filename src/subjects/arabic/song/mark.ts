import { normalizeArabic } from '../phrases/understood';

export type WordStatus = 'known' | 'met' | 'new';

/** Splits a line into words and marks each against the player's known and met words (any spelling; both sides are normalized like the tales checker does). */
export function markWords(
  line: string,
  known: ReadonlySet<string>,
  met: ReadonlySet<string>,
): { word: string; status: WordStatus }[] {
  const norm = (s: ReadonlySet<string>) => new Set([...s].map(normalizeArabic));
  const k = norm(known);
  const m = norm(met);
  return line
    .split(/\s+/)
    .map((word) => ({ word, n: normalizeArabic(word) }))
    .filter((w) => w.n)
    .map(({ word, n }) => ({ word, status: k.has(n) ? 'known' : m.has(n) ? 'met' : 'new' }));
}
