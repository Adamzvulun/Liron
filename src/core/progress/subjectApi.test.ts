import { describe, expect, it } from 'vitest';
import { memoryStore } from './store.ts';
import { subjectApi } from './subjectApi.ts';

describe('subjectApi', () => {
  it('is bound to one subject', async () => {
    const store = memoryStore();
    const morse = subjectApi({ id: 'morse' }, store);
    const arabic = subjectApi({ id: 'arabic' }, store);
    await morse.awardXP(7);
    await arabic.recordPractice(4);
    expect(morse.subjectId).toBe('morse');
    expect(await morse.progressSummary()).toEqual({ xp: 7, minutes: 0 });
    expect(await arabic.progressSummary()).toEqual({ xp: 0, minutes: 4 });
    expect((await store.wallet()).xp).toBe(7);
  });

  it('refuses invalid subject ids', () => {
    expect(() => subjectApi({ id: 'Morse' }, memoryStore())).toThrow(/Invalid subject id/);
  });

  it('only awards whole, positive, sane XP', async () => {
    const api = subjectApi({ id: 'morse' }, memoryStore());
    for (const bad of [0, -5, 1.5, 10_001, Number.NaN]) {
      await expect(api.awardXP(bad)).rejects.toThrow(RangeError);
    }
    expect(await api.progressSummary()).toEqual({ xp: 0, minutes: 0 });
  });

  it('rounds practice to whole minutes and ignores under half a minute', async () => {
    const api = subjectApi({ id: 'morse' }, memoryStore());
    await api.recordPractice(0.4);
    await api.recordPractice(2.6);
    expect(await api.progressSummary()).toEqual({ xp: 0, minutes: 3 });
    for (const bad of [-1, 241, Number.POSITIVE_INFINITY]) {
      await expect(api.recordPractice(bad)).rejects.toThrow(RangeError);
    }
  });

  it('keeps state per subject and returns copies', async () => {
    const store = memoryStore();
    const api = subjectApi<{ level: number }>({ id: 'morse' }, store);
    expect(await api.loadState()).toBeNull();
    const state = { level: 2 };
    await api.saveState(state);
    state.level = 99;
    expect(await api.loadState()).toEqual({ level: 2 });
    expect(await store.loadState('arabic')).toBeNull();
    await expect(api.saveState([] as unknown as { level: number })).rejects.toThrow(TypeError);
  });
});

describe('awards', () => {
  it('tell the platform about every award, including level-ups and what they paid', async () => {
    const awards: unknown[] = [];
    const api = subjectApi({ id: 'morse' }, memoryStore(), (a) => awards.push(a));
    await api.awardXP(25);
    await api.recordPractice(3);
    expect(awards).toEqual([
      expect.objectContaining({
        xp: 25,
        gold: 15, // 5 for 25 XP + 10 for reaching level 2
        gems: 0,
        xpEarned: 25,
        goldEarned: 15,
        gemsEarned: 0,
        levelBefore: 1,
        level: 2,
      }),
      expect.objectContaining({ xp: 25, xpEarned: 0, goldEarned: 0, level: 2 }),
    ]);
  });
});
