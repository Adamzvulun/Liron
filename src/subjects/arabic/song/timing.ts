/** Index of the line whose time has come (`starts` ascending, seconds), or -1 before the first. The nudge shifts the player's clock. */
export function currentLine(starts: readonly number[], time: number, nudge = 0): number {
  const t = time + nudge;
  let i = -1;
  while (i + 1 < starts.length && (starts[i + 1] ?? Infinity) <= t) i++;
  return i;
}

/** Index of the word being sung, by spreading the line's time over its words by length. */
export function currentWord(
  words: readonly string[],
  start: number,
  end: number,
  time: number,
  nudge = 0,
): number {
  const total = words.reduce((n, w) => n + w.length, 0);
  if (!total || end <= start) return -1;
  const at = ((time + nudge - start) / (end - start)) * total;
  let acc = 0;
  for (const [i, w] of words.entries()) {
    acc += w.length;
    if (at < acc) return i;
  }
  return words.length - 1;
}
