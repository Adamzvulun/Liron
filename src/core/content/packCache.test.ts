import { describe, expect, it } from 'vitest';
import { cachedContent, PACK_FORMAT, type PackStore } from './packCache.ts';
import type { ContentSource } from './privateContent.ts';
import type { Item, Lesson } from './schema.ts';

function setup(version: () => Promise<string>, failingStore = false) {
  const loads: string[] = [];
  const kept = new Map<string, { version: string; pack: { items: Item[]; lessons: Lesson[] } }>();
  const store: PackStore = {
    get: async (k) => {
      if (failingStore) throw new Error('private window');
      return kept.get(k);
    },
    put: async (k, v) => {
      if (failingStore) throw new Error('private window');
      kept.set(k, v);
    },
    clear: async () => kept.clear(),
  };
  const source: ContentSource = {
    pack: async (subject, name) => {
      loads.push(`${subject}/${name}`);
      return { items: [], lessons: [] };
    },
    mediaUrl: async (p) => p,
  };
  return { content: cachedContent(source, version, store), loads, kept, store };
}

describe('the deck kept in the browser (#124)', () => {
  it('loads once, then answers from the kept copy while the version holds', async () => {
    let v = '4823@a;0';
    const { content, loads } = setup(async () => v);
    await content.pack('arabic', 'deck');
    await content.pack('arabic', 'deck');
    expect(loads).toEqual(['arabic/deck']);
    v = '4824@b;0';
    await content.pack('arabic', 'deck');
    expect(loads).toEqual(['arabic/deck', 'arabic/deck']);
  });

  it('loads again a copy kept in an older format (review, 2026-11-19)', async () => {
    const { content, loads, kept } = setup(async () => '4823@a;0');
    kept.set('arabic/deck', { version: '4823@a;0', pack: { items: [], lessons: [] } });
    await content.pack('arabic', 'deck');
    expect(loads).toEqual(['arabic/deck']);
    expect(kept.get('arabic/deck')?.version).toBe(`${PACK_FORMAT}:4823@a;0`);
  });

  it('loads every time when the version or the store fails, and forgets on clear', async () => {
    const noVersion = setup(() => Promise.reject(new Error('offline')));
    await noVersion.content.pack('arabic', 'deck');
    await noVersion.content.pack('arabic', 'deck');
    expect(noVersion.loads).toHaveLength(2);
    expect(noVersion.kept.size).toBe(0);

    const noStore = setup(async () => '1@a;0', true);
    await noStore.content.pack('arabic', 'deck');
    await noStore.content.pack('arabic', 'deck');
    expect(noStore.loads).toHaveLength(2);

    const ok = setup(async () => '1@a;0');
    await ok.content.pack('arabic', 'deck');
    await ok.store.clear();
    await ok.content.pack('arabic', 'deck');
    expect(ok.loads).toHaveLength(2);
  });
});
