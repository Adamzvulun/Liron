import { describe, expect, it } from 'vitest';
import { MORSE_CHARS } from './code.ts';
import { NEW_PROGRESS } from './lesson/progress.ts';
import { morseLedger } from './ledger.ts';

// The Signal Tower's lines in docs/game/ledger.md.

const empty = { cards: [], week: [], due: 0 };
const value = (rows: { label: string; value: string }[], label: string) =>
  rows.find((r) => r.label === label)?.value;

describe('the Signal Tower ledger', () => {
  it('shows honest zeros for a new player', () => {
    const l = morseLedger(null, empty);
    expect(l.rows.map((r) => r.value)).toEqual([
      `2 of ${MORSE_CHARS.length}`,
      '10 wpm',
      'Opens after Forty Winters',
      'No drill yet',
      '0',
      '0',
      '0',
      'Hear 10 of 20 wpm · key 0 of 15 wpm',
    ]);
    expect(l.trend).toBe('No reviews this week yet.');
  });

  it('reads an advanced player', () => {
    const state = {
      ...NEW_PROGRESS,
      unlocked: 12,
      effWpm: 13.6,
      sending: { drills: 4, ditMs: 100, fastest: 80 },
      recognition: { ...NEW_PROGRESS.recognition, best: 31 },
      radio: { ...NEW_PROGRESS.radio, contacts: 3 },
    };
    const look = {
      cards: [
        { itemId: 'char:K', interval: 9, reps: 8 },
        { itemId: 'char:R', interval: 1, reps: 2 },
      ],
      week: ['char:K', 'char:R', 'char:R', 'abbr:qth'],
      due: 1,
    };
    const l = morseLedger(state, look);
    expect(value(l.rows, 'Characters learned')).toBe(`12 of ${MORSE_CHARS.length}`);
    expect(value(l.rows, 'Copy speed')).toBe('14 wpm');
    // The fastest drill: a dot of 80 ms is 15 words a minute.
    expect(value(l.rows, 'Sending speed')).toBe('15 wpm');
    expect(value(l.rows, 'Recognition best')).toBe('31');
    expect(value(l.rows, 'Contacts logged')).toBe('3');
    expect(value(l.rows, 'Reviews due')).toBe('1');
    expect(l.trend).toBe('This week: 1 new character met, 3 reviews.');
    expect(value(l.rows, 'Capstone: Forty Winters')).toBe('Hear 14 of 20 wpm · key 15 of 15 wpm');
  });

  it('shows the distance to the capstone, and when it’s passed (task 4.3)', () => {
    const watched = { ...NEW_PROGRESS, effWpm: 12, rankTrials: ['night-watch'] };
    expect(value(morseLedger(watched, empty).rows, 'Capstone: Forty Winters')).toBe(
      'Hear 20 of 20 wpm · key 0 of 15 wpm',
    );
    const passed = { ...watched, rankTrials: ['night-watch', 'forty-winters'] };
    expect(value(morseLedger(passed, empty).rows, 'Capstone: Forty Winters')).toBe(
      'Passed: Keeper of the Hour',
    );
  });

  it('falls back to the last drill for progress saved before the fastest was kept', () => {
    const state = { ...NEW_PROGRESS, sending: { drills: 1, ditMs: 120 } };
    expect(value(morseLedger(state, empty).rows, 'Sending speed')).toBe('10 wpm');
  });

  it('reads the speed ladder in its three states (#508)', () => {
    const line = (state: object) => value(morseLedger(state, empty).rows, 'Speed ladder');
    const won = { ...NEW_PROGRESS, rankTrials: ['forty-winters'] };
    expect(line(NEW_PROGRESS)).toBe('Opens after Forty Winters');
    expect(line(won)).toBe('Letters at 20 wpm · next rung 22');
    expect(line({ ...won, rungs: [22, 25, 28, 30, 35] })).toBe('Top rung: 35 wpm');
  });
});
