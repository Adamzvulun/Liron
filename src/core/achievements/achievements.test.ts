import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, earnedTitles, plaques } from './achievements.ts';

describe('achievements (#177)', () => {
  it('reads every achievement from content, in order, each with a target', () => {
    expect(ACHIEVEMENTS).toHaveLength(17);
    expect(ACHIEVEMENTS[0]).toMatchObject({ id: 'first-light', name: 'First Light', gems: 1 });
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) expect(a.condition.n).toBeGreaterThan(0);
    // Every title is someone's to earn, once.
    const titles = ACHIEVEMENTS.flatMap((a) => (a.title ? [a.title] : []));
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('joins the player’s progress, and lists only the titles earned', () => {
    const mine = {
      title: '',
      gems: 3,
      achievements: [
        { id: 'chest-hunter', progress: 4, target: 10, earnedAt: null },
        { id: 'overspeed', progress: 1, target: 1, earnedAt: '2026-11-10T08:00:00Z' },
        { id: 'first-light', progress: 1, target: 1, earnedAt: '2026-11-09T08:00:00Z' },
      ],
    };
    const p = plaques(mine);
    expect(p.find((a) => a.id === 'chest-hunter')).toMatchObject({
      progress: 4,
      target: 10,
      earned: false,
    });
    expect(p.find((a) => a.id === 'long-burn')).toMatchObject({ progress: 0, target: 30 });
    expect(earnedTitles(mine)).toEqual(['the Quick-Eared']);
    expect(plaques(null).every((a) => !a.earned)).toBe(true);
  });
});
