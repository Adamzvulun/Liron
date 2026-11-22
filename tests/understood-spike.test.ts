import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { judge } from '../src/subjects/arabic/phrases/understood.ts';

// The "understood" compare (ADR 0014) against what Groq Whisper wrote for the deck's native
// speakers in the speech spike: correct speech must count as understood. The spike's results
// hold deck text, so they live in the ignored sources/ (ADR 0054): this runs only where someone
// has them, and CI skips it.
const RESULTS = join(
  import.meta.dirname,
  '..',
  'sources/research/gemini-speech/results/2026-11-02-groq-whisper-large-v3.json',
);
const spike = existsSync(RESULTS)
  ? (JSON.parse(readFileSync(RESULTS, 'utf8')) as {
      deck: { kind: string; ref: string; hyp: string }[];
    })
  : { deck: [] };

describe.skipIf(!existsSync(RESULTS))('the understood check on native speech (ADR 0014)', () => {
  it('understands all 30 native sentences', () => {
    const sentences = spike.deck.filter((d) => d.kind === 'sentence');
    expect(sentences).toHaveLength(30);
    expect(sentences.filter((d) => !judge(d.hyp, d.ref).understood)).toEqual([]);
  });

  it('understands at least 18 of the 20 native single words', () => {
    // The two it misses: Whisper wrote حلو as هلو and dropped a letter from a loanword.
    const words = spike.deck.filter((d) => d.kind !== 'sentence');
    expect(words).toHaveLength(20);
    expect(words.filter((d) => judge(d.hyp, d.ref).understood).length).toBeGreaterThanOrEqual(18);
  });
});
