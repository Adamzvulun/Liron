import { describe, expect, it } from 'vitest';
import { seededRandom } from '../lesson/build.ts';
import { pickNext, pointsFor, ratingScore, summarize, type Attempt } from './game.ts';

const at = (char: string, pressed: string, ms: number): Attempt => ({
  char,
  pressed,
  right: char === pressed,
  ms,
});

describe('Instant Recognition rules', () => {
  it('pays 10 for a right answer plus up to 30 for speed', () => {
    expect(pointsFor(at('K', 'K', 0))).toBe(40);
    expect(pointsFor(at('K', 'K', 1500))).toBe(25);
    expect(pointsFor(at('K', 'K', 3000))).toBe(10);
    expect(pointsFor(at('K', 'M', 100))).toBe(0);
  });

  it('rates right-and-fast near 1, slow lower, wrong 0', () => {
    expect(ratingScore(at('K', 'K', 0))).toBe(1);
    expect(ratingScore(at('K', 'K', 3000))).toBe(0.5);
    expect(ratingScore(at('K', '', 3000))).toBe(0);
  });

  it('picks slow characters more often', () => {
    const random = seededRandom(5);
    const avg = new Map([
      ['K', 200],
      ['M', 2000],
    ]);
    const picks = Array.from({ length: 2000 }, () => pickNext(['K', 'M'], avg, [], random));
    const m = picks.filter((c) => c === 'M').length / picks.length;
    expect(m).toBeGreaterThan(0.75);
  });

  it('never picks the same character three times running', () => {
    const random = seededRandom(9);
    for (let i = 0; i < 50; i++) {
      expect(pickNext(['K', 'M', 'U'], new Map(), ['K', 'K'], random)).not.toBe('K');
    }
  });

  it('summarizes a round', () => {
    const s = summarize([
      at('K', 'K', 400),
      at('K', 'K', 800),
      at('M', 'K', 300),
      at('M', '', 3000),
    ]);
    expect(s.right).toBe(2);
    expect(s.answered).toBe(4);
    expect(s.avgMs).toBe(600);
    expect(s.points).toBe(pointsFor(at('K', 'K', 400)) + pointsFor(at('K', 'K', 800)));
    expect(s.byChar.get('K')).toEqual({ avgMs: 600, right: 2, tries: 2 });
    expect(s.byChar.get('M')).toEqual({ avgMs: 0, right: 0, tries: 2 });
  });
});
