import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hearList, MAX_WORDS, MIN_WORDS } from '../scripts/content/hear-sentences.ts';
import { buildLingualism, LINGUALISM_APKG } from '../scripts/content/lingualism.ts';
import core from '../content/arabic/core-words.json' with { type: 'json' };
import { wordsOf } from '../src/subjects/arabic/echo/shadow.ts';
import { words } from '../scripts/content/chapterWords.ts';
import { HEAR_SENTENCES } from '../src/subjects/arabic/echo/hear.ts';

// Hear it's sentence list (#503) is built from the deck by scripts/content/hear-sentences.ts.
// The first test runs anywhere, on made-up text; the second needs the deck (never in git, ADR
// 0054), so CI skips it: run it locally after the deck or the word path changes.

describe('the Hear it sentence list', () => {
  it('holds only deck ids and chapters, no text (ADR 0011)', () => {
    const raw = readFileSync(
      new URL('../content/arabic/hear-sentences.json', import.meta.url),
      'utf8',
    );
    expect(raw).not.toMatch(/[؀-ۿ]/);
    const { items } = JSON.parse(raw) as { items: { data: { sentences: object[] } }[] };
    for (const i of items)
      for (const s of i.data.sentences) {
        expect(Object.keys(s).sort()).toEqual(['chapter', 'deck']);
        expect((s as { deck: string }).deck).toMatch(/^[a-z]+:\d+$/);
      }
  });

  it('leaves out a sentence with an untaught word that looks like a taught one', () => {
    const chapters = [{ chapter: 1, words: [{ deck: 'w1' }, { deck: 'w2' }] }];
    const deck = [
      { id: 'w1', arabic: 'كتب' },
      { id: 'w2', arabic: 'بيت' },
      { id: 's1', arabic: 'كتب بيت كتاب' },
    ];
    expect(hearList(deck, chapters)).toEqual([]);
  });

  it('tags each 3- to 10-word sentence with the latest chapter its words need', () => {
    const chapters = [
      { chapter: 1, words: [{ deck: 'w1' }, { deck: 'w2' }] },
      { chapter: 2, words: [{ deck: 'w3' }] },
    ];
    const deck = [
      { id: 'w1', arabic: 'بيت' },
      { id: 'w2', arabic: 'كبير' },
      { id: 'w3', arabic: 'جميل' },
      { id: 's1', arabic: 'بيت كبير بيت' },
      { id: 's2', arabic: 'بيت كبير جميل' },
      { id: 's3', arabic: 'بيت كبير غريب' },
      { id: 's4', arabic: 'بيت كبير' },
      { id: 's5', arabic: 'بيت كبير ___ بيت' },
      {
        id: 's6',
        arabic: Array(MAX_WORDS + 1)
          .fill('بيت')
          .join(' '),
      },
    ];
    expect(MIN_WORDS).toBe(3);
    expect(hearList(deck, chapters)).toEqual([
      { deck: 's1', chapter: 1 },
      { deck: 's2', chapter: 2 },
    ]);
  });

  it.skipIf(!existsSync(LINGUALISM_APKG))(
    'matches the deck, and holds ids only (ADR 0011)',
    async () => {
      const { pack } = await buildLingualism();
      const deck = pack.items.map((i) => ({
        id: i.id,
        arabic: String((i.data as { arabic?: unknown }).arabic ?? ''),
      }));
      const built = hearList(
        deck,
        core.items.map((i) => i.data),
      );
      expect(HEAR_SENTENCES.map(({ deck, chapter }) => ({ deck, chapter })).sort(by)).toEqual(
        built.sort(by),
      );
      // The game counts words as the page does; the script counts them its own way: they must agree.
      const arabicOf = new Map(deck.map((d) => [d.id, d.arabic]));
      for (const { deck: id } of HEAR_SENTENCES) {
        const a = arabicOf.get(id) ?? '';
        expect(wordsOf(a).length, id).toBe(words(a).length);
      }
      expect(JSON.stringify(HEAR_SENTENCES)).not.toMatch(/[؀-ۿ]/);
    },
    60_000,
  );
});

const by = (a: { deck: string }, b: { deck: string }) => a.deck.localeCompare(b.deck);
