import { describe, expect, it } from 'vitest';
import type { SubjectInfo } from '../subject.ts';
import {
  habitOf,
  habitRows,
  KNOWN_DAYS,
  knownCount,
  loadLedger,
  trendLine,
  weekOf,
  type LedgerSources,
} from './ledger.ts';

// Each test pins one definition in docs/game/ledger.md.

const card = (itemId: string, interval: number, reps: number) => ({ itemId, interval, reps });

describe('known', () => {
  it('is an interval of 21 days or more, for ids with the prefix only', () => {
    const cards = [
      card('word:a', KNOWN_DAYS, 5),
      card('word:b', KNOWN_DAYS - 1, 4),
      card('word:c', 90, 9),
      card('letter:beh', 60, 6),
    ];
    expect(knownCount(cards, 'word:')).toBe(2);
    expect(knownCount([], 'word:')).toBe(0);
  });
});

describe('this week', () => {
  it('counts the reviews, and the cards whose every review is in the week as met', () => {
    const look = {
      // a: two reviews, both this week (new); b: one this week of three (old); c: other prefix.
      cards: [card('word:a', 1, 2), card('word:b', 8, 3), card('char:K', 3, 1)],
      week: ['word:a', 'word:a', 'word:b', 'char:K'],
      due: 0,
    };
    expect(weekOf(look, 'word:')).toEqual({ reviews: 3, met: 1 });
    expect(weekOf({ cards: [], week: [], due: 0 }, 'word:')).toEqual({ reviews: 0, met: 0 });
  });

  it('says the week in words', () => {
    const noun = { one: 'word', many: 'words' };
    expect(trendLine({ reviews: 40, met: 12 }, noun)).toBe(
      'This week: 12 new words met, 40 reviews.',
    );
    expect(trendLine({ reviews: 1, met: 1 }, noun)).toBe('This week: 1 new word met, 1 review.');
    expect(trendLine({ reviews: 7, met: 0 }, noun)).toBe('This week: 7 reviews.');
    expect(trendLine({ reviews: 0, met: 0 }, noun)).toBe('No reviews this week yet.');
  });
});

describe('the habit', () => {
  const today = '2026-11-17';
  it('counts days in the last 30, minutes in the last 7 and the longest run', () => {
    const h = habitOf(
      [
        { day: '2026-11-17', minutes: 10 },
        { day: '2026-11-16', minutes: 5 },
        { day: '2026-11-10', minutes: 20 }, // 7 days back: out of the week
        { day: '2026-10-19', minutes: 3 }, // 30th day back: in
        { day: '2026-10-18', minutes: 3 }, // 31st: out
        { day: '2026-10-17', minutes: 3 },
        { day: '2026-10-16', minutes: 3 },
        { day: '2026-11-12', minutes: 0 }, // no minutes: not a day practiced
      ],
      today,
    );
    expect(h).toEqual({ days30: 4, weekMinutes: 15, longestRun: 4 });
  });

  it('shows honest zeros for a new player', () => {
    const h = habitOf([], today);
    expect(h).toEqual({ days30: 0, weekMinutes: 0, longestRun: 0 });
    expect(habitRows(h).map((r) => r.value)).toEqual(['0 of 30', '0', '0 days']);
  });

  it('runs across a month end', () => {
    const days = ['2026-10-30', '2026-10-31', '2026-11-01'].map((day) => ({ day, minutes: 1 }));
    expect(habitOf(days, today).longestRun).toBe(3);
  });
});

describe('loading', () => {
  const subject = (id: string, ledger?: SubjectInfo['ledger']): SubjectInfo => ({
    id,
    place: id,
    tagline: '',
    guildColor: 'red',
    ledger,
  });
  const sources = (over: Partial<LedgerSources> = {}): LedgerSources => ({
    loadState: async () => null,
    due: async () => 2,
    cards: async () => [],
    reviewsSince: async () => [],
    activity: async () => [],
    ...over,
  });

  it('asks each subject with a ledger, and a failing one leaves the others', async () => {
    const seen: number[] = [];
    const ok = subject('ok', async (_s, look) => {
      seen.push(look.due);
      return { rows: [], trend: 't' };
    });
    const broken = subject('broken', async () => {
      throw new Error('no');
    });
    const l = await loadLedger([ok, broken, subject('none')], sources(), '2026-11-17');
    expect(l.blocks.map((b) => [b.subject, b.answer?.trend ?? null])).toEqual([
      ['ok', 't'],
      ['broken', null],
    ]);
    expect(seen).toEqual([2]);
    expect(l.habit).toEqual({ days30: 0, weekMinutes: 0, longestRun: 0 });
  });

  it('asks for the reviews of the last 7 days', async () => {
    let asked: Date | undefined;
    const now = new Date('2026-11-17T12:00:00Z');
    await loadLedger(
      [subject('a', async () => ({ rows: [], trend: '' }))],
      sources({ reviewsSince: async (_id, since) => ((asked = since), []) }),
      '2026-11-17',
      now,
    );
    expect(asked?.toISOString()).toBe('2026-11-10T12:00:00.000Z');
  });

  it('still shows the subjects when the days cannot be read', async () => {
    const l = await loadLedger(
      [],
      sources({ activity: () => Promise.reject(new Error('x')) }),
      '2026-11-17',
    );
    expect(l.habit).toBeNull();
  });
});
