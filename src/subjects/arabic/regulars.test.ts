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
  it('brings a regular for each word chapter, in order, from the first', () => {
    expect(REGULARS.length).toBeGreaterThanOrEqual(10);
    expect(REGULARS.map((r) => [r.number, r.wordChapter])).toEqual(
      WORD_CHAPTERS.slice(0, REGULARS.length).map((c) => [c.chapter + 1, c.chapter]),
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
    expect(end).toMatchObject({ regular: { number: REGULARS.length + 1 }, passed: true });
    expect(end?.beat).toBe(REGULARS[REGULARS.length - 1]?.outro);
  });
});

describe('the regulars past chapter 10 (#163, #205)', () => {
  it('bring the caravan’s regulars once you reach word chapter 11', () => {
    const s = regularStatus(
      at({ chapter: 11, trials: REGULARS.slice(0, 10).map((r) => r.number) }),
    );
    expect(s).toMatchObject({ regular: { number: 12, who: 'Samira the tailor' }, lit: 0 });
    expect(s?.beat).toBe(REGULARS[10]?.intro);
  });

  it('seat a regular for every word chapter, the second caravan from chapter 22', () => {
    expect(REGULARS.map((r) => r.wordChapter)).toEqual(WORD_CHAPTERS.map((c) => c.chapter));
    const s = regularStatus(
      at({ chapter: 21, trials: REGULARS.slice(0, 20).map((r) => r.number) }),
    );
    expect(s).toMatchObject({ regular: { number: 22, who: 'Khalid the trader' }, lit: 0 });
    expect(REGULARS[33]).toMatchObject({ number: 35, who: 'The innkeeper' });
    expect(REGULARS[REGULARS.length - 1]).toMatchObject({
      number: 96,
      who: 'Nadia, a traveler on her way home',
    });
  });

  it('keep the last one you reached at the table once every trial is passed', () => {
    const all = REGULARS.map((r) => r.number);
    expect(regularStatus(at({ chapter: 15, trials: all }))?.regular.number).toBe(16);
    // Past the last regular's chapter, the last regular stays.
    const last = REGULARS[REGULARS.length - 1];
    const s = regularStatus(at({ chapter: (last?.wordChapter ?? 0) + 3, trials: all }));
    expect(s?.regular.number).toBe(last?.number);
    expect(s?.passed).toBe(true);
    expect(s?.trialReady).toBe(false);
  });
});
