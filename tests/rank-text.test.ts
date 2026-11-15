import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LINES_FOR_XP, MAX_LINES, OLD_FRIEND_CHATS } from '../src/subjects/arabic/chat/limits.ts';
import {
  FRIEND_CHATS,
  FRIEND_WORDS,
  LOCAL_WORDS,
  STORY_FRIENDS,
  TRAVELER_CHAPTERS,
} from '../src/subjects/arabic/ranks.ts';
import { GHOST_WPM, KEYER_DIT_MS, KEYER_DRILLS } from '../src/subjects/morse/ranks.ts';

// A rank's conditions are prose in content/; its numbers are rules in code. Each number the
// prose shows must be the one the rule checks (review, 2026-11-15).
const CONTENT = join(import.meta.dirname, '..', 'content');
const conditions = (subject: string) =>
  new Map(
    (
      JSON.parse(readFileSync(join(CONTENT, subject, 'ranks.json'), 'utf8')) as {
        items: { data: { name: string; conditions: string[] } }[];
      }
    ).items.map((i) => [i.data.name, i.data.conditions.join(' | ')]),
  );
const n = (x: number) => x.toLocaleString('en-US');

describe('rank conditions say the rules’ numbers', () => {
  const arabic = conditions('arabic');
  const morse = conditions('morse');

  it.each([
    [
      'Traveler',
      arabic,
      [`first ${TRAVELER_CHAPTERS} word chapters`, `${TRAVELER_CHAPTERS * 30} words`],
    ],
    ['Neighbor', arabic, [`at least ${LINES_FOR_XP} lines`]],
    ['Friend', arabic, [`Meet ${n(FRIEND_WORDS)} words`, `${FRIEND_CHATS} chats`]],
    ['Local', arabic, [`Meet ${n(LOCAL_WORDS)} words`, `all ${MAX_LINES} of your lines`]],
    [
      'Storyteller',
      arabic,
      [`old friend of ${STORY_FRIENDS} regulars`, `${OLD_FRIEND_CHATS} chats`],
    ],
    ['Keyer', morse, [`${KEYER_DRILLS} sending drills`, `${1200 / KEYER_DIT_MS} wpm`]],
    ['Ghost of the Ether', morse, [`at ${GHOST_WPM} wpm`, `Send at ${GHOST_WPM} wpm`]],
  ] as const)('%s', (name, ranks, phrases) => {
    const text = ranks.get(name) ?? '';
    for (const phrase of phrases) expect(text).toContain(phrase);
  });
});
