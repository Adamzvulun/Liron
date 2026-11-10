import { describe, expect, it, vi } from 'vitest';
import type { SubjectApi } from '../../../core/subject.ts';
import { NEW_PROGRESS } from '../lesson/progress.ts';
import { MORSE_CHARS } from '../code.ts';
import type { WordAttempt } from './drill.ts';
import {
  applyWatch,
  reportWatch,
  WATCH_POOL,
  WATCH_WORDS,
  watchOpen,
  watchResult,
  watchWords,
} from './nightWatch.ts';

const attempts = (right: number, total = WATCH_WORDS): WordAttempt[] =>
  watchWords(() => 0.5, total).map((word, i) => ({
    word,
    typed: i < right ? word.text : 'X',
    again: false,
  }));

describe('the Night Watch (#179)', () => {
  it('draws 20 different words from the 100 commonest', () => {
    const words = watchWords(() => 0.37);
    expect(words).toHaveLength(WATCH_WORDS);
    expect(new Set(words.map((w) => w.id)).size).toBe(WATCH_WORDS);
    expect(words.every((w) => WATCH_POOL.includes(w) && w.kind === 'word')).toBe(true);
    expect(WATCH_POOL.length).toBeGreaterThanOrEqual(WATCH_WORDS);
  });

  it('passes with 18 of 20 copied right, and the same share of a short test watch', () => {
    expect(watchResult(attempts(18))).toEqual({ right: 18, total: 20, passed: true });
    expect(watchResult(attempts(17))).toMatchObject({ passed: false });
    expect(watchResult(attempts(3, 3))).toMatchObject({ passed: true });
    expect(watchResult(attempts(2, 3))).toMatchObject({ passed: false });
    expect(watchResult([])).toMatchObject({ passed: false });
  });

  it('opens once every character is learned', () => {
    expect(watchOpen(NEW_PROGRESS, MORSE_CHARS.length)).toBe(false);
    expect(watchOpen({ ...NEW_PROGRESS, unlocked: MORSE_CHARS.length }, MORSE_CHARS.length)).toBe(
      true,
    );
  });

  it('saves a first pass with its event and 60 XP; later watches earn 10', async () => {
    const saveSession = vi.fn<SubjectApi['saveSession']>().mockResolvedValue(undefined);
    const api = { saveSession } as unknown as SubjectApi;
    const pass = watchResult(attempts(20));
    const next = applyWatch(NEW_PROGRESS, pass);
    expect(next.rankTrials).toEqual(['night-watch']);
    await reportWatch(api, NEW_PROGRESS, next, pass, 120);
    expect(saveSession.mock.calls[0]?.[0]).toMatchObject({
      xp: 60,
      minutes: 2,
      events: [{ kind: 'trial-night-watch' }],
    });
    await reportWatch(api, next, applyWatch(next, pass), pass, 60);
    expect(saveSession.mock.calls[1]?.[0]).toMatchObject({ xp: 10, events: [] });
    expect(applyWatch(next, pass).rankTrials).toEqual(['night-watch']);
  });
});
