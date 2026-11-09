import { describe, expect, it } from 'vitest';
import { CHAPTER } from './questline.ts';
import { questlineStatus } from './tracker.ts';

describe('the Long Road In in the tracker (#47)', () => {
  it('is not started without saved state', () => {
    expect(questlineStatus(null)).toBeNull();
  });

  it('counts milestones, then names the trial', () => {
    expect(questlineStatus({ lesson: 4 })).toEqual({
      questline: 'The Long Road In',
      chapter: 'I: The Stranger at the Gate',
      done: 3,
      total: CHAPTER.lessons,
      unit: 'milestones',
    });
    expect(questlineStatus({ lesson: CHAPTER.lessons, done: true })?.next).toBe(
      'Trial: The Painted Sign',
    );
  });

  it('goes on with the regulars once you are a guest (#161)', () => {
    const guest = { lesson: CHAPTER.lessons, done: true, guest: true };
    expect(questlineStatus(guest)).toEqual({
      questline: 'The Long Road In',
      chapter: 'II: The Carter’s Greeting',
      done: 0,
      total: 3,
      unit: 'milestones',
    });
    expect(questlineStatus({ ...guest, words: { chapter: 2 } })?.next).toBe(
      'Trial: The Carter’s Roll Call',
    );
    expect(questlineStatus({ ...guest, words: { chapter: 2, trials: [2] } })?.chapter).toBe(
      'III: The Grandmother’s Questions',
    );
  });
});
