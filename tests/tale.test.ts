// The tale as one text (task 1.4): docs/game/the-tale.md is both roads read straight through,
// written from the content so it can't drift from the game. Run `UPDATE_TALE=1 npx vitest run
// tests/tale.test.ts` after changing a road's words, read the diff, and commit it.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { RoadChapter, RoadStep } from '../src/core/road/road.ts';
import {
  ARABIC_ROAD,
  ARABIC_ROAD_CHAPTERS,
  QUESTLINE as LONG_ROAD,
} from '../src/subjects/arabic/road.ts';
import {
  MORSE_ROAD,
  MORSE_ROAD_CHAPTERS,
  QUESTLINE as BEACON,
} from '../src/subjects/morse/road.ts';

const FILE = new URL('../docs/game/the-tale.md', import.meta.url);

function tell(name: string, steps: readonly RoadStep[], chapters: readonly RoadChapter[]): string {
  const out = [`## ${name}`, '', `${steps.length} steps in ${chapters.length} chapters.`, ''];
  let n = 0;
  for (const chapter of chapters) {
    const mine = steps.filter((s) => s.chapter === chapter.number);
    if (!mine.length) continue;
    out.push(`### Chapter ${chapter.number}: ${chapter.title}`, '');
    if (chapter.intro) out.push(chapter.intro, '');
    for (const step of mine) {
      n += 1;
      // A chapter's first step is told by the intro just above.
      const beat = step.beat && step.beat !== chapter.intro ? ` ${step.beat}` : '';
      out.push(`${n}. **${step.title}.**${beat}`);
    }
    out.push('');
    if (chapter.outro && !mine.some((s) => s.beat === chapter.outro)) out.push(chapter.outro, '');
  }
  return out.join('\n');
}

const tale = [
  '# The tale',
  '',
  'Both roads read straight through: each chapter’s opening, then every step with its line of the tale, then the chapter’s close. **Written by `tests/tale.test.ts` from `content/`; don’t edit it by hand.** The design is in [the-road.md](the-road.md).',
  '',
  tell(BEACON, MORSE_ROAD, MORSE_ROAD_CHAPTERS),
  tell(LONG_ROAD, ARABIC_ROAD, ARABIC_ROAD_CHAPTERS),
].join('\n');

describe('the tale (task 1.4)', () => {
  it.each([
    ['The Silent Beacon', MORSE_ROAD],
    ['The Long Road In', ARABIC_ROAD],
  ])('every step of %s has a title, an invite and a line of the tale', (_name, steps) => {
    expect(steps.filter((s) => !s.title || !s.invite || !s.beat).map((s) => s.id)).toEqual([]);
  });

  it('docs/game/the-tale.md is the roads as the content tells them', () => {
    if (process.env.UPDATE_TALE) writeFileSync(FILE, tale);
    expect(readFileSync(FILE, 'utf8')).toBe(tale);
  });
});
