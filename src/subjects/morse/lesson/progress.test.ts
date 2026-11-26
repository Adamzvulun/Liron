import { describe, expect, it, vi } from 'vitest';
import type { SubjectApi } from '../../../core/subject.ts';
import { CHAPTERS } from '../questline.ts';
import { buildRun } from './build.ts';
import {
  applyRun,
  applyTrial,
  charWpmOf,
  speedOf,
  topSpeed,
  pendingTrial,
  isWarmup,
  NEW_PROGRESS,
  newestChar,
  parseProgress,
  reportRun,
  toMeet,
  weightsFor,
  xpFor,
} from './progress.ts';
import { scoreCopy } from './score.ts';

const run = (played: string, copied: string) => scoreCopy(played.split(''), copied.split(''));
const at = new Date('2026-11-03T20:00:00Z');

describe('Morse progress', () => {
  it('starts at lesson 1 with K and M to meet', () => {
    expect(parseProgress(null)).toEqual(NEW_PROGRESS);
    expect(toMeet(NEW_PROGRESS)).toEqual(['K', 'M']);
    expect(newestChar(NEW_PROGRESS)).toBeUndefined();
  });

  it('reads broken saved state forgivingly', () => {
    const p = parseProgress({ unlocked: 'lots', effWpm: 12, met: ['K'] });
    expect(p.unlocked).toBe(2);
    expect(p.effWpm).toBe(12);
    expect(toMeet(p)).toEqual(['M']);
  });

  it('keeps a 35 wpm rung through a save and reload', () => {
    const p = parseProgress({ rungs: [22, 25, 28, 30, 35], charWpm: 35, effWpm: 33 });
    expect([p.charWpm, p.effWpm]).toEqual([35, 33]);
  });

  it('reads an old save as 20 wpm with no override and no rungs', () => {
    const p = parseProgress({ unlocked: 5, effWpm: 12 });
    expect([p.charWpm, p.override, p.rungs]).toEqual([20, null, []]);
    expect(speedOf(p)).toEqual({ charWpm: 20, effWpm: 12 });
  });

  it('plays at the override, else the automatic speed, never past the ladder', () => {
    const rung = { rungs: [22, 25], charWpm: 25 };
    expect(topSpeed(parseProgress(rung))).toBe(25);
    expect(charWpmOf(parseProgress(rung))).toBe(25);
    expect(charWpmOf(parseProgress({ ...rung, override: 20 }))).toBe(20);
    expect(charWpmOf(parseProgress({ ...rung, override: 18 }))).toBe(18);
    // a speed the ladder hasn't opened (a hand-edited save) is not played
    expect(charWpmOf(parseProgress({ override: 30 }))).toBe(20);
    expect(charWpmOf(parseProgress({ charWpm: 99, override: 7 }))).toBe(20);
  });

  it('keeps Farnsworth spacing automatic and below the character speed', () => {
    expect(speedOf(parseProgress({ override: 18, effWpm: 20 }))).toEqual({
      charWpm: 18,
      effWpm: 18,
    });
    expect(speedOf(parseProgress({ rungs: [22], charWpm: 22, effWpm: 21 }))).toEqual({
      charWpm: 22,
      effWpm: 21,
    });
  });

  it('unlocks the next character after two runs in a row at 90%', () => {
    const first = applyRun(NEW_PROGRESS, run('KMKMKMKMKM', 'KMKMKMKMKM'), at);
    expect(first.unlockedNow).toBe(false);
    const second = applyRun(first.next, run('KMKMKMKMKM', 'KMKMKMKMKK'), at);
    expect(second.unlockedNow).toBe(true);
    expect(second.next.unlocked).toBe(3);
    expect(second.next.recent).toEqual([]);
    expect(newestChar(second.next)).toBe('U');
    expect(toMeet({ ...second.next, met: ['K', 'M'] })).toEqual(['U']);
  });

  it('adjusts speed and smooths each character’s accuracy', () => {
    const { next } = applyRun(NEW_PROGRESS, run('KKKKMMMMMM', 'KKKKMMMMKK'), at);
    expect(next.effWpm).toBe(9); // 80%: one step slower
    expect(next.accuracy).toEqual({ K: 1, M: 4 / 6 });
    expect(next.lastRunAt).toBe(at.toISOString());
    expect(weightsFor(next, new Set(['K'])).get('K')).toBe(2);
    expect(weightsFor(next, new Set()).get('M')).toBeCloseTo(1 + 2 / 3);
  });

  it('starts with a warm-up after a day away, which never unlocks', () => {
    const p = { ...NEW_PROGRESS, unlocked: 5, recent: [0.95], lastRunAt: '2026-11-01T20:00:00Z' };
    expect(isWarmup(p, at)).toBe(true);
    expect(isWarmup({ ...p, lastRunAt: '2026-11-03T08:00:00Z' }, at)).toBe(false);
    const { next, unlockedNow } = applyRun(p, run('KMURE', 'KMURE'), at, true);
    expect(unlockedNow).toBe(false);
    expect(next.recent).toEqual([0.95]);
  });

  it('pays about 1 XP per 5 right, plus 10 for a new lamp', () => {
    expect(xpFor(run('KKKKKKKKKK', 'KKKKKKKKKK'), false)).toBe(2);
    expect(xpFor(run('KKKKKKKKKK', 'KKKKKKKKKK'), true)).toBe(12);
  });
});

describe('reportRun', () => {
  it('saves state, reviews and ratings of each character, XP and minutes in one save', async () => {
    const saveSession = vi.fn(async () => undefined);
    const api = { saveSession } as unknown as SubjectApi;
    const score = run('KMKMK', 'KMKKK');
    await reportRun(api, NEW_PROGRESS, score, false, 120, at);
    expect(saveSession.mock.calls).toEqual([
      [
        {
          state: NEW_PROGRESS,
          reviews: [
            { itemId: 'char:K', grade: 'good' },
            { itemId: 'char:M', grade: 'hard' },
          ],
          results: [
            { skill: 'receive', itemId: 'char:K', score: 1 },
            { skill: 'receive', itemId: 'char:M', score: 0.5 },
          ],
          xp: 1,
          minutes: 2,
          events: [{ kind: 'run' }],
          at,
        },
      ],
    ]);
  });

  it('sends ladder-rung and the 25 and 30 events from the rungs held, with every report (#508)', async () => {
    const saveSession = vi.fn<(report: { events?: { kind: string }[] }) => Promise<void>>(
      async () => undefined,
    );
    const api = { saveSession } as unknown as SubjectApi;
    const kinds = async (rungs: number[]) => {
      saveSession.mockClear();
      await reportRun(api, { ...NEW_PROGRESS, rungs }, run('KM', 'KM'), false, 60, at);
      return saveSession.mock.calls[0]?.[0].events?.map((e) => e.kind);
    };
    expect(await kinds([])).toEqual(['run', 'run-90']);
    expect(await kinds([22])).toEqual(['run', 'run-90', 'ladder-rung']);
    // A report with no new rung still carries them, so a failed save never sticks the chain.
    expect(await kinds([22, 25])).toEqual(['run', 'run-90', 'ladder-rung', 'ladder-25']);
    expect(await kinds([22, 25, 28, 30])).toEqual([
      'run',
      'run-90',
      'ladder-rung',
      'ladder-25',
      'trial-ladder-30',
    ]);
  });

  it('pays a passed trial’s XP in the same save, with no call of its own (review, 2026-11-15)', async () => {
    const saveSession = vi.fn<(report: { xp?: number }) => Promise<void>>(async () => undefined);
    const awardXP = vi.fn();
    const api = { saveSession, awardXP } as unknown as SubjectApi;
    await reportRun(api, NEW_PROGRESS, run('KMKMK', 'KMKKK'), false, 120, at, 100);
    expect(saveSession.mock.calls[0]?.[0].xp).toBe(101);
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('names each trial passed so far (ADR 0033)', async () => {
    const saveSession = vi.fn<(report: { events?: unknown }) => Promise<void>>(
      async () => undefined,
    );
    const api = { saveSession } as unknown as SubjectApi;
    const passed = { ...NEW_PROGRESS, trials: [1, 2] };
    await reportRun(api, passed, run('KMKMKMKMKM', 'KMKMKMKMKM'), false, 120, at);
    expect(saveSession.mock.calls[0]?.[0].events).toEqual([
      { kind: 'run' },
      { kind: 'run-90' },
      { kind: 'trial-1' },
      { kind: 'trial-2' },
    ]);
  });

  it('reports a run at 90% for the daily contract (ADR 0032)', async () => {
    const saveSession = vi.fn<(report: { events?: unknown }) => Promise<void>>(
      async () => undefined,
    );
    const api = { saveSession } as unknown as SubjectApi;
    await reportRun(api, NEW_PROGRESS, run('KMKMKMKMKM', 'KMKMKMKMKM'), false, 120, at);
    expect(saveSession.mock.calls[0]?.[0].events).toEqual([{ kind: 'run' }, { kind: 'run-90' }]);
  });
});

describe('chapter trials (#34)', () => {
  const ch1 = CHAPTERS[0];
  const atEnd = { ...NEW_PROGRESS, unlocked: 8, recent: [0.95] };
  const perfect = (n: number) => run('K'.repeat(n), 'K'.repeat(n));

  it('waits at the end of a chapter until its trial is passed', () => {
    expect(pendingTrial(NEW_PROGRESS)).toBeUndefined();
    expect(pendingTrial(atEnd)?.trial.name).toBe('The Gatekeeper');
    expect(pendingTrial({ ...atEnd, trials: [1] })).toBeUndefined();
    expect(pendingTrial({ ...atEnd, unlocked: 16, trials: [1] })?.trial.name).toBe(
      'The Warden of the Stair',
    );
  });

  it('holds the gate: two good runs don’t unlock the next chapter’s first letter', () => {
    const { next, unlockedNow } = applyRun(atEnd, perfect(10), at);
    expect(unlockedNow).toBe(false);
    expect(next.unlocked).toBe(8);
  });

  it('opens the gate at 90% over 50 characters, unlocking the next letter', () => {
    if (!ch1) throw new Error('no chapter I');
    const passed = applyTrial(atEnd, ch1, perfect(50), at);
    expect(passed.passed).toBe(true);
    expect(passed.next).toMatchObject({ unlocked: 9, trials: [1], recent: [] });
    expect(applyTrial(atEnd, ch1, run('K'.repeat(50), 'K'.repeat(40)), at).passed).toBe(false);
    expect(applyTrial(atEnd, ch1, perfect(20), at).passed).toBe(false);
    expect(applyTrial(atEnd, ch1, run('KMKMK', 'KMKMK'), at).next.recent).toEqual([0.95]);
  });

  it('builds a trial of exactly 50 characters', () => {
    expect(buildRun(['K', 'M'], { charWpm: 20, effWpm: 10 }, { count: 50 }).chars).toHaveLength(50);
  });
});
