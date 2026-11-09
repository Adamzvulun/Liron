import type { ContentSource } from '../content/privateContent.ts';
import { describe, expect, it } from 'vitest';
import { memoryStore, type Award } from './store.ts';
import { subjectApi } from './subjectApi.ts';

describe('subjectApi', () => {
  it('is bound to one subject', async () => {
    const store = memoryStore();
    const morse = subjectApi({ id: 'morse' }, store);
    const arabic = subjectApi({ id: 'arabic' }, store);
    await morse.awardXP(7);
    await arabic.recordPractice(4);
    expect(morse.subjectId).toBe('morse');
    expect(await morse.progressSummary()).toEqual({ xp: 7, minutes: 0 });
    expect(await arabic.progressSummary()).toEqual({ xp: 0, minutes: 4 });
    expect((await store.wallet()).xp).toBe(7);
  });

  it('refuses invalid subject ids', () => {
    expect(() => subjectApi({ id: 'Morse' }, memoryStore())).toThrow(/Invalid subject id/);
  });

  it('only awards whole, positive, sane XP', async () => {
    const api = subjectApi({ id: 'morse' }, memoryStore());
    for (const bad of [0, -5, 1.5, 10_001, Number.NaN]) {
      await expect(api.awardXP(bad)).rejects.toThrow(RangeError);
    }
    expect(await api.progressSummary()).toEqual({ xp: 0, minutes: 0 });
  });

  it('rounds practice to whole minutes and ignores under half a minute', async () => {
    const api = subjectApi({ id: 'morse' }, memoryStore());
    await api.recordPractice(0.4);
    await api.recordPractice(2.6);
    expect(await api.progressSummary()).toEqual({ xp: 0, minutes: 3 });
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(api.recordPractice(bad)).rejects.toThrow(RangeError);
    }
    await api.recordPractice(600); // a screen left open: counted as the 240-minute maximum
    expect(await api.progressSummary()).toEqual({ xp: 0, minutes: 243 });
  });

  it('keeps state per subject and returns copies', async () => {
    const store = memoryStore();
    const api = subjectApi<{ level: number }>({ id: 'morse' }, store);
    expect(await api.loadState()).toBeNull();
    const state = { level: 2 };
    await api.saveState(state);
    state.level = 99;
    expect(await api.loadState()).toEqual({ level: 2 });
    expect(await store.loadState('arabic')).toBeNull();
    await expect(api.saveState([] as unknown as { level: number })).rejects.toThrow(TypeError);
  });
});

describe('awards', () => {
  it('tell the platform about every award, including level-ups and what they paid', async () => {
    const awards: unknown[] = [];
    const api = subjectApi({ id: 'morse' }, memoryStore(), (a) => awards.push(a));
    await api.awardXP(25);
    await api.recordPractice(3);
    expect(awards).toEqual([
      expect.objectContaining({
        xp: 25,
        gold: 15, // 5 for 25 XP + 10 for reaching level 2
        gems: 0,
        xpEarned: 25,
        goldEarned: 15,
        gemsEarned: 0,
        levelBefore: 1,
        level: 2,
      }),
      expect.objectContaining({ xp: 25, xpEarned: 0, goldEarned: 0, level: 2 }),
    ]);
  });
});

describe('private content (ADR 0023)', () => {
  const fakeContent = () => {
    const asked: string[] = [];
    const source: ContentSource = {
      async pack(subject, from) {
        asked.push(`${subject}/${from}`);
        if (from === 'broken') throw new Error('offline');
        return {
          items: [
            {
              id: 'pcav:0001',
              subject,
              type: 'vocab',
              data: {},
              media: [{ kind: 'audio', store: 'private', path: `${from}/pcav01-1.mp3` }],
              tags: [],
            },
          ],
          lessons: [],
        };
      },
      mediaUrl: async (path) => `https://media.test/${path}`,
    };
    return { source, asked };
  };

  it("loads this subject's pack once, and asks again after a failure", async () => {
    const { source, asked } = fakeContent();
    const api = subjectApi({ id: 'arabic' }, memoryStore(), undefined, source);
    const [a, b] = await Promise.all([
      api.privateContent('lingualism-pcav'),
      api.privateContent('lingualism-pcav'),
    ]);
    expect(a).toBe(b);
    expect(a.items[0]?.subject).toBe('arabic');
    await expect(api.privateContent('broken')).rejects.toThrow('offline');
    await expect(api.privateContent('broken')).rejects.toThrow('offline');
    expect(asked).toEqual(['arabic/lingualism-pcav', 'arabic/broken', 'arabic/broken']);
  });

  it('refuses odd sources and paths, and works only with a content source', async () => {
    const { source } = fakeContent();
    const api = subjectApi({ id: 'arabic' }, memoryStore(), undefined, source);
    await expect(api.privateContent('../profiles')).rejects.toThrow(RangeError);
    await expect(api.mediaUrl('../../secret')).rejects.toThrow(RangeError);
    await expect(api.mediaUrl('lingualism-pcav/../x')).rejects.toThrow(RangeError);
    // Only files a loaded pack of this subject names (security review L2).
    await expect(api.mediaUrl('lingualism-pcav/pcav01-1.mp3')).rejects.toThrow(/doesn't name/);
    await api.privateContent('lingualism-pcav');
    await expect(api.mediaUrl('lingualism-pcav/other.mp3')).rejects.toThrow(/doesn't name/);
    await expect(api.mediaUrl('another-deck/pcav01-1.mp3')).rejects.toThrow(/doesn't name/);
    expect(await api.mediaUrl('lingualism-pcav/pcav01-1.mp3')).toBe(
      'https://media.test/lingualism-pcav/pcav01-1.mp3',
    );
    const bare = subjectApi({ id: 'arabic' }, memoryStore());
    await expect(bare.privateContent('lingualism-pcav')).rejects.toThrow(/No content source/);
    await expect(bare.mediaUrl('lingualism-pcav/a.mp3')).rejects.toThrow(/No content source/);
  });

  it('signs several named files in one request, and refuses any unnamed one (#124)', async () => {
    const { source } = fakeContent();
    const batches: string[][] = [];
    const api = subjectApi({ id: 'arabic' }, memoryStore(), undefined, {
      ...source,
      mediaUrls: async (paths) => {
        batches.push([...paths]);
        return new Map(paths.map((p) => [p, `https://media.test/${p}`]));
      },
    });
    await api.privateContent('lingualism-pcav');
    const ok = 'lingualism-pcav/pcav01-1.mp3';
    expect(await api.mediaUrls([ok, ok])).toEqual(new Map([[ok, `https://media.test/${ok}`]]));
    expect(batches).toEqual([[ok]]);
    await expect(api.mediaUrls([ok, 'lingualism-pcav/other.mp3'])).rejects.toThrow(/doesn't name/);
    await expect(api.mediaUrls([ok, '../x'])).rejects.toThrow(RangeError);
    await expect(api.mediaUrls(Array(101).fill(ok))).rejects.toThrow(/at most 100/);
    expect(batches).toHaveLength(1);
    // A source without batches is asked one path at a time.
    const single = subjectApi({ id: 'arabic' }, memoryStore(), undefined, source);
    await single.privateContent('lingualism-pcav');
    expect(await single.mediaUrls([ok])).toEqual(new Map([[ok, `https://media.test/${ok}`]]));
  });
});

describe('saveSession (ADR 0031)', () => {
  it('saves state, reviews, ratings, XP and time in one write, chaining repeats', async () => {
    const store = memoryStore();
    const writes: unknown[] = [];
    const saveSession = store.saveSession.bind(store);
    store.saveSession = (subject, s) => {
      writes.push(s);
      return saveSession(subject, s);
    };
    const awards: Award[] = [];
    const api = subjectApi({ id: 'morse', skills: ['receive'] }, store, (a) => awards.push(a));
    const at = new Date('2026-11-04T10:00:00Z');
    await api.saveSession({
      state: { runs: 1 },
      reviews: [
        { itemId: 'char:K', grade: 'good' },
        { itemId: 'char:K', grade: 'good' },
      ],
      results: [
        { skill: 'receive', itemId: 'char:K', score: 1 },
        { skill: 'receive', itemId: 'char:K', score: 1 },
      ],
      xp: 12,
      minutes: 2.4,
      at,
    });
    expect(writes).toHaveLength(1);
    expect(await api.loadState()).toEqual({ runs: 1 });
    expect(store.reviewLog).toHaveLength(2);
    expect((await api.reviewStatus(['char:K'])).get('char:K')?.reps).toBe(2);
    // The second answer builds on the first: two games played.
    expect((await api.skillRatings()).get('receive')?.games).toBe(2);
    expect((await api.itemRatings('receive', ['char:K'])).get('char:K')?.games).toBe(2);
    expect(await api.progressSummary()).toEqual({ xp: 12, minutes: 2 });
    expect(awards).toHaveLength(1);
  });

  it('applies a session id once', async () => {
    const store = memoryStore();
    const api = subjectApi({ id: 'morse' }, store);
    const report = { state: { n: 1 }, xp: 5, sessionId: 'b5d3c7a0-0000-4000-8000-000000000001' };
    await api.saveSession(report);
    await api.saveSession(report);
    expect(await api.progressSummary()).toEqual({ xp: 5, minutes: 0 });
  });

  it('checks the whole report before sending anything', async () => {
    const store = memoryStore();
    const api = subjectApi({ id: 'morse', skills: ['receive'] }, store);
    await expect(
      api.saveSession({ state: { n: 1 }, results: [{ skill: 'send', itemId: 'x', score: 1 }] }),
    ).rejects.toThrow(/no skill "send"/);
    await expect(api.saveSession({ xp: 2.5 })).rejects.toThrow(/whole number/);
    await expect(
      api.saveSession({
        reviews: Array.from({ length: 201 }, () => ({ itemId: 'a', grade: 'good' as const })),
      }),
    ).rejects.toThrow(/at most 200/);
    expect(await api.loadState()).toBeNull();
  });

  it('sends events for daily contracts, each counted 1 to 100 (ADR 0032)', async () => {
    const store = memoryStore();
    const events: unknown[] = [];
    const saveSession = store.saveSession.bind(store);
    store.saveSession = (subject, s) => {
      events.push(s.events);
      return saveSession(subject, s);
    };
    const api = subjectApi({ id: 'morse' }, store);
    await api.saveSession({ events: [{ kind: 'run' }, { kind: 'run-90', count: 2 }] });
    expect(events).toEqual([
      [
        { kind: 'run', count: 1 },
        { kind: 'run-90', count: 2 },
      ],
    ]);
    await expect(api.saveSession({ events: [{ kind: 'Run!' }] })).rejects.toThrow(/event kind/);
    await expect(api.saveSession({ events: [{ kind: 'run', count: 0 }] })).rejects.toThrow(
      /counts 1 to 100/,
    );
    await expect(
      api.saveSession({ events: Array.from({ length: 51 }, () => ({ kind: 'run' })) }),
    ).rejects.toThrow(/at most 50 events/);
    expect(events).toHaveLength(1);
  });
});
