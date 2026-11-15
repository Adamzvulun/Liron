import { describe, expect, it } from 'vitest';
import { gradeFrom, phaseOf, scheduleReview } from './scheduler.ts';

const t0 = new Date('2026-11-02T09:00:00Z');
const minutes = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 60_000;
const days = (a: Date, b: Date) => minutes(a, b) / 1440;

describe('scheduleReview', () => {
  it('a new item answered "again" comes back within minutes, "easy" after days', () => {
    const again = scheduleReview(null, 'again', t0);
    expect(again.phase).toBe('learning');
    expect(minutes(t0, again.due)).toBeLessThanOrEqual(10);

    const easy = scheduleReview(null, 'easy', t0);
    expect(easy.phase).toBe('review');
    expect(days(t0, easy.due)).toBeGreaterThanOrEqual(1);
  });

  it('intervals grow as the learner keeps getting it right', () => {
    let stored: Record<string, unknown> | null = null;
    let now = t0;
    const gaps: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = scheduleReview(stored, 'good', now);
      gaps.push(days(now, r.due));
      stored = r.card;
      now = r.due;
    }
    expect(stored && phaseOf(stored)).toBe('review');
    const reviewGaps = gaps.filter((g) => g >= 1);
    expect(reviewGaps.length).toBeGreaterThanOrEqual(3);
    reviewGaps.slice(1).forEach((gap, i) => expect(gap).toBeGreaterThan(reviewGaps[i] ?? 0));
  });

  it('forgetting a well-known item sends it back to relearning, due soon', () => {
    let r = scheduleReview(null, 'easy', t0);
    r = scheduleReview(r.card, 'good', r.due);
    const lapse = scheduleReview(r.card, 'again', r.due);
    expect(lapse.phase).toBe('relearning');
    expect(minutes(r.due, lapse.due)).toBeLessThanOrEqual(10);
    expect(lapse.card.lapses).toBe(1);
  });

  it('is deterministic, and the stored card is plain JSON that round-trips', () => {
    const a = scheduleReview(null, 'good', t0);
    const b = scheduleReview(JSON.parse(JSON.stringify(a.card)), 'good', a.due);
    const c = scheduleReview(a.card, 'good', a.due);
    expect(b).toEqual(c);
    expect(typeof a.card.due).toBe('string');
    expect(a.log).toMatchObject({ rating: 3 });
  });

  it('starts a stored card FSRS can’t read over as new, rather than failing (review, 2026-11-15)', () => {
    const fresh = scheduleReview(null, 'good', t0);
    const broken = { due: t0.toISOString(), stability: null, reps: 3 };
    expect(scheduleReview(broken, 'good', t0).due).toEqual(fresh.due);
  });

  it('rejects unknown grades', () => {
    expect(() => scheduleReview(null, 'perfect' as never, t0)).toThrow(RangeError);
  });
});

describe('gradeFrom: a session’s answers for one item', () => {
  it('is good when all were right, hard from half, again below that', () => {
    expect(gradeFrom(5, 5)).toBe('good');
    expect(gradeFrom(4, 5)).toBe('hard');
    expect(gradeFrom(1, 2)).toBe('hard');
    expect(gradeFrom(2, 5)).toBe('again');
    expect(gradeFrom(0, 3)).toBe('again');
    expect(gradeFrom(1, 1)).toBe('good');
    expect(gradeFrom(0, 1)).toBe('again');
  });

  it('is again when nothing was asked', () => {
    expect(gradeFrom(0, 0)).toBe('again');
  });
});
