import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildLingualism, LINGUALISM_APKG } from '../scripts/content/lingualism.ts';
import core from '../content/arabic/core-words.json' with { type: 'json' };
import tales from '../content/arabic/tales.json' with { type: 'json' };

// The regulars' tales (#491) are made only of words you know: every word of a tale is a word
// taught in its chapter or before, give or take the endings the grammar cards teach (il-, ha-l,
// w-, b- and the person prefixes; -ak, -i, -u, -ha, -na, -hum, -u for "they", -t for "I did"). Names are allowed.
// Needs the deck, which is never in git (ADR 0054): CI skips this, so run it locally, with the
// deck in sources/, after changing tales.json.

const NAMES = new Set(['سليم', 'خليل', 'يوسف', 'فادي', 'عمان']);

/** Arabic letters only, marks and tatweel dropped, alef, ya and ta marbuta forms joined. */
const words = (s: string) =>
  s
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^ء-ي]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

const FRONT = ['وهال', 'وال', 'وا', 'بال', 'هال', 'ال', 'و', 'ا'];
const PERSON = ['بت', 'بن', 'بي', 'ب', 'ت', 'ن', 'ي', ''];
const ENDS = ['وا', 'ات', 'ت', 'ها', 'نا', 'كم', 'هم', 'ني', 'ك', 'ي', 'و', 'ه', ''];

/** The forms a word in a tale may come from. */
function stems(token: string): Set<string> {
  const out = new Set<string>();
  // The negative -š comes last (ما بفهمش).
  const bare = token.length > 3 && token.endsWith('ش') ? [token, token.slice(0, -1)] : [token];
  for (const t of bare)
    for (const f of ['', ...FRONT]) {
      if (!t.startsWith(f)) continue;
      const a = t.slice(f.length);
      for (const p of PERSON) {
        if (!a.startsWith(p)) continue;
        const b = a.slice(p.length);
        for (const e of ENDS) {
          if (!b.endsWith(e) || b.length - e.length < 2) continue;
          const c = b.slice(0, b.length - e.length);
          // The stem as said (دفع), with a he-does prefix (يدفع), or with -i (بدّي from بدّك);
          // -a written t before an ending (خالتو from خالة), and -āt for -a's plural (مجلات).
          out.add(c).add(`ي${c}`).add(`${c}ي`).add(c.replace(/ت$/, 'ه')).add(`${c}ه`);
          // A hollow verb loses its long ā before -t, "I did" (رحت from راح, شفت from شاف).
          if (e === 'ت' && c.length === 2) out.add(`${c[0]}ا${c[1]}`);
        }
      }
    }
  return out;
}

describe('the regulars’ tales (#491)', () => {
  it.skipIf(!existsSync(LINGUALISM_APKG))(
    'use only words taught in their chapter or before',
    async () => {
      const { pack } = await buildLingualism();
      const arabicOf = new Map(
        pack.items.map((i) => [i.id, String((i.data as { arabic?: unknown }).arabic ?? '')]),
      );
      const firstIn = new Map<string, number>();
      for (const { data } of core.items)
        for (const w of data.words)
          for (const x of words(arabicOf.get(w.deck) ?? ''))
            // A taught form without its ending counts too: عند from كان عندو.
            for (const y of [
              x,
              ...ENDS.filter((e) => e && x.endsWith(e) && x.length - e.length >= 2).map((e) =>
                x.slice(0, -e.length),
              ),
            ])
              if ((firstIn.get(y) ?? Infinity) > data.chapter) firstIn.set(y, data.chapter);

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
