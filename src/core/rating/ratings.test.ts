import { describe, expect, it } from 'vitest';
import { memoryStore } from '../progress/store.ts';
import { subjectApi } from '../progress/subjectApi.ts';
import { asOf, PROVISIONAL_GAMES, rateResult } from './ratings.ts';

const t0 = new Date('2026-11-03T09:00:00Z');
const MORSE = { id: 'morse', skills: ['receive', 'send', 'head-copy'] } as const;

describe('skill ratings through the subject contract', () => {
  it('starts both sides at 1000 and moves them apart on a right answer', async () => {
    const morse = subjectApi(MORSE, memoryStore());
    const { learner, item } = await morse.recordResult('receive', 'char:K', 1, { at: t0 });
    expect(learner.rating).toBeGreaterThan(1000);
    expect(item.rating).toBeLessThan(1000);
    expect(learner).toMatchObject({ games: 1, provisional: true });
    expect(learner.rd).toBeLessThan(350);
  });

  it('keeps skills, items and subjects apart', async () => {
    const store = memoryStore();
    const morse = subjectApi(MORSE, store);
    const arabic = subjectApi({ id: 'arabic' }, store);
    await morse.recordResult('receive', 'char:K', 1, { at: t0 });
    await morse.recordResult('send', 'char:K', 0, { at: t0 });
    const skills = await morse.skillRatings();
    expect([...skills.keys()].sort()).toEqual(['receive', 'send']);
    expect(skills.get('receive')?.rating ?? 0).toBeGreaterThan(skills.get('send')?.rating ?? 0);
    const items = await morse.itemRatings('receive', ['char:K', 'char:M']);
    expect([...items.keys()]).toEqual(['char:K']);
    expect(await arabic.skillRatings()).toEqual(new Map());
    expect(store.ratingLog).toHaveLength(2);
  });

  it('converges towards a learner who gets most answers right', async () => {
    const morse = subjectApi(MORSE, memoryStore());
    let last = { rating: 0, rd: 0, games: 0, provisional: true };
    for (let n = 0; n < PROVISIONAL_GAMES; n++) {
      const at = new Date(t0.getTime() + n * 10_000);
      ({ learner: last } = await morse.recordResult('receive', `char:${n % 8}`, n % 5 ? 1 : 0, {
        at,
      }));
    }
    expect(last.games).toBe(PROVISIONAL_GAMES);
    expect(last.provisional).toBe(false);
    expect(last.rating).toBeGreaterThan(1100);
    expect(last.rd).toBeLessThan(130);
  });

  it('starts a new item at its seed', async () => {
    const morse = subjectApi(MORSE, memoryStore());
    const { item } = await morse.recordResult('receive', 'char:Q', 0, { at: t0, itemSeed: 1400 });
    expect(item.rating).toBeGreaterThan(1400); // the learner missed it, so it looks harder
  });

  it('refuses unknown skills, bad scores and bad seeds', async () => {
    const morse = subjectApi(MORSE, memoryStore());
    await expect(morse.recordResult('listening', 'k', 1)).rejects.toThrow(/no skill "listening"/);
    await expect(morse.recordResult('Receive', 'k', 1)).rejects.toThrow(RangeError);
    await expect(morse.recordResult('receive', '', 1)).rejects.toThrow(RangeError);
    for (const bad of [-0.1, 1.1, Number.NaN]) {
      await expect(morse.recordResult('receive', 'k', bad)).rejects.toThrow(/score/);
    }
    await expect(morse.recordResult('receive', 'k', 1, { itemSeed: Infinity })).rejects.toThrow(
      /itemSeed/,
    );
    await expect(morse.itemRatings('nope', ['k'])).rejects.toThrow(RangeError);
    expect(() => subjectApi({ id: 'morse', skills: ['Bad'] }, memoryStore())).toThrow(/skill id/);
  });

  it('allows any well-formed skill when a subject lists none', async () => {
    const api = subjectApi({ id: 'example' }, memoryStore());
    await expect(api.recordResult('anything', 'k', 1)).resolves.toBeDefined();
  });
});

describe('rating over time', () => {
  it('grows the deviation by whole idle days, and not before', () => {
    const stored = { rating: 1200, rd: 80, volatility: 0.06, games: 40, ratedAt: t0 };
    expect(asOf(stored, new Date(t0.getTime() + 23 * 3_600_000)).rd).toBe(80);
    expect(asOf(stored, new Date(t0.getTime() + 30 * 86_400_000)).rd).toBeCloseTo(
      Math.hypot(80, Math.sqrt(30) * 0.06 * 173.7178),
      6,
    );
  });

  it('lets a result after a long break move the rating more', () => {
    const settled = { rating: 1200, rd: 60, volatility: 0.06, games: 100, ratedAt: t0 };
    const item = { rating: 1200, rd: 60, volatility: 0.06, games: 100, ratedAt: t0 };
    const soon = rateResult(settled, item, 1, new Date(t0.getTime() + 60_000));
    const later = rateResult(settled, item, 1, new Date(t0.getTime() + 90 * 86_400_000));
    expect(later.learner.rating - 1200).toBeGreaterThan(2 * (soon.learner.rating - 1200));
    expect(soon.learner).toMatchObject({ games: 101 });
  });
});
