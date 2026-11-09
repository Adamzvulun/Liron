import { describe, expect, it } from 'vitest';
import { CHAPTER } from './questline.ts';
import { questlineStatus } from './tracker.ts';

describe('the Long Road In in the tracker (#47)', () => {
  it('is not started without saved state', () => {
    expect(questlineStatus(null)).toBeNull();
  });

  it('counts milestones, then names the trial, then the rank it gave', () => {
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
    expect(questlineStatus({ lesson: CHAPTER.lessons, done: true, guest: true })?.next).toBe(
      'Guest of the house',
    );
  });
});
