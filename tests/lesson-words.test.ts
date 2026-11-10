// The reviewed lesson words (#125) against the real deck: every listed word is in the deck, in
// the lesson it's listed for, and used; every deck word of a reviewed lesson was looked at.
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { buildLingualism } from '../scripts/content/lingualism.ts';
import { lettersOf } from '../src/subjects/arabic/letters.ts';
import { PHRASE_SETS, phrasesOf } from '../src/subjects/arabic/phrases/sets.ts';
import { PAIRS, wordsFor } from '../src/subjects/arabic/echo/pairs.ts';
import { WORD_CHAPTERS } from '../src/subjects/arabic/core/coreWords.ts';
import { ECHO_POOL, NO_REVIEW, REVIEW, REVIEWS, wordsFrom } from '../src/subjects/arabic/words.ts';

const DECK = 'sources/arabic/lingualism-palestinian-vocabulary/lingualism-pcav.apkg';

describe('the reviewed lesson words', () => {
  it('lists each deck word once, with a gloss', () => {
    const ids = REVIEWS.flatMap((r) => [...r.words, ...r.leftOut].map((w) => w.deck));
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of REVIEWS) {
      for (const w of r.words) {
        expect(w.gloss.trim(), w.deck).not.toBe('');
        expect(w.gloss, w.deck).not.toMatch(/^to\s/);
      }
      for (const w of r.leftOut) expect(w.why.trim(), w.deck).not.toBe('');
    }
  });

  it.skipIf(!existsSync(DECK))(
    'matches the deck: in their lesson, all used, none missed',
    async () => {
      const { pack } = await buildLingualism(DECK);
      const byId = new Map(pack.items.map((i) => [i.id, i]));
      const lessonOf = (id: string) => {
        const arabic = String((byId.get(id)?.data as { arabic?: unknown })?.arabic ?? '');
        const letters = lettersOf(arabic.trim());
        return letters ? Math.max(...letters.map((l) => l.lesson)) : null;
      };
      for (const r of REVIEWS) {
        for (const w of [...r.words, ...r.leftOut]) {
          expect(byId.get(w.deck)?.type, w.deck).toBe('vocab');
          expect(lessonOf(w.deck), w.deck).toBe(r.lesson);
        }
      }
      // Every listed word is used, with our gloss.
      const used = new Map(wordsFrom(pack.items).map((w) => [w.id, w]));
      for (const [id, { gloss }] of REVIEW.words) expect(used.get(id)?.meaning, id).toBe(gloss);
      // Every word the deck alone would give a reviewed lesson was looked at.
      const looked = new Set(REVIEWS.flatMap((r) => [...r.words, ...r.leftOut].map((w) => w.deck)));
      const missed = wordsFrom(pack.items, NO_REVIEW)
        .filter((w) => REVIEW.lessons.has(Math.max(...w.letters.map((l) => l.lesson))))
        .filter((w) => !looked.has(w.id))
        .map((w) => w.id);
      expect(missed).toEqual([]);
    },
    60_000,
  );
});

describe('the echo well’s pool (Adam, 2026-11-10)', () => {
  it('holds every word-path word and every reviewed lesson word, with our glosses', () => {
    for (const c of WORD_CHAPTERS) {
      for (const w of c.words) {
        expect(ECHO_POOL.words.get(w.deck)?.gloss, w.deck).toBe(
          REVIEW.words.get(w.deck)?.gloss ?? w.gloss,
        );
      }
    }
    for (const [id, w] of REVIEW.words) expect(ECHO_POOL.words.get(id), id).toEqual(w);
  });

  it.skipIf(!existsSync(DECK))(
    'keeps enough words for every sound pair, though the letter lessons are short',
    async () => {
      const { pack } = await buildLingualism(DECK);
      const words = wordsFrom(pack.items, ECHO_POOL);
      for (const pair of PAIRS) {
        const sides = wordsFor(words, pair);
        expect(sides.a.length, `${pair.id} a`).toBeGreaterThanOrEqual(5);
        expect(sides.b.length, `${pair.id} b`).toBeGreaterThanOrEqual(5);
      }
      // Every word the well can ask shows our gloss, never the deck's English.
      for (const w of words) expect(w.meaning, w.id).toBe(ECHO_POOL.words.get(w.id)?.gloss);
    },
    60_000,
  );
});

describe('the coffee corner’s phrases (#125)', () => {
  it.skipIf(!existsSync(DECK))(
    'show our glosses, and no blanks or tags from the deck',
    async () => {
      const { pack } = await buildLingualism(DECK);
      for (const set of PHRASE_SETS) {
        const phrases = phrasesOf(set, pack.items);
        expect(phrases.map((p) => p.id)).toEqual(set.items);
        for (const p of phrases) {
          expect(p.meaning, p.id).toBe(set.glosses[p.id] ?? p.meaning);
          for (const s of [p.arabic, p.latin, p.meaning]) expect(s, p.id).not.toMatch(/[_[\]]/);
        }
      }
      const one = PHRASE_SETS.flatMap((s) => phrasesOf(s, pack.items)).find(
        (p) => p.id === 'pcav:3970',
      );
      expect(one?.latin).toBe('wāɧad, wáɧda');
      const no = PHRASE_SETS.flatMap((s) => phrasesOf(s, pack.items)).find(
        (p) => p.id === 'pcav:4753',
      );
      expect(no?.latin).toBe('laʔ');
    },
    60_000,
  );
});
