import { describe, expect, it } from 'vitest';
import {
  afterIdle,
  chanceOfSuccess,
  GLICKO_DEFAULTS,
  newGlicko,
  rateAnswer,
  ratePeriod,
} from './glicko2.ts';

describe('Glicko-2', () => {
  it("matches the worked example in Glickman's paper", () => {
    // http://www.glicko.net/glicko/glicko2.pdf: a 1500 / 200 / 0.06 player beats a 1400 / 30
    // player and loses to 1550 / 100 and 1700 / 300, with τ = 0.5.
    const after = ratePeriod({ rating: 1500, rd: 200, volatility: 0.06 }, [
      { opponent: { rating: 1400, rd: 30, volatility: 0.06 }, score: 1 },
      { opponent: { rating: 1550, rd: 100, volatility: 0.06 }, score: 0 },
      { opponent: { rating: 1700, rd: 300, volatility: 0.06 }, score: 0 },
    ]);
    // The paper rounds μ' to -0.2069 before converting back (1464.06); unrounded it is 1464.05.
    expect(after.rating).toBeCloseTo(1464.06, 1);
    expect(after.rd).toBeCloseTo(151.52, 2);
    expect(after.volatility).toBeCloseTo(0.05999, 4); // the paper gives 0.05999; unrounded 0.059996;
  });

  it('only grows the deviation in a period without games', () => {
    const before = { rating: 1500, rd: 200, volatility: 0.06 };
    const after = ratePeriod(before, []);
    expect(after.rating).toBe(1500);
    expect(after.rd).toBeCloseTo(Math.hypot(200, 0.06 * 173.7178), 6);
    expect(ratePeriod({ ...before, rd: 350 }, []).rd).toBe(350);
  });

  it('grows the deviation over idle days, up to 350', () => {
    const settled = { rating: 1200, rd: 60, volatility: 0.06 };
    expect(afterIdle(settled, 0)).toEqual(settled);
    const month = afterIdle(settled, 30);
    expect(month.rating).toBe(1200);
    expect(month.rd).toBeCloseTo(Math.hypot(60, Math.sqrt(30) * 0.06 * 173.7178), 6);
    expect(afterIdle(settled, 100_000).rd).toBeCloseTo(350, 9);
  });

  it('starts at 1000 with full uncertainty', () => {
    expect(newGlicko()).toEqual({ rating: 1000, rd: 350, volatility: 0.06 });
    expect(newGlicko(1300).rating).toBe(1300);
    expect(GLICKO_DEFAULTS.tau).toBe(0.5);
  });

  it('rates an answer for both sides: a right answer lifts the learner and lowers the item', () => {
    const { learner, item } = rateAnswer(newGlicko(), newGlicko(), 1);
    expect(learner.rating).toBeGreaterThan(1000);
    expect(item.rating).toBeLessThan(1000);
    expect(learner.rating - 1000).toBeCloseTo(1000 - item.rating, 6); // equal and opposite
    expect(learner.rd).toBeLessThan(350);
    const wrong = rateAnswer(newGlicko(), newGlicko(), 0);
    expect(wrong.learner.rating).toBeLessThan(1000);
    const half = rateAnswer(newGlicko(), newGlicko(), 0.5);
    expect(half.learner.rating).toBeCloseTo(1000, 6);
  });

  it('moves a settled rating less than a new one', () => {
    const settled = { rating: 1000, rd: 60, volatility: 0.06 };
    const fresh = rateAnswer(newGlicko(), settled, 1).learner.rating - 1000;
    const known = rateAnswer(settled, settled, 1).learner.rating - 1000;
    expect(known).toBeLessThan(fresh / 5);
  });

  it('estimates the chance of a right answer', () => {
    const even = chanceOfSuccess(newGlicko(), newGlicko());
    expect(even).toBeCloseTo(0.5, 9);
    const strong = { rating: 1400, rd: 50, volatility: 0.06 };
    const easy = { rating: 1000, rd: 50, volatility: 0.06 };
    expect(chanceOfSuccess(strong, easy)).toBeGreaterThan(0.85);
    expect(chanceOfSuccess(easy, strong)).toBeLessThan(0.15);
  });

  it('refuses scores outside 0 to 1', () => {
    expect(() => rateAnswer(newGlicko(), newGlicko(), 1.5)).toThrow(RangeError);
    expect(() => rateAnswer(newGlicko(), newGlicko(), Number.NaN)).toThrow(RangeError);
  });
});
