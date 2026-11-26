import { describe, expect, it } from 'vitest';
import { FINALE_ID } from '../qso/fortyWinters.ts';
import { climb, nextRung } from './ladder.ts';
import { charWpmOf, NEW_PROGRESS, type MorseProgress } from './progress.ts';
import { scoreCopy } from './score.ts';

const long = 'KM'.repeat(15).split('');
const good = scoreCopy(long, long);
const few = scoreCopy(['K', 'M'], ['K', 'M']);
const poor = scoreCopy(['K', 'M', 'K', 'M'], ['K', 'K', 'K', 'K']);
const day = (n: number) => new Date(`2026-12-0${n}T20:00:00Z`);
// Forty Winters passed, standard spacing at 20 wpm.
const open: MorseProgress = { ...NEW_PROGRESS, rankTrials: [FINALE_ID], effWpm: 20 };

describe('the speed ladder (#508)', () => {
  it('stays locked until Forty Winters is passed', () => {
    expect(nextRung(NEW_PROGRESS)).toBeUndefined();
    const { next, rung } = climb(
      { ...NEW_PROGRESS, effWpm: 20 },
      NEW_PROGRESS,
      good,
      day(1),
      false,
    );
    expect([rung, next.ladderDays]).toEqual([null, []]);
    expect(nextRung(open)).toBe(22);
  });

  it('opens a rung on the second 90% day, not the second run of one day', () => {
    const first = climb(open, open, good, day(1), false);
    expect([first.rung, first.next.ladderDays]).toEqual([null, ['2026-12-01']]);
    const same = climb(first.next, first.next, good, day(1), false);
    expect([same.rung, same.next.ladderDays]).toEqual([null, ['2026-12-01']]);
    const second = climb(first.next, first.next, good, day(2), false);
    expect(second.rung).toBe(22);
    expect(second.next).toMatchObject({ rungs: [22], charWpm: 22, ladderDays: [] });
    expect(nextRung(second.next)).toBe(25);
  });

  it('counts only a run of 30 characters or more', () => {
    expect(climb(open, open, few, day(1), false).next.ladderDays).toEqual([]);
    expect(climb(open, open, few, day(1), false, 1).next.ladderDays).toEqual(['2026-12-01']);
  });

  it('counts days by the player’s local day, so one night is not two days', () => {
    // 23:30 and 00:30 across local midnight are two days; 00:30 and 23:30 of one day are one.
    const at = (h: number, d: number) => new Date(2026, 11, d, h, 30);
    const first = climb(open, open, good, at(23, 1), false);
    expect(first.next.ladderDays).toEqual(['2026-12-01']);
    expect(climb(first.next, first.next, good, at(0, 2), false).rung).toBe(22);
    const morning = climb(open, open, good, at(0, 2), false);
    expect(climb(morning.next, morning.next, good, at(23, 2), false).rung).toBeNull();
  });

  it('counts only 90% runs, at standard spacing, not warm-ups', () => {
    expect(climb(open, open, poor, day(1), false).next.ladderDays).toEqual([]);
    expect(climb(open, open, good, day(1), true).next.ladderDays).toEqual([]);
    const spaced = { ...open, effWpm: 12 };
    expect(climb(spaced, spaced, good, day(1), false).next.ladderDays).toEqual([]);
  });

  it('counts at the top open speed only, not at a lowered one', () => {
    const lowered = { ...open, override: 18 };
    expect(climb(lowered, lowered, good, day(1), false).next.ladderDays).toEqual([]);
    const at22 = { ...open, rungs: [22], charWpm: 22, effWpm: 21 };
    expect(climb(at22, at22, good, day(1), false).next.ladderDays).toEqual([]);
  });

  it('keeps a manual override when a rung opens, and shows the rung as available', () => {
    const held = { ...open, override: 20, ladderDays: ['2026-12-01'] };
    const { next, rung } = climb(held, held, good, day(2), false);
    expect([rung, next.charWpm, charWpmOf(next)]).toEqual([22, 22, 20]);
  });

  it('ends at 35 wpm', () => {
    const top = { ...open, rungs: [22, 25, 28, 30, 35], charWpm: 35, effWpm: 35 };
    expect(nextRung(top)).toBeUndefined();
    expect(climb(top, top, good, day(1), false).rung).toBeNull();
  });
});
