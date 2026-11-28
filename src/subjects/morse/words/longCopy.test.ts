import { describe, expect, it, vi } from 'vitest';
import type { SubjectApi } from '../../../core/subject.ts';
import { seededRandom } from '../lesson/build.ts';
import { OPERATORS } from '../qso/onAir.ts';
import {
  answersScore,
  buildLine,
  copyBehind,
  copyScore,
  QUESTIONS,
  reportLong,
  xpForLong,
} from './longCopy.ts';

describe('the Long Copy (#509)', () => {
  it('builds a line of 6 to 12 words from an open operator, with 3 questions of 4 choices', () => {
    const open = OPERATORS.slice(0, 3);
    for (let seed = 1; seed <= 40; seed++) {
      const line = buildLine(open, seededRandom(seed));
      const words = line.text.split(' ');
      expect(words.length).toBeGreaterThanOrEqual(6);
      expect(words.length).toBeLessThanOrEqual(12);
      expect(open.some((o) => words.includes(o.call) && words.includes(o.name))).toBe(true);
      expect(line.questions).toHaveLength(QUESTIONS);
      expect(new Set(line.questions.map((q) => q.ask)).size).toBe(QUESTIONS);
      for (const q of line.questions) {
        expect(words).toContain(q.answer);
        expect(q.wrong).toHaveLength(3);
        expect(new Set([q.answer, ...q.wrong]).size).toBe(4);
      }
    }
  });

  it('copies behind from 28 wpm', () => {
    expect([25, 27, 28, 30].map(copyBehind)).toEqual([false, false, true, true]);
  });

  it('grades the answers: the share of the questions right', () => {
    const qs = [1, 2, 3].map((n) => ({ ask: `q${n}`, answer: `a${n}`, wrong: ['x', 'y', 'z'] }));
    expect(answersScore(qs, ['a1', 'a2', 'a3'])).toBe(1);
    expect(answersScore(qs, ['a1', 'x'])).toBeCloseTo(1 / 3);
    expect(answersScore(qs, [])).toBe(0);
  });

  it('grades the copy on the words, in order, and a skipped word costs only itself', () => {
    const line = 'QN4IL NAME NILS QTH UMEA WX RAIN RIG 50W';
    expect(copyScore(line, 'qn4il  name nils qth umea wx rain rig 50w')).toBe(1);
    expect(copyScore(line, 'QN4IL NAME QTH UMEA WX RAIN RIG 50W')).toBeCloseTo(8 / 9);
    expect(copyScore(line, 'NILS NAME QN4IL')).toBeCloseTo(1 / 9);
    expect(copyScore(line, '')).toBe(0);
  });

  it('charges for extra words, so a spam copy of every candidate scores low', () => {
    const line = 'QN4IL NAME NILS QTH UMEA WX RAIN RIG 50W';
    const spam = `${line} QM2RTA PORTO QV7IVO SPLIT SUNNY SNOW FOG COLD 5W 10W 100W 200W`;
    expect(copyScore(line, spam)).toBeLessThan(0.5);
    expect(copyScore(line, `${line} EXTRA`)).toBeCloseTo(0.9);
  });

  it('ignores punctuation and stray whitespace, and scores nothing for blank copy', () => {
    const line = 'QN4IL NAME NILS QTH UMEA WX RAIN RIG 50W';
    expect(copyScore(line, ' QN4IL, NAME: NILS. QTH UMEA; WX RAIN! RIG 50W?\n')).toBe(1);
    expect(copyScore(line, '   \t\n ')).toBe(0);
    expect(copyScore(line, '?! ,.')).toBe(0);
  });

  it('pays up to 8 XP and saves one head-copy result with the long-copy-round event', async () => {
    expect([0, 0.5, 1].map(xpForLong)).toEqual([0, 4, 8]);
    const saveSession = vi.fn().mockResolvedValue(undefined);
    await reportLong({ saveSession } as unknown as SubjectApi, 2 / 3, 25, 60);
    expect(saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        results: [{ skill: 'head-copy', itemId: 'long-copy:25', score: 2 / 3, itemSeed: 1000 }],
        xp: 5,
        minutes: 1,
        events: [{ kind: 'long-copy-round' }],
      }),
    );
  });
});
