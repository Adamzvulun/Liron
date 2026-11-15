import { describe, expect, it, vi } from 'vitest';
import type { SubjectApi } from '../../../core/subject.ts';
import { NEW_PROGRESS } from '../lesson/progress.ts';
import { scoreCopy } from '../lesson/score.ts';
import { MORSE_CHARS } from '../code.ts';
import {
  applyDrill,
  drillText,
  GROUP,
  GROUPS,
  keyableWords,
  reportDrill,
  WORD_DRILL,
  wordDrillText,
} from './drill.ts';

const first = (n: number) => MORSE_CHARS.slice(0, n).map((c) => c.char);
// A fixed sequence, so a drill comes out the same every time.
const seq = () => {
  let i = 0;
  return () => (((i++ * 0.37) % 1) + 1) % 1;
};

describe('keying words at the telegraph table', () => {
  it('only offers common words made of the letters you have learned', () => {
    const letters = first(8);
    const words = keyableWords(letters);
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      expect(w.length).toBeGreaterThanOrEqual(2);
      expect(w.length).toBeLessThanOrEqual(5);
      expect([...w].every((c) => letters.includes(c))).toBe(true);
    }
  });

  it('waits until enough words can be keyed', () => {
    expect(keyableWords(first(2))).toEqual([]);
    expect(wordDrillText(first(2))).toBeNull();
  });

  it('draws different words, as many as a drill holds', () => {
    const text = wordDrillText(first(MORSE_CHARS.length), seq());
    const words = text?.split(' ') ?? [];
    expect(words).toHaveLength(WORD_DRILL);
    expect(new Set(words).size).toBe(WORD_DRILL);
  });
});

describe('a letter drill', () => {
  it('keys groups of your letters, never one letter three times running', () => {
    for (let seed = 0; seed < 200; seed++) {
      let x = seed + 1;
      const random = () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;
      const text = drillText(['K', 'M', 'U'], random);
      const groups = text.split(' ');
      expect(groups).toHaveLength(GROUPS);
      for (const g of groups) {
        expect(g).toMatch(new RegExp(`^[KMU]{${GROUP}}$`));
        expect(g).not.toMatch(/(.)\1\1/);
      }
    }
  });

  it('still fills its groups with only one letter learned', () => {
    expect(drillText(['K'], () => 0)).toBe('KKK KKK KKK KKK KKK');
  });

  it('saves the speed, a rating per letter, XP, minutes and the 80% event', async () => {
    const saveSession = vi.fn().mockResolvedValue(undefined);
    const api = { saveSession } as unknown as SubjectApi;
    const at = new Date(2026, 10, 14);
    const next = applyDrill(NEW_PROGRESS, 79.6);
    expect(next.sending).toEqual({
      drills: NEW_PROGRESS.sending.drills + 1,
      ditMs: 80,
      fastest: 80,
    });
    // The fastest dit stays when a slower drill follows (the ranks read it, review 2026-11-15).
    expect(applyDrill(next, 100).sending).toEqual({ drills: 2, ditMs: 100, fastest: 80 });
    expect(applyDrill(applyDrill(next, 100), 60).sending.fastest).toBe(60);
    // Progress from before the fastest dit was kept starts from its last one.
    const old = { ...NEW_PROGRESS, sending: { drills: 5, ditMs: 70 } };
    expect(applyDrill(old, 90).sending.fastest).toBe(70);

    await reportDrill(api, next, scoreCopy([...'KMKMK'], [...'KMKMK']), 90, at);
    await reportDrill(api, next, scoreCopy([...'KMKMK'], [...'KUUUK']), 30, at);
    const [clean, rough] = saveSession.mock.calls.map(([report]) => report);
    expect(clean).toMatchObject({ state: next, minutes: 1.5, xp: 3, at });
    expect(clean.events).toEqual([{ kind: 'drill' }, { kind: 'drill-80' }]);
    expect(clean.results).toEqual(
      expect.arrayContaining([
        { skill: 'send', itemId: 'char:K', score: 1 },
        { skill: 'send', itemId: 'char:M', score: 1 },
      ]),
    );
    expect(rough.events).toEqual([{ kind: 'drill' }]);
    expect(rough.results).toContainEqual({ skill: 'send', itemId: 'char:M', score: 0 });
  });
});
