import { describe, expect, it } from 'vitest';
import { MORSE_CHARS } from './code.ts';
import { CHAPTERS, questStatus } from './questline.ts';

const KOCH = MORSE_CHARS.map((c) => c.char);

describe('The Silent Beacon', () => {
  it('covers the whole Koch order in chapters I to V, in order, each lamp with a beat', () => {
    expect(CHAPTERS.map((c) => c.number)).toEqual([1, 2, 3, 4, 5]);
    expect(CHAPTERS.flatMap((c) => c.letters)).toEqual(KOCH);
    for (const c of CHAPTERS) expect([...c.lamps.keys()]).toEqual(c.letters);
  });

  it('pays more for each later trial, and never asks less than 90%', () => {
    const xp = CHAPTERS.map((c) => c.trial.xp);
    expect(xp).toEqual([...xp].sort((a, b) => a - b));
    for (const c of CHAPTERS) expect(c.trial.accuracy).toBeGreaterThanOrEqual(0.9);
  });

  it('places the learner in the chapter of their newest letter', () => {
    const s = questStatus(KOCH.slice(0, 2));
    expect(s?.chapter.number).toBe(1);
    expect(s?.lit).toEqual(['K', 'M']);
    expect(s?.beat).toContain('Two sounds');
    expect(s?.trialReady).toBe(false);
    expect(questStatus(KOCH.slice(0, 8))?.trialReady).toBe(true);
    expect(questStatus(KOCH.slice(0, 9))?.chapter.number).toBe(2);
    // The last chapter has nine lamps: the trial waits for all of them.
    expect(questStatus(KOCH.slice(0, 40))?.trialReady).toBe(false);
    expect(questStatus(KOCH)?.chapter.number).toBe(5);
    expect(questStatus(KOCH)?.trialReady).toBe(true);
  });
});
