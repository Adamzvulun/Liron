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

describe('saving, then loading (review, 2026-11-15)', () => {
  it('a load waits for a save still on its way, even a failed one', async () => {
    const base = memoryStore();
    let release = () => {};
    const slow = new Promise<void>((r) => (release = r));
    const store = {
      ...base,
      saveSession: async (...args: Parameters<typeof base.saveSession>) => {
        await slow;
        return base.saveSession(...args);
      },
    };
    const api = subjectApi<{ n: number }>({ id: 'morse' }, store);
    await api.saveState({ n: 1 });
    const saved = api.saveSession({ state: { n: 2 } });
    const loaded = api.loadState();
    release();
    await saved;
    expect(await loaded).toEqual({ n: 2 });
  });

  it('a save that failed is what the next load gets, until a save gets through', async () => {
    const base = memoryStore();
    let online = false;
    const store = {
      ...base,
      saveSession: async (...args: Parameters<typeof base.saveSession>) => {
        if (!online) throw new Error('offline');
        return base.saveSession(...args);
      },
    };
    const api = subjectApi<{ n: number }>({ id: 'morse' }, store);
    await api.saveState({ n: 2 });
    await expect(api.saveSession({ state: { n: 3 } })).rejects.toThrow('offline');
    // Leaving and opening another door: it builds on the run that didn't save.
    expect(await api.loadState()).toEqual({ n: 3 });
    online = true;
    await api.saveSession({ state: { n: 4 } });
    expect(await api.loadState()).toEqual({ n: 4 });
    expect(await base.loadState('morse')).toEqual({ n: 4 });
  });
});

describe('a save that failed goes again (review, 2026-11-19)', () => {
  const flaky = () => {
    const base = memoryStore();
    const line = { online: false, broken: false };
    const sent: { id: string; xp: number; events: string[]; state: unknown; reviews: number }[] =
      [];
    const store = {
      ...base,
      saveSession: async (...args: Parameters<typeof base.saveSession>) => {
        const [, w] = args;
        if (line.broken && w.xp === 13) throw new Error('refused');
        if (!line.online) throw new Error('offline');
        sent.push({
          id: w.sessionId,
          xp: w.xp,
          events: w.events.map((e) => e.kind),
          state: w.state,
          reviews: w.reviews.length,
        });
        return base.saveSession(...args);
      },
      reviewCards: async (...args: Parameters<typeof base.reviewCards>) => {
        if (!line.online) throw new Error('offline');
        return base.reviewCards(...args);
      },
    };
    return { base, line, sent, api: subjectApi<{ n: number }>({ id: 'morse' }, store) };
  };

  it('with its XP and events, before the next save, and without its old state', async () => {
    const { base, line, sent, api } = flaky();
    const id = 'b5d3c7a0-0000-4000-8000-00000000000a';
    await expect(
      api.saveSession({ state: { n: 1 }, xp: 40, events: [{ kind: 'trial-1' }], sessionId: id }),
    ).rejects.toThrow('offline');
    line.online = true;
    await api.saveSession({ state: { n: 2 }, xp: 5 });
    expect(sent.map((s) => [s.id === id, s.xp, s.events, s.state])).toEqual([
      [true, 40, ['trial-1'], null],
      [false, 5, [], { n: 2 }],
    ]);
    expect(await base.summary('morse')).toMatchObject({ xp: 45 });
    // Sent again by now; the database would ignore it if it came a third time (ADR 0031).
    await api.saveSession({ xp: 1 });
    expect(sent.filter((s) => s.id === id)).toHaveLength(1);
  });

  it('even when it failed reading what it builds on, and keeps that state', async () => {
    const { line, sent, api } = flaky();
    const reviews = [{ itemId: 'a', grade: 'good' as const }];
    await expect(api.saveSession({ state: { n: 7 }, xp: 9, reviews })).rejects.toThrow('offline');
    expect(await api.loadState()).toEqual({ n: 7 });
    line.online = true;
    await api.saveSession({ xp: 1 });
    expect(sent.map((s) => s.xp)).toEqual([9, 1]);
  });

  it('being offline for many runs never lets one go, and the oldest are kept', async () => {
    const { line, sent, api } = flaky();
    await expect(api.saveSession({ xp: 40, events: [{ kind: 'trial-1' }] })).rejects.toThrow();
    for (let i = 0; i < 25; i++) await expect(api.saveSession({ xp: 1 })).rejects.toThrow();
    line.online = true;
    await api.saveSession({ xp: 2 });
    expect(sent[0]).toMatchObject({ xp: 40, events: ['trial-1'] });
    // 20 held at most: the trial and the first 19 short runs, then the new one.
    expect(sent.map((s) => s.xp)).toEqual([40, ...Array<number>(19).fill(1), 2]);
  });

  it('once a newer save has gone through, an older one goes without its reviews', async () => {
    const { line, sent, api } = flaky();
    line.online = true;
    line.broken = true;
    const reviews = [{ itemId: 'a', grade: 'good' as const }];
    // Refused, then a newer review of the same card gets through.
    await expect(api.saveSession({ xp: 13, reviews })).rejects.toThrow('refused');
    await api.saveSession({ xp: 1, reviews });
    line.broken = false;
    await api.saveSession({ xp: 2 });
    expect(sent.map((s) => [s.xp, s.reviews])).toEqual([
      [1, 1],
      [13, 0],
      [2, 0],
    ]);
  });

  it('lets go of one the database keeps refusing, and never blocks a new save', async () => {
    const { line, sent, api } = flaky();
    line.online = true;
    line.broken = true;
    await expect(api.saveSession({ xp: 13 })).rejects.toThrow('refused');
    for (let i = 0; i < 4; i++) await api.saveSession({ xp: 1 });
    line.broken = false;
    await api.saveSession({ xp: 2 });
    expect(sent.map((s) => s.xp)).toEqual([1, 1, 1, 1, 2]);
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

describe('what is due today (review, 2026-11-15)', () => {
  it('a card in long-term review is due all of its day; a learning step waits its minutes', async () => {
    const api = subjectApi({ id: 'morse' }, memoryStore());
    const evening = new Date(2026, 10, 2, 21, 0);
    const { due } = await api.recordReview('char:K', 'easy', evening);
    expect(due.getTime()).toBeGreaterThan(evening.getTime() + 86_400_000 / 2);
    const morning = new Date(due);
    morning.setHours(0, 30, 0, 0);
    expect((await api.dueItems({ now: morning })).map((d) => d.itemId)).toEqual(['char:K']);
    const dayBefore = new Date(morning.getTime() - 86_400_000);
    expect(await api.dueItems({ now: dayBefore })).toEqual([]);

    const step = await api.recordReview('char:M', 'again', evening);
    expect(step.phase).not.toBe('review');
    const soon = new Date(evening.getTime() + 10_000);
    expect((await api.dueItems({ now: soon })).map((d) => d.itemId)).not.toContain('char:M');
    expect((await api.dueItems({ now: step.due })).map((d) => d.itemId)).toContain('char:M');
  });

  it('can ask about some items only, so others due can’t crowd them out (review, 2026-11-19)', async () => {
    const api = subjectApi({ id: 'arabic' }, memoryStore());
    const then = new Date(2026, 10, 2, 9, 0);
    for (const id of ['w1', 'w2', 'w3', 'p1']) await api.recordReview(id, 'again', then);
    const later = new Date(2026, 10, 9, 9, 0);
    expect((await api.dueItems({ now: later, limit: 2 })).map((d) => d.itemId)).not.toContain('p1');
    expect(
      (await api.dueItems({ now: later, limit: 2, only: ['p1', 'p9'] })).map((d) => d.itemId),
    ).toEqual(['p1']);
    expect(await api.dueItems({ now: later, only: [] })).toEqual([]);
    await expect(api.dueItems({ only: [''] })).rejects.toThrow(RangeError);
  });
});
