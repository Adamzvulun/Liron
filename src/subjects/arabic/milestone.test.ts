import { describe, expect, it } from 'vitest';
import type { CoreWord } from './core/coreWords.ts';
import { seeded } from './lesson/questions.ts';
import { probeWords, PROBE_WORDS } from './milestone.ts';
import { parseProgress } from './progress.ts';

const word = (chapter: number, n: number) => ({ deck: `c${chapter}w${n}`, chapter }) as CoreWord;
const chapters = [1, 2, 3].map((c) => [0, 1, 2, 3, 4, 5, 6, 7].map((n) => word(c, n)));
const at = (chapter: number, done = false) =>
  parseProgress({ words: { chapter, done, streak: 0, met: [], cards: [], trials: [] } });

describe('the Arabic probe’s words', () => {
  it('are six, from the chapters passed only', () => {
    const w = probeWords(chapters, at(3), seeded(1));
    expect(w).toHaveLength(PROBE_WORDS);
    expect(w.every((x) => x.chapter < 3)).toBe(true);
  });
  it('are none before a chapter is passed, and any chapter once the path is done', () => {
    expect(probeWords(chapters, at(1), seeded(1))).toEqual([]);
    expect(probeWords(chapters, at(3, true), seeded(2)).some((x) => x.chapter === 3)).toBe(true);
  });
});
