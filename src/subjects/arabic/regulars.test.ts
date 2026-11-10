import { describe, expect, it } from 'vitest';
import { WORD_CHAPTERS } from './core/coreWords.ts';
import { applyWordTrial, NEW_PROGRESS } from './progress.ts';
import { REGULARS, regularStatus } from './questline.ts';

const guest = { ...NEW_PROGRESS, guest: true };
const at = (words: Partial<typeof guest.words>) => ({
  ...guest,
  words: { ...guest.words, ...words },
});
const ids = (chapter: number, n: number) =>
  (WORD_CHAPTERS[chapter - 1]?.words ?? []).slice(0, n).map((w) => w.deck);

describe('the regulars: The Long Road In, chapters II–XI (#161)', () => {
  it('brings a regular for each of the 10 word chapters, in order', () => {
    expect(REGULARS.map((r) => [r.number, r.wordChapter])).toEqual(
      WORD_CHAPTERS.map((c) => [c.chapter + 1, c.chapter]),
    );
    expect(REGULARS.every((r) => r.trial.words === 30 && r.trial.accuracy === 0.9)).toBe(true);
  });

  it('lights a milestone for every 10 of the chapter’s words met', () => {
    expect(regularStatus(guest)).toMatchObject({ lit: 0, trialReady: false });
    expect(regularStatus(guest)?.beat).toBe(REGULARS[0]?.intro);
    const s = regularStatus(at({ met: ids(1, 21) }));
    expect(s?.lit).toBe(2);
    expect(s?.beat).toBe(REGULARS[0]?.milestones[1]);
  });

  it('opens the trial once the chapter is passed, and moves on once it is passed', () => {
    expect(regularStatus(at({ chapter: 2 }))).toMatchObject({
      regular: { number: 2 },
      trialReady: true,
    });
    const { next, passed } = applyWordTrial(at({ chapter: 2 }), 2, 0.93, 0.9);
    expect(passed).toBe(true);
    expect(next.words.trials).toEqual([2]);
    expect(regularStatus(next)).toMatchObject({ regular: { number: 3 }, trialReady: false });
    // Passed once: again is practice, and a low score never passes.
    expect(applyWordTrial(next, 2, 1, 0.9).passed).toBe(false);
    expect(applyWordTrial(at({ chapter: 2 }), 2, 0.8, 0.9).passed).toBe(false);
  });

  it('waits on a trial you skipped, and ends with the last regular', () => {
    expect(regularStatus(at({ chapter: 4, trials: [3] }))?.regular.number).toBe(2);
    const all = REGULARS.map((r) => r.number);
    const end = regularStatus(at({ chapter: 10, done: true, trials: all }));
    expect(end).toMatchObject({ regular: { number: 11 }, passed: true });
    expect(end?.beat).toBe(REGULARS[9]?.outro);
  });
});
