import { describe, expect, it, vi } from 'vitest';
import type { SubjectApi } from '../../../core/subject.ts';
import { NEW_PROGRESS } from '../lesson/progress.ts';
import type { Decoded } from './decoder.ts';
import {
  applyLamp,
  LAMP_POOL,
  LAMP_WORDS,
  lampResult,
  lampText,
  reportLamp,
  wordsRight,
} from './lampSignal.ts';

const read = (text: string, ditMs: number): Decoded => ({
  text,
  marks: [],
  gaps: [],
  ditMs,
  keying: false,
});

describe('the Lamp Signal (#175)', () => {
  it('draws 10 different short common words', () => {
    const words = lampText(() => 0.37).split(' ');
    expect(words).toHaveLength(LAMP_WORDS);
    expect(new Set(words).size).toBe(LAMP_WORDS);
    expect(words.every((w) => LAMP_POOL.includes(w) && /^[A-Z]{2,5}$/.test(w))).toBe(true);
  });

  it('counts words read right in order, so one split word costs only itself', () => {
    expect(wordsRight(['THE', 'CAT', 'SAT'], ['THE', 'CAT', 'SAT'])).toBe(3);
    expect(wordsRight(['THE', 'CAT', 'SAT'], ['THE', 'CA', 'T', 'SAT'])).toBe(2);
    expect(wordsRight(['THE', 'CAT', 'SAT'], ['THECAT', 'SAT'])).toBe(1);
    expect(wordsRight(['A', 'B'], [])).toBe(0);
  });

  it('passes with 9 of 10 words at 15 wpm or faster, and not otherwise', () => {
    const text = 'ONE TWO SIX TEN FOR AND THE YOU ARE NOT';
    const nine = 'ONE TWO SIX TEN FOR AND THE YOU ARE NOR';
    expect(lampResult(text, read(nine, 80))).toMatchObject({ right: 9, wpm: 15, passed: true });
    expect(lampResult(text, read(nine, 85))).toMatchObject({
      read: true,
      fast: false,
      passed: false,
    });
    const eight = 'ONE TWO SIX TEN FOR AND THE YOU AR NOR';
    expect(lampResult(text, read(eight, 60))).toMatchObject({ right: 8, passed: false });
  });

  it('saves a first pass with its event and 50 XP; later tries earn 10', async () => {
    const saveSession = vi.fn<SubjectApi['saveSession']>().mockResolvedValue(undefined);
    const api = { saveSession } as unknown as SubjectApi;
    const pass = { right: 10, total: 10, wpm: 16, read: true, fast: true, passed: true };
    const next = applyLamp(NEW_PROGRESS, pass);
    expect(next.rankTrials).toEqual(['lamp-signal']);
    await reportLamp(api, NEW_PROGRESS, next, pass, 90);
    expect(saveSession.mock.calls[0]?.[0]).toMatchObject({
      xp: 50,
      events: [{ kind: 'trial-lamp-signal' }],
    });
    expect(applyLamp(next, pass)).toBe(next);
    await reportLamp(api, next, next, pass, 90);
    expect(saveSession.mock.calls[1]?.[0]).toMatchObject({ xp: 10, events: [] });
  });
});
