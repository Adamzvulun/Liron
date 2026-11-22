import { describe, expect, it } from 'vitest';
import { nextVisit, whoSpeaks, type Visit, type Voice, type Wanting } from './voice.ts';

const none: Wanting = {
  celebration: false,
  firstPage: false,
  guide: false,
  onSquare: true,
  spokenThisVisit: false,
};

describe('one voice at a time (#408)', () => {
  it('a celebration comes first, then the first page, then the guide', () => {
    expect(whoSpeaks({ ...none, celebration: true, firstPage: true, guide: true })).toBe(
      'celebration',
    );
    expect(whoSpeaks({ ...none, firstPage: true, guide: true })).toBe('first-page');
    expect(whoSpeaks({ ...none, guide: true })).toBe('guide');
    expect(whoSpeaks(none)).toBeNull();
  });

  it('the guide speaks only on the square (never in a lesson or a hall)', () => {
    expect(whoSpeaks({ ...none, guide: true, onSquare: false })).toBeNull();
    // A level-up is celebrated wherever it happens.
    expect(whoSpeaks({ ...none, celebration: true, onSquare: false })).toBe('celebration');
  });

  it('the guide waits for the next visit once something else has spoken', () => {
    expect(whoSpeaks({ ...none, guide: true, spokenThisVisit: true })).toBeNull();
  });
});

describe('a visit to the square', () => {
  const walk = (steps: [boolean, Voice][]) =>
    steps.reduce<Visit>((v, [onSquare, speaking]) => nextVisit(v, onSquare, speaking), {
      onSquare: false,
      spoken: false,
    });

  it('remembers a celebration until the player leaves and comes back', () => {
    const dismissed = walk([
      [true, null],
      [true, 'celebration'],
      [true, null],
    ]);
    expect(dismissed.spoken).toBe(true);
    expect(
      walk([
        [true, null],
        [true, 'celebration'],
        [true, null],
        [false, null],
        [true, null],
      ]).spoken,
    ).toBe(false);
  });

  it('the first page quiets the visit too', () => {
    expect(
      walk([
        [true, 'first-page'],
        [true, null],
      ]).spoken,
    ).toBe(true);
  });

  it('a celebration in a hall does not quiet the next visit to the square', () => {
    expect(
      walk([
        [false, 'celebration'],
        [false, null],
        [true, null],
      ]).spoken,
    ).toBe(false);
  });
});
