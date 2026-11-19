import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { loadPrivatePack, privateMediaUrls, privatePackVersion } from './privateContent.ts';

type Row = Record<string, unknown>;
type Answer = { data: Row[] | null; count?: number | null; error: { message: string } | null };

/** A query builder that records each request and answers from a function of it. */
function fakeClient(answer: (table: string, q: Record<string, unknown>) => Answer) {
  const asked: { table: string; q: Record<string, unknown> }[] = [];
  const client = {
    from(table: string) {
      const q: Record<string, unknown> = {};
      const builder = {
        select: (cols: string, opts?: unknown) => ((q.select = cols), (q.opts = opts), builder),
        eq: (k: string, v: unknown) => ((q[k] = v), builder),
        order: (k: string) => ((q.order = k), builder),
        range: (a: number, b: number) => ((q.range = [a, b]), builder),
        limit: (n: number) => ((q.limit = n), builder),
        then: (ok: (a: Answer) => unknown, bad?: (e: unknown) => unknown) => {
          asked.push({ table, q });
          return Promise.resolve(answer(table, q)).then(ok, bad);
        },
      };
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, asked };
}

const itemRow = (n: number): Row => ({
  item_id: `w${String(n).padStart(5, '0')}`,
  type: 'word',
  data: { arabic: 'ب', english: 'b' },
  media: [],
  tags: [],
});

describe('the private deck', () => {
  it('reads every page of items, 1,000 at a time, then the lessons', async () => {
    const all = Array.from({ length: 2345 }, (_, i) => itemRow(i));
    const { client, asked } = fakeClient((table, q) => {
      if (table === 'content_lessons') {
        // Lessons page as well (review, 2026-11-19): 1,001 of them take two pages.
        const lessons = Array.from({ length: 1001 }, (_, i) => ({
          lesson_id: `l${i + 1}`,
          title: `L${i + 1}`,
          position: i + 1,
          items: ['w00000'],
          tags: [],
        }));
        const [a, b] = q.range as [number, number];
        return { data: lessons.slice(a, b + 1), error: null };
      }
      const [a, b] = q.range as [number, number];
      return { data: all.slice(a, b + 1), error: null };
    });
    const pack = await loadPrivatePack(client, 'arabic', 'deck');
    expect(pack.items).toHaveLength(2345);
    expect(pack.items[2344]?.id).toBe('w02344');
    expect(pack.lessons).toHaveLength(1001);
    expect(pack.lessons.map((l) => [l.id, l.order])[1000]).toEqual(['l1001', 1001]);
    expect(asked.filter((a) => a.table === 'content_items').map((a) => a.q.range)).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
    expect(asked[0]?.q).toMatchObject({ subject_id: 'arabic', source: 'deck' });
  });

  it('says which source failed', async () => {
    const { client } = fakeClient(() => ({ data: null, error: { message: 'denied' } }));
    await expect(loadPrivatePack(client, 'arabic', 'deck')).rejects.toThrow(
      "Couldn't load deck: denied",
    );
  });
});

describe("the deck's version", () => {
  it('is the row count and latest change of the items and the lessons', async () => {
    const { client } = fakeClient((table) =>
      table === 'content_items'
        ? { data: [{ updated_at: '2026-11-01T00:00:00Z' }], count: 4300, error: null }
        : { data: [{ updated_at: '2026-10-02T00:00:00Z' }], count: 12, error: null },
    );
    expect(await privatePackVersion(client, 'arabic', 'deck')).toBe(
      '4300@2026-11-01T00:00:00Z;12@2026-10-02T00:00:00Z',
    );
  });

  it('changes when a row is added, even with the same latest change', async () => {
    let count = 10;
    const { client } = fakeClient(() => ({ data: [{ updated_at: 't' }], count, error: null }));
    const before = await privatePackVersion(client, 'arabic', 'deck');
    count = 11;
    expect(await privatePackVersion(client, 'arabic', 'deck')).not.toBe(before);
  });

  it('counts a source without lessons as 0, but fails without items', async () => {
    const { client } = fakeClient((table) =>
      table === 'content_items'
        ? { data: [{ updated_at: 't' }], count: 3, error: null }
        : { data: [], count: 0, error: null },
    );
    expect(await privatePackVersion(client, 'arabic', 'deck')).toBe('3@t;0');
    const empty = fakeClient(() => ({ data: [], count: 0, error: null }));
    await expect(privatePackVersion(empty.client, 'arabic', 'deck')).rejects.toThrow(
      'No version for deck',
    );
  });
});

describe('recording links', () => {
  it('keeps the links that were signed and drops the ones that failed', async () => {
    const client = {
      storage: {
        from: () => ({
          createSignedUrls: async () => ({
            data: [
              { path: 'a.mp3', signedUrl: 'https://x/a', error: null },
              { path: 'b.mp3', signedUrl: '', error: 'Not found' },
            ],
            error: null,
          }),
        }),
      },
    } as unknown as SupabaseClient;
    const links = await privateMediaUrls(client, ['a.mp3', 'b.mp3']);
    expect([...links]).toEqual([['a.mp3', 'https://x/a']]);
  });
});
