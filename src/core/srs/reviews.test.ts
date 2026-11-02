import { describe, expect, it } from 'vitest';
import { memoryStore } from '../progress/store.ts';
import { subjectApi } from '../progress/subjectApi.ts';

const t0 = new Date('2026-11-02T09:00:00Z');
const later = (min: number) => new Date(t0.getTime() + min * 60_000);

describe('reviews through the subject contract', () => {
  it('records reviews, logs them, and queues due items most overdue first', async () => {
    const store = memoryStore();
    const morse = subjectApi({ id: 'morse' }, store);
    const k = await morse.recordReview('char:K', 'again', t0); // back in about a minute
    const m = await morse.recordReview('char:M', 'good', t0); // back in about 10 minutes
    await morse.recordReview('char:R', 'easy', t0); // back in days
    expect(k).toMatchObject({ phase: 'learning', reps: 1, lapses: 0 });
    expect(k.due.getTime()).toBeLessThan(m.due.getTime());

    expect(await morse.dueItems({ now: t0 })).toEqual([]);
    expect((await morse.dueItems({ now: later(30) })).map((d) => d.itemId)).toEqual([
      'char:K',
      'char:M',
    ]);
    expect(await morse.dueItems({ now: later(30), limit: 1 })).toHaveLength(1);
    expect(store.reviewLog).toHaveLength(3);
  });

  it('keeps each subject’s items apart', async () => {
    const store = memoryStore();
    const morse = subjectApi({ id: 'morse' }, store);
    const arabic = subjectApi({ id: 'arabic' }, store);
    await morse.recordReview('k', 'again', t0);
    expect(await arabic.dueItems({ now: later(60) })).toEqual([]);
    expect(await arabic.reviewStatus(['k'])).toEqual(new Map());
    expect((await morse.reviewStatus(['k', 'never-seen'])).has('k')).toBe(true);
  });

  it('builds on the stored card: a lapse after learning counts', async () => {
    const api = subjectApi({ id: 'morse' }, memoryStore());
    let s = await api.recordReview('k', 'easy', t0);
    s = await api.recordReview('k', 'good', s.due);
    s = await api.recordReview('k', 'again', s.due);
    expect(s).toMatchObject({ phase: 'relearning', reps: 3, lapses: 1 });
  });

  it('checks item ids and limits', async () => {
    const api = subjectApi({ id: 'morse' }, memoryStore());
    await expect(api.recordReview('', 'good')).rejects.toThrow(RangeError);
    await expect(api.recordReview('x'.repeat(129), 'good')).rejects.toThrow(RangeError);
    await expect(api.dueItems({ limit: 0 })).rejects.toThrow(RangeError);
  });
});
