// Builds content/arabic/hear-sentences.json (#503): the recorded deck sentences of 3 to 10 words
// whose words the word path teaches, each tagged with the latest chapter it needs. Deck ids only,
// never text (ADR 0011). Needs the deck in sources/ (never in git, ADR 0054), so run it locally:
//
//   node scripts/content/hear-sentences.ts
//
// The word matching is loose (it accepts endings and prefixes), so on the first real run read
// about 30 of the sentences it lists and check each really uses only taught words.
import { writeFileSync } from 'node:fs';
import core from '../../content/arabic/core-words.json' with { type: 'json' };
import { buildLingualism, LINGUALISM_APKG } from './lingualism.ts';
import { firstInChapter, stems, words } from './chapterWords.ts';

export const MIN_WORDS = 3;
export const MAX_WORDS = 10;
export const FILE = new URL('../../content/arabic/hear-sentences.json', import.meta.url);

export interface HearEntry {
  deck: string;
  chapter: number;
}

/** The deck sentences you can hear at each chapter: every word taught by then (blanks: never). */
export function hearList(
  deck: readonly { id: string; arabic: string }[],
  chapters: readonly { chapter: number; words: readonly { deck: string }[] }[],
): HearEntry[] {
  const arabicOf = new Map(deck.map((d) => [d.id, d.arabic]));
  const firstIn = firstInChapter(chapters, (id) => arabicOf.get(id) ?? '');
  return deck.flatMap(({ id, arabic }) => {
    const tokens = words(arabic);
    if (arabic.includes('_') || tokens.length < MIN_WORDS || tokens.length > MAX_WORDS) return [];
    // A token is taught from the earliest chapter that has any form it may come from.
    const from = tokens.map((t) =>
      Math.min(...[...stems(t)].map((s) => firstIn.get(s) ?? Infinity)),
    );
    const chapter = Math.max(...from);
    return Number.isFinite(chapter) ? [{ deck: id, chapter }] : [];
  });
}

if (import.meta.main) {
  const { pack } = await buildLingualism(LINGUALISM_APKG);
  const deck = pack.items.map((i) => ({
    id: i.id,
    arabic: String((i.data as { arabic?: unknown }).arabic ?? ''),
  }));
  const sentences = hearList(
    deck,
    core.items.map((i) => i.data),
  ).sort((a, b) => a.chapter - b.chapter || a.deck.localeCompare(b.deck));
  const out = {
    subject: 'arabic',
    source: 'waymark',
    license:
      'Our own (the choice and the chapters only: the sentences and recordings are the Lingualism deck’s, private, ADR 0011)',
    items: [
      { id: 'hear-sentences:1', subject: 'arabic', type: 'hear-sentences', data: { sentences } },
    ],
  };
  writeFileSync(FILE, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`${sentences.length} sentences.`);
}
