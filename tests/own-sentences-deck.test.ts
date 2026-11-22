import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildLingualism, LINGUALISM_APKG } from '../scripts/content/lingualism.ts';
import own from '../content/arabic/own-sentences.json' with { type: 'json' };

// Our own sentences live in content/ and the public bundle only because they are ours (ADR 0011,
// docs/game/arabic-core-words.md §3): none may carry a deck sentence. Four words in a row shared
// with any deck item counts as carrying it, unless the four words come from the sentence's own
// word (a phrase of four words or more has to appear in its own sentence). 2026-11-15: the first
// draft of words 3,271-3,360 copied 44 deck lines; a scratch check caught it, and this keeps it so.

/** Arabic letters only, marks and tatweel dropped, alef forms joined, as words. */
const words = (s: string) =>
  s
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[^ء-ي]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

const runs = (s: string) => {
  const w = words(s);
  return Array.from({ length: Math.max(0, w.length - 3) }, (_, i) => w.slice(i, i + 4).join(' '));
};

describe('our own sentences (ADR 0011)', () => {
  // Needs the deck, which is never in git (ADR 0054): CI skips this, so run it locally, with the
  // deck in sources/, after changing own-sentences.json.
  it.skipIf(!existsSync(LINGUALISM_APKG))(
    'carry no deck sentence: no four words in a row from a deck item but their own',
    async () => {
      const { pack } = await buildLingualism();
      const arabicOf = new Map(
        pack.items.map((i) => [i.id, String((i.data as { arabic?: unknown }).arabic ?? '')]),
      );
      const where = new Map<string, Set<string>>();
      for (const [id, arabic] of arabicOf)
        for (const run of runs(arabic)) where.set(run, (where.get(run) ?? new Set()).add(id));

      const copied = own.items.flatMap(({ data }) =>
        runs(data.arabic)
          .filter((run) => [...(where.get(run) ?? [])].some((id) => id !== data.word))
          .map((run) => `${data.word}: ${run}`),
      );
      expect(copied).toEqual([]);
    },
    60_000,
  );

  it('use only Arabic letters, marks and plain punctuation (no پ, which the deck never uses)', () => {
    // Letters ء-ي, the vowel marks and dagger alef, tatweel; then spaces, digits, punctuation.
    const arabic = (c: number) => (c >= 0x621 && c <= 0x652) || c === 0x670 || c === 0x640;
    const plain = (ch: string) => /[\s0-9.,!?؟،؛:"“”«»()'—–-]/u.test(ch);
    const odd = own.items.filter(({ data }) =>
      [...data.arabic].some((ch) => !arabic(ch.codePointAt(0) ?? 0) && !plain(ch)),
    );
    expect(odd.map((i) => i.data.word)).toEqual([]);
  });
});
