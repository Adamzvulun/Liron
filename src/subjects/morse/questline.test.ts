import { describe, expect, it } from 'vitest';
import { MORSE_CHARS } from './code.ts';
import { CHAPTERS, questStatus } from './questline.ts';

const KOCH = MORSE_CHARS.map((c) => c.char);

describe('The Silent Beacon', () => {
  it('has chapters I and II, eight Koch characters each, in order, each lamp with a beat', () => {
    expect(CHAPTERS.map((c) => c.number)).toEqual([1, 2]);
    expect(CHAPTERS.flatMap((c) => c.letters)).toEqual(KOCH.slice(0, 16));
    for (const c of CHAPTERS) expect([...c.lamps.keys()]).toEqual(c.letters);
  });

  it('places the learner in the chapter of their newest letter', () => {
    const s = questStatus(KOCH.slice(0, 2));
    expect(s?.chapter.number).toBe(1);
    expect(s?.lit).toEqual(['K', 'M']);
    expect(s?.beat).toContain('Two sounds');
    expect(s?.trialReady).toBe(false);
    expect(questStatus(KOCH.slice(0, 8))?.trialReady).toBe(true);
    expect(questStatus(KOCH.slice(0, 9))?.chapter.number).toBe(2);
  });
});
