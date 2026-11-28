import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildLingualism, LINGUALISM_APKG } from '../scripts/content/lingualism.ts';
import core from '../content/arabic/core-words.json' with { type: 'json' };
import tales from '../content/arabic/tales.json' with { type: 'json' };
import { firstInChapter, stems, words } from '../scripts/content/chapterWords.ts';

// The regulars' tales (#491) are made only of words you know: every word of a tale is a word
// taught in its chapter or before, give or take the endings the grammar cards teach (il-, ha-l,
// w-, b- and the person prefixes; -ak, -i, -u, -ha, -na, -hum, -u for "they", -t for "I did"). Names are allowed.
// Needs the deck, which is never in git (ADR 0054): CI skips this, so run it locally, with the
// deck in sources/, after changing tales.json.

const NAMES = new Set(['سليم', 'خليل', 'يوسف', 'فادي', 'عمان']);

describe('the regulars’ tales (#491)', () => {
  it.skipIf(!existsSync(LINGUALISM_APKG))(
    'use only words taught in their chapter or before',
    async () => {
      const { pack } = await buildLingualism();
      const arabicOf = new Map(
        pack.items.map((i) => [i.id, String((i.data as { arabic?: unknown }).arabic ?? '')]),
      );
      const firstIn = firstInChapter(
        core.items.map((i) => i.data),
        (id) => arabicOf.get(id) ?? '',
      );

      const unknown = tales.items.flatMap(({ data }) =>
        data.lines.flatMap((l) =>
          words(l.arabic)
            .filter(
              (t) =>
                !NAMES.has(t) &&
                ![...stems(t)].some((s) => (firstIn.get(s) ?? Infinity) <= data.chapter),
            )
            .map((t) => `chapter ${data.chapter}: ${t}`),
        ),
      );
      expect(unknown).toEqual([]);
    },
    60_000,
  );
  it.skipIf(!existsSync(LINGUALISM_APKG))(
    'carry no deck sentence: no four words in a row from any deck item (ADR 0011)',
    async () => {
      const { pack } = await buildLingualism();
      const runs = (s: string) => {
        const w = words(s);
        return Array.from({ length: Math.max(0, w.length - 3) }, (_, i) =>
          w.slice(i, i + 4).join(' '),
        );
      };
      const deck = new Set(
        pack.items.flatMap((i) => runs(String((i.data as { arabic?: unknown }).arabic ?? ''))),
      );
      const copied = tales.items.flatMap(({ data }) =>
        data.lines.flatMap((l) => runs(l.arabic).filter((r) => deck.has(r))),
      );
      expect(copied).toEqual([]);
    },
    60_000,
  );
});
