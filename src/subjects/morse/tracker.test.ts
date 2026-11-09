import { describe, expect, it } from 'vitest';
import { questlineStatus } from './tracker.ts';

describe('the Silent Beacon in the tracker (#47)', () => {
  it('is not started without saved state', () => {
    expect(questlineStatus(null)).toBeNull();
  });

  it('counts lamps lit in the chapter, then names the trial, then moves on', () => {
    expect(questlineStatus({ unlocked: 6 })).toEqual({
      questline: 'The Silent Beacon',
      chapter: 'I: Embers',
      done: 6,
      total: 8,
      unit: 'lamps',
    });
    expect(questlineStatus({ unlocked: 8 })?.next).toBe('Trial: The Gatekeeper');
    expect(questlineStatus({ unlocked: 8, trials: [1] })?.next).toBe('Trial passed');
    expect(questlineStatus({ unlocked: 9, trials: [1] })).toMatchObject({
      chapter: 'II: The Upper Stair',
      done: 1,
    });
  });

  it('ends with the beacon relit: all nine lamps of chapter V and its trial passed', () => {
    expect(questlineStatus({ unlocked: 41, trials: [1, 2, 3, 4] })).toMatchObject({
      chapter: 'V: The Beacon Speaks',
      done: 9,
      total: 9,
      next: 'Trial: The Beacon’s Answer',
    });
    expect(questlineStatus({ unlocked: 41, trials: [1, 2, 3, 4, 5] })?.next).toBe('Trial passed');
  });
});
