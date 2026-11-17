import { describe, expect, it } from 'vitest';
import { schedule } from '../timing.ts';
import { buildRun, GROUP_SIZE, RUN_SECONDS, seededRandom } from './build.ts';
import { nextEffectiveWpm, passesGate, scoreCopy, SKIP } from './score.ts';

const split = (s: string) => s.split('');

describe('scoreCopy', () => {
  it('scores a perfect copy', () => {
    const s = scoreCopy(split('KMKMM'), split('KMKMM'));
    expect(s.accuracy).toBe(1);
    expect(s.byChar.get('M')).toEqual({ right: 3, played: 3 });
  });

  it('counts a missed character once, without shifting the rest', () => {
    const s = scoreCopy(split('KMUKM'), split('KMKM'));
    expect(s.results.map((r) => r.right)).toEqual([true, true, false, true, true]);
    expect(s.accuracy).toBeCloseTo(0.8);
  });

  it('ignores an extra character', () => {
    const s = scoreCopy(split('KMK'), split('KMMK'));
    expect(s.right).toBe(3);
    expect(s.extra).toBe(1);
    expect(s.accuracy).toBeCloseTo(3 / 4);
  });

  it("can't be passed by mashing keys (extra characters count as errors)", () => {
    const played = Array.from({ length: 100 }, (_, i) => ((i * 7) % 3 === 0 ? 'K' : 'M'));
    const mashed = Array.from({ length: 200 }, (_, i) => (i % 2 ? 'M' : 'K'));
    const s = scoreCopy(played, mashed);
    expect(s.right).toBe(100);
    expect(s.accuracy).toBeLessThanOrEqual(0.5);
  });

  it('counts extra characters at the start too', () => {
    const s = scoreCopy(split('KM'), split('MMKM'));
    expect(s.extra).toBe(2);
    expect(s.accuracy).toBeCloseTo(0.5);
  });

  it('marks a skip and a wrong letter as misses', () => {
    const s = scoreCopy(split('KMK'), ['K', SKIP, 'M']);
    expect(s.results).toEqual([
      { char: 'K', copied: 'K', right: true },
      { char: 'M', copied: SKIP, right: false },
      { char: 'K', copied: 'M', right: false },
    ]);
  });

  it('a skip on a played "?" is a miss, and a copied "?" is right (review, 2026-11-15)', () => {
    expect(scoreCopy(['K', '?'], ['K', SKIP]).results[1]).toMatchObject({ right: false });
    expect(scoreCopy(['K', '?'], ['K', '?']).results[1]).toMatchObject({ right: true });
  });

  it('handles nothing copied', () => {
    expect(scoreCopy(split('KM'), []).accuracy).toBe(0);
    expect(scoreCopy([], []).accuracy).toBe(0);
  });
});

describe('the Koch gate and speed steps', () => {
  it('needs two runs in a row at 90% or better', () => {
    expect(passesGate([0.95])).toBe(false);
    expect(passesGate([0.92, 0.9])).toBe(true);
    expect(passesGate([0.95, 0.89])).toBe(false);
    expect(passesGate([0.5, 0.91, 0.93])).toBe(true);
  });

  it('moves the effective speed by 1 wpm within 6 and the character speed', () => {
    expect(nextEffectiveWpm(10, 0.96, 20)).toBe(11);
    expect(nextEffectiveWpm(10, 0.9, 20)).toBe(10);
    expect(nextEffectiveWpm(10, 0.8, 20)).toBe(9);
    expect(nextEffectiveWpm(6, 0.5, 20)).toBe(6);
    expect(nextEffectiveWpm(20, 1, 20)).toBe(20);
  });
});

describe('buildRun', () => {
  const speed = { charWpm: 20, effWpm: 10 };

  it('fills about two minutes with groups of 5 from the unlocked characters', () => {
    const run = buildRun(['K', 'M'], speed, { random: seededRandom(1) });
    expect(run.groups.every((g) => g.length === GROUP_SIZE && /^[KM]+$/.test(g))).toBe(true);
    const seconds = schedule(run.groups.join(' '), speed).duration;
    expect(seconds).toBeGreaterThanOrEqual(RUN_SECONDS);
    expect(seconds).toBeLessThan(RUN_SECONDS + 10);
    expect(run.chars).toHaveLength(run.groups.length * GROUP_SIZE);
  });

  it('gives the new character about a quarter of the run', () => {
    const run = buildRun(['K', 'M', 'U', 'R', 'E'], speed, {
      random: seededRandom(7),
      newChar: 'E',
      seconds: 1200,
    });
    const share = run.chars.filter((c) => c === 'E').length / run.chars.length;
    expect(share).toBeGreaterThan(0.2);
    expect(share).toBeLessThan(0.3);
  });

  it('repeats exactly with the same seed', () => {
    const a = buildRun(['K', 'M'], speed, { random: seededRandom(3) });
    const b = buildRun(['K', 'M'], speed, { random: seededRandom(3) });
    expect(a).toEqual(b);
  });
});
