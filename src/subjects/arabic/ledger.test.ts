import { describe, expect, it } from 'vitest';
import { WORD_CHAPTERS } from './core/wordChapters.ts';
import { arabicLedger } from './ledger.ts';
import { LESSON_COUNT, LETTERS } from './letters.ts';
import { NEW_PROGRESS } from './progress.ts';

// The Caravanserai's lines in docs/game/ledger.md.

const empty = { cards: [], week: [], due: 0 };
const value = (rows: { label: string; value: string }[], label: string) =>
  rows.find((r) => r.label === label)?.value;

describe('the Caravanserai ledger', () => {
  it('shows honest zeros for a new player', () => {
    const l = arabicLedger(null, empty);
    expect(l.rows.map((r) => r.value)).toEqual([
      `0 of ${LETTERS.length}`,
      `0 of ${LESSON_COUNT}`,
      '0',
      '0',
      `0 of ${WORD_CHAPTERS.length}`,
      '0',
      '0',
    ]);
    expect(l.trend).toBe('No reviews this week yet.');
    expect(l.rows.every((r) => r.value !== '' && !r.value.includes('NaN'))).toBe(true);
  });

  it('reads an advanced player', () => {
    const [a, b] = LETTERS;
    const state = {
      ...NEW_PROGRESS,
      lesson: 3,
      met: [a?.id, b?.id, 'not-a-letter'],
      words: { ...NEW_PROGRESS.words, chapter: 4, met: ['w1', 'w2', 'w2', 'w3'] },
      chat: { ...NEW_PROGRESS.chat, chats: 5 },
    };
    const look = {
      cards: [
        { itemId: 'word:d:1', interval: 30, reps: 6 },
        { itemId: 'word:d:2', interval: 2, reps: 1 },
        { itemId: 'letter:beh', interval: 40, reps: 7 },
      ],
      week: ['word:d:1', 'word:d:2', 'letter:beh'],
      due: 4,
    };
    const l = arabicLedger(state, look);
    expect(value(l.rows, 'Letters met')).toBe(`2 of ${LETTERS.length}`);
    expect(value(l.rows, 'Script lessons passed')).toBe(`2 of ${LESSON_COUNT}`);
    expect(value(l.rows, 'Words met')).toBe('3');
    expect(value(l.rows, 'Words known')).toBe('1');
    expect(value(l.rows, 'Word chapters passed')).toBe(`3 of ${WORD_CHAPTERS.length}`);
    expect(value(l.rows, 'Chats held')).toBe('5');
    expect(value(l.rows, 'Reviews due')).toBe('4');
    expect(l.trend).toBe('This week: 1 new word met, 2 reviews.');
  });

  it('counts everything passed once the script and the path are done', () => {
    const state = {
      ...NEW_PROGRESS,
      lesson: LESSON_COUNT,
      done: true,
      words: { ...NEW_PROGRESS.words, chapter: WORD_CHAPTERS.length, done: true },
    };
    const l = arabicLedger(state, empty);
    expect(value(l.rows, 'Script lessons passed')).toBe(`${LESSON_COUNT} of ${LESSON_COUNT}`);
    const all = WORD_CHAPTERS.length;
    expect(value(l.rows, 'Word chapters passed')).toBe(`${all} of ${all}`);
  });
});
