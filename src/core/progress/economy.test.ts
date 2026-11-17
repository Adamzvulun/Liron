import { describe, expect, it } from 'vitest';
import {
  addDays,
  dailyChest,
  levelForXp,
  levelProgress,
  rewardsFor,
  streakFrom,
  titleForLevel,
  xpForLevel,
} from './economy.ts';

describe('level curve', () => {
  it('is fast early: level 2 at 20 XP, 5 at 140, 10 at 540, 20 at 2,090', () => {
    expect([1, 2, 3, 5, 10, 20, 50, 100].map(xpForLevel)).toEqual([
      0, 20, 50, 140, 540, 2090, 12740, 50490,
    ]);
  });

  it('each level costs 10 XP more than the one before', () => {
    for (let l = 1; l < 200; l++) {
      expect(xpForLevel(l + 1) - xpForLevel(l)).toBe(10 * l + 10);
    }
  });

  it('levelForXp is the inverse at every boundary', () => {
    for (let l = 1; l < 500; l++) {
      expect(levelForXp(xpForLevel(l))).toBe(l);
      expect(levelForXp(xpForLevel(l + 1) - 1)).toBe(l);
    }
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(-5)).toBe(1);
  });

  it('gives the XP bar its numbers', () => {
    expect(levelProgress(0)).toEqual({ level: 1, into: 0, needed: 20 });
    expect(levelProgress(65)).toEqual({ level: 3, into: 15, needed: 40 });
  });
});

describe('rewards', () => {
  it('pays 1 gold per 5 XP, counted on the total so nothing is lost to rounding', () => {
    expect(rewardsFor(20, 23)).toEqual({ gold: 0, gems: 0 });
    expect(rewardsFor(23, 26)).toEqual({ gold: 1, gems: 0 });
  });

  it('pays 5 x level in gold for each level reached, and a gem at every 5th level', () => {
    // 0 -> 20 XP: level 2. 4 gold from XP + 10 for level 2.
    expect(rewardsFor(0, 20)).toEqual({ gold: 14, gems: 0 });
    // 0 -> 140 XP: levels 2-5. 28 gold from XP + 5 x (2+3+4+5) = 70, and a gem for level 5.
    expect(rewardsFor(0, 140)).toEqual({ gold: 98, gems: 1 });
    expect(rewardsFor(0, xpForLevel(10))).toEqual({ gold: 108 + 5 * 54, gems: 2 });
  });

  it('a typical 15-minute day (about 150 XP) reaches level 5 on day one', () => {
    expect(levelForXp(150)).toBe(5);
    expect(levelForXp(4 * 150)).toBe(10);
  });
});

describe('titles', () => {
  it('follow the lore: Wanderer, Adventurer, Pathfinder, Veteran, Champion, Legend', () => {
    expect([1, 4, 5, 10, 20, 35, 50, 99].map(titleForLevel)).toEqual([
      'Wanderer',
      'Wanderer',
      'Adventurer',
      'Pathfinder',
      'Veteran',
      'Champion',
      'Legend',
      'Legend',
    ]);
  });
});

describe('streak and daily chest', () => {
  it('counts goal days back from today, or from yesterday while today is open', () => {
    const days = ['2026-10-30', '2026-10-31', '2026-11-01'];
    expect(streakFrom(days, '2026-11-01')).toBe(3);
    expect(streakFrom(days, '2026-11-02')).toBe(3); // today not reached yet: still alive
    expect(streakFrom([...days, '2026-11-02'], '2026-11-02')).toBe(4);
    expect(streakFrom(days, '2026-11-03')).toBe(0); // missed yesterday: reset
    expect(streakFrom(['2026-10-28', '2026-10-30', '2026-10-31'], '2026-10-31')).toBe(2);
    expect(streakFrom([], '2026-11-02')).toBe(0);
  });

  it('a shielded day keeps the streak alive but adds nothing (ADR 0034)', () => {
    const goals = ['2026-11-01', '2026-11-02', '2026-11-04'];
    expect(streakFrom(goals, '2026-11-04')).toBe(1);
    expect(streakFrom(goals, '2026-11-04', ['2026-11-03'])).toBe(3);
    expect(streakFrom(goals, '2026-11-05', ['2026-11-03'])).toBe(3);
    expect(streakFrom(goals.slice(0, 2), '2026-11-04', ['2026-11-03'])).toBe(2);
  });

  it('crosses months and years', () => {
    expect(streakFrom(['2025-12-31', '2026-01-01'], '2026-01-01')).toBe(2);
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('pays 20 gold, and a gem on every 7th streak day', () => {
    expect(dailyChest(1)).toEqual({ gold: 20, gems: 0 });
    expect(dailyChest(7)).toEqual({ gold: 20, gems: 1 });
    expect(dailyChest(13)).toEqual({ gold: 20, gems: 0 });
    expect(dailyChest(14)).toEqual({ gold: 20, gems: 1 });
  });
});
