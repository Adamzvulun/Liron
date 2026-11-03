import { describe, expect, it, vi } from 'vitest';
import type { SubjectApi } from '../../../core/subject.ts';
import {
  applyRun,
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
  it('saves state, then reviews and rates each character, then XP and minutes', async () => {
    const calls: string[] = [];
    const log = (name: string) =>
      vi.fn(async (...args: unknown[]) => {
        calls.push(`${name} ${args.slice(0, 3).map(String).join(' ')}`);
        return undefined as never;
      });
    const api = {
      saveState: log('state'),
      recordReview: log('review'),
      recordResult: log('result'),
      awardXP: log('xp'),
      recordPractice: log('minutes'),
    } as unknown as SubjectApi;
    const score = run('KMKMK', 'KMKKK');
    await reportRun(api, NEW_PROGRESS, score, false, 120, at);
    expect(calls).toEqual([
      'state [object Object]',
      `review char:K good ${at}`,
      'result receive char:K 1',
      `review char:M again ${at}`,
      'result receive char:M 0.5',
      'xp 1',
      'minutes 2',
    ]);
  });
});
