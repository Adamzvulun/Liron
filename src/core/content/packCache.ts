// The private deck kept in the browser (#124): it downloads once, not on every visit. A cheap
// version check (row count and latest change) decides whether the kept copy is still current.
// The copy lives only in this browser's IndexedDB, behind the same login, and is wiped on sign
// out (ADR 0011, ADR 0023 amendment).
import type { Item, Lesson } from './schema.ts';
import type { ContentSource } from './privateContent.ts';

type Pack = { items: Item[]; lessons: Lesson[] };

/** Where kept packs live: IndexedDB in the app, a map in tests. */
export interface PackStore {
  get(key: string): Promise<{ version: string; pack: Pack } | undefined>;
  put(key: string, value: { version: string; pack: Pack }): Promise<void>;
  clear(): Promise<void>;
}

/**
 * A content source that answers `pack` from the kept copy when its version still matches, and
 * otherwise loads it and keeps it. Any trouble with the version or the store falls back to
 * loading, so the cache can only save requests, never lose content.
 */
export function cachedContent(
  source: ContentSource,
  version: (subject: string, source: string) => Promise<string>,
  store: PackStore,
): ContentSource {
  return {
    ...source,
    async pack(subject, name) {
      const key = `${subject}/${name}`;
      const [current, kept] = await Promise.all([
        version(subject, name).catch(() => null),
        store.get(key).catch(() => undefined),
      ]);
      if (current && kept?.version === current) return kept.pack;
      const pack = await source.pack(subject, name);
      if (current) await store.put(key, { version: current, pack }).catch(() => {});
      return pack;
    },
  };
}

const DB = 'waymark-content';
const STORE = 'packs';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB unavailable'));
  });
}

function run<T>(mode: IDBTransactionMode, act: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = act(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result as T);
        };
        tx.onerror = tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error('IndexedDB failed'));
        };
      }),
  );
}

/** Packs kept in this browser's IndexedDB. */
export const browserPackStore: PackStore = {
  get: (key) => run('readonly', (s) => s.get(key)),
  put: (key, value) => run<unknown>('readwrite', (s) => s.put(value, key)).then(() => {}),
  clear: () => run<unknown>('readwrite', (s) => s.clear()).then(() => {}),
};
