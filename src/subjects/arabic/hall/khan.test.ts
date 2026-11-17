import { describe, expect, it } from 'vitest';
import { NEW_PROGRESS, applyTrial } from '../progress.ts';
import { CHAPTER, questStatus } from '../questline.ts';
import { arabicStanding } from '../ranks.ts';
import { KHAN_STAGE, milestoneSpots, paintKhan, paintMilestones } from './paintKhan.ts';

describe('the painted courtyard (#42)', () => {
  it('paints the same courtyard every time', () => {
    expect(paintKhan()).toEqual(paintKhan());
  });

  it('paints every station and the gate inside the stage', () => {
    const { stations, gate, banner } = paintKhan();
    for (const { svg, box, plaque } of Object.values(stations)) {
      expect(svg).toContain('<path');
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.w).toBeGreaterThan(0);
      expect(box.x + box.w).toBeLessThanOrEqual(KHAN_STAGE.width);
      expect(box.y + box.h).toBeLessThanOrEqual(KHAN_STAGE.height);
      expect(plaque.x).toBeGreaterThan(0);
      expect(plaque.x).toBeLessThan(KHAN_STAGE.width);
    }
    expect(gate.w).toBeGreaterThan(100);
    expect(banner.h).toBeGreaterThan(100);
  });

  it('lays the milestones along the road, the first nearest', () => {
    const spots = milestoneSpots(8);
    expect(spots).toHaveLength(8);
    const [first] = spots;
    const last = spots[7];
    expect(first && last && first.y > last.y && first.h > last.h).toBe(true);
  });

  it('lights the milestones you’ve passed and rings the next one', () => {
    const svg = paintMilestones(3);
    expect(svg.match(/khan__milestone is-lit/g)).toHaveLength(3);
    expect(svg.match(/is-next/g)).toHaveLength(1);
    expect(paintMilestones(8)).not.toContain('is-next');
  });
});

describe('"The Long Road In" (#43)', () => {
  it('has a milestone beat for every script lesson', () => {
    expect(CHAPTER.lessons).toBe(8);
    expect(CHAPTER.milestones).toHaveLength(8);
    expect(CHAPTER.trial.accuracy).toBe(0.9);
  });

  it('lights a milestone per lesson passed, and opens the trial when all are', () => {
    const start = questStatus(NEW_PROGRESS);
    expect(start.lit).toBe(0);
    expect(start.beat).toBeUndefined();
    expect(start.trialReady).toBe(false);
    const mid = questStatus({ ...NEW_PROGRESS, lesson: 4 });
    expect(mid.lit).toBe(3);
    expect(mid.beat).toBe(CHAPTER.milestones[2]);
    const done = questStatus({ ...NEW_PROGRESS, lesson: 8, done: true });
    expect(done.lit).toBe(8);
    expect(done.trialReady).toBe(true);
    expect(questStatus({ ...NEW_PROGRESS, done: true, guest: true }).trialReady).toBe(false);
  });

  it('makes you a guest at 90% on the Painted Sign, once', () => {
    const ready = { ...NEW_PROGRESS, lesson: 8, done: true };
    expect(applyTrial(ready, 0.85, 0.9)).toMatchObject({ passed: false, next: { guest: false } });
    const won = applyTrial(ready, 0.9, 0.9);
    expect(won).toMatchObject({ passed: true, next: { guest: true, sessions: 1 } });
    expect(applyTrial(won.next, 1, 0.9).passed).toBe(false);
    expect(arabicStanding(ready).rank.name).toBe('Stranger');
    expect(arabicStanding(won.next).rank).toMatchObject({ arabic: 'ضيف', name: 'Guest' });
  });
});
