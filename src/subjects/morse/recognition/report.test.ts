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

  it('reports state, one rating per letter, XP and minutes in one save', async () => {
    const saveSession = vi.fn(async () => undefined);
    const api = { saveSession } as unknown as SubjectApi;
    const s = summarize(attempts);
    const next = applyRound(NEW_PROGRESS, s);
    await reportRound(api, next, attempts, s, 60);
    expect(saveSession.mock.calls).toEqual([
      [
        {
          state: next,
          results: [
            { skill: 'receive', itemId: 'char:K', score: 0.75 },
            { skill: 'receive', itemId: 'char:M', score: 0.375 },
          ],
          xp: 1,
          minutes: 1,
          events: [{ kind: 'recognition-round' }],
          at: expect.any(Date),
        },
      ],
    ]);
  });

  it('reports beating the best for the daily contract (ADR 0032)', async () => {
    const saveSession = vi.fn<(report: { events?: unknown }) => Promise<void>>(
      async () => undefined,
    );
    const api = { saveSession } as unknown as SubjectApi;
    const s = summarize(attempts);
    await reportRound(api, applyRound(NEW_PROGRESS, s), attempts, s, 60, true);
    expect(saveSession.mock.calls[0]?.[0].events).toEqual([
      { kind: 'recognition-round' },
      { kind: 'recognition-best' },
    ]);
  });
});
