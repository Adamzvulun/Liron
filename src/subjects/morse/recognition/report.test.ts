import { describe, expect, it, vi } from 'vitest';
import type { SubjectApi } from '../../../core/subject.ts';
import { NEW_PROGRESS, parseProgress } from '../lesson/progress.ts';
import { summarize, type Attempt } from './game.ts';
import { applyRound, letterScores, reportRound, xpForRound } from './report.ts';

const at = (char: string, pressed: string, ms: number): Attempt => ({
  char,
  pressed,
  right: char === pressed,
  ms,
});
const attempts = [at('K', 'K', 0), at('K', 'K', 3000), at('M', 'M', 1500), at('M', '', 3000)];

describe('saving an Instant Recognition round', () => {
  it('keeps the best score and smooths each letter’s reaction time', () => {
    const s = summarize(attempts);
    const once = applyRound(NEW_PROGRESS, s);
    expect(once.recognition).toEqual({ best: s.points, rounds: 1, avgMs: { K: 1500, M: 1500 } });
    const twice = applyRound(once, summarize([at('K', 'K', 500)]));
    expect(twice.recognition.best).toBe(s.points);
    expect(twice.recognition.avgMs.K).toBe(1100);
    expect(twice.recognition.rounds).toBe(2);
  });

  it('starts empty for saved state from before the game existed', () => {
    expect(parseProgress({ unlocked: 4 }).recognition).toEqual({ best: 0, rounds: 0, avgMs: {} });
  });

  it('rates each letter by the mean of its answers', () => {
    expect(letterScores(attempts)).toEqual(
      new Map([
        ['K', 0.75],
        ['M', 0.375],
      ]),
    );
  });

  it('pays about 10 XP for 25 right answers', () => {
    expect(xpForRound(summarize(Array.from({ length: 25 }, () => at('K', 'K', 400))))).toBe(10);
  });

  it('reports state, one rating per letter, XP, then minutes', async () => {
    const calls: string[] = [];
    const log = (name: string) =>
      vi.fn(async (...args: unknown[]) => {
        calls.push(`${name} ${args.slice(0, 3).map(String).join(' ')}`);
        return undefined as never;
      });
    const api = {
      saveState: log('state'),
      recordResult: log('result'),
      awardXP: log('xp'),
      recordPractice: log('minutes'),
    } as unknown as SubjectApi;
    const s = summarize(attempts);
    await reportRound(api, applyRound(NEW_PROGRESS, s), attempts, s, 60);
    expect(calls).toEqual([
      'state [object Object]',
      'result receive char:K 0.75',
      'result receive char:M 0.375',
      'xp 1',
      'minutes 1',
    ]);
  });
});
