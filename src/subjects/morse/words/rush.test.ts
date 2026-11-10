import { describe, expect, it, vi } from 'vitest';
import type { SubjectApi } from '../../../core/subject.ts';
import { MORSE_CHARS } from '../code.ts';
import { seededRandom } from '../lesson/build.ts';
import { NEW_PROGRESS } from '../lesson/progress.ts';
import {
  applyRush,
  makeCallsign,
  nextWpm,
  reportRush,
  rushOpen,
  summarizeRush,
  xpForRush,
  type RushCall,
} from './rush.ts';

const KOCH = MORSE_CHARS.map((c) => c.char);
const CALLSIGN = /^([A-Z]{1,2}|[0-9][A-Z])[0-9][A-Z]{1,3}$/;

describe('the callsign rush (#156)', () => {
  it('opens with the first digit', () => {
    expect(rushOpen(KOCH.slice(0, 23))).toBe(false);
    expect(KOCH[23]).toBe('5');
    expect(rushOpen(KOCH.slice(0, 24))).toBe(true);
  });

  it('makes real-shaped callsigns from unlocked characters only', () => {
    const unlocked = KOCH.slice(0, 24);
    const random = seededRandom(5);
    for (let i = 0; i < 300; i++) {
      const call = makeCallsign(unlocked, random);
      expect(call).toMatch(CALLSIGN);
      for (const c of call) expect(unlocked).toContain(c);
    }
    expect(() => makeCallsign(['K', 'M'])).toThrow();
  });

  it('speeds up on a right copy and slows on a miss, within bounds', () => {
    expect(nextWpm(20, true)).toBe(22);
    expect(nextWpm(20, false)).toBe(18);
    expect(nextWpm(15, false)).toBe(15);
    expect(nextWpm(50, true)).toBe(50);
  });

  const calls: RushCall[] = [
    { call: 'K5AT', wpm: 20, typed: 'k5at' },
    { call: 'MI5RK', wpm: 22, typed: 'MI5RK' },
    { call: 'W5X', wpm: 24, typed: 'W5' },
  ];

  it('scores the speeds of the calls copied right', () => {
    const s = summarizeRush(calls);
    expect(s).toEqual({ score: 42, right: 2, topWpm: 22 });
    expect(xpForRush(s)).toBe(2);
    const next = applyRush({ ...NEW_PROGRESS, rush: { runs: 1, best: 50, topWpm: 30 } }, s);
    expect(next.rush).toEqual({ runs: 2, best: 50, topWpm: 30 });
  });

  it('reports the round, a new best, and calls above your speed', async () => {
    const saveSession = vi.fn().mockResolvedValue(undefined);
    const api = { saveSession } as unknown as SubjectApi;
    await reportRush(api, NEW_PROGRESS, calls, 40, 20, 60);
    const report = saveSession.mock.calls[0]?.[0];
    expect(report.events).toEqual([
      { kind: 'rush-round' },
      { kind: 'rush-best' },
      { kind: 'rush-fast', count: 1 },
    ]);
    expect(report.minutes).toBe(1);
    expect(report.results).toBeUndefined();
  });

  it('sends rush-30 for a call copied at 30 wpm or faster (Overspeed, #177)', async () => {
    const saveSession = vi.fn().mockResolvedValue(undefined);
    const api = { saveSession } as unknown as SubjectApi;
    const fast: RushCall[] = [
      { call: 'K5AT', wpm: 30, typed: 'K5AT' },
      { call: 'W5X', wpm: 32, typed: 'W5' },
    ];
    await reportRush(api, NEW_PROGRESS, fast, 100, 40, 60);
    expect(saveSession.mock.calls[0]?.[0].events).toEqual([
      { kind: 'rush-round' },
      { kind: 'rush-30' },
    ]);
    // 28 wpm is not enough.
    await reportRush(api, NEW_PROGRESS, [{ call: 'K5AT', wpm: 28, typed: 'K5AT' }], 100, 40, 60);
    expect(saveSession.mock.calls[1]?.[0].events).toEqual([{ kind: 'rush-round' }]);
  });
});
