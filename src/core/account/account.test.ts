import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { deleteAccount, deleteWordOk, MY_TABLES, readMyData } from './account.ts';

/** A client that records what it was asked and answers from `rows` / `rpcs`. */
function fake(opts: { signIn?: { error: object | null }; rpc?: { error: object | null } } = {}) {
  const calls: string[] = [];
  const client = {
    from: (table: string) => {
      const query = {
        select: () => query,
        order: () => query,
        range: (from: number) => {
          calls.push(`${table}@${from}`);
          const n = table === 'review_log' ? (from === 0 ? 1000 : 3) : 1;
          return Promise.resolve({
            data: Array.from({ length: n }, (_, i) => ({ i })),
            error: null,
          });
        },
      };
      return query;
    },
    rpc: vi.fn((name: string) => {
      calls.push(name);
      return Promise.resolve(
        name === 'delete_my_account' ? (opts.rpc ?? { error: null }) : { data: null, error: null },
      );
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { email: 'a@x.com' } } } }),
      signInWithPassword: vi.fn(() => Promise.resolve(opts.signIn ?? { error: null })),
      signOut: vi.fn(() => Promise.resolve({})),
    },
  };
  return { client: client as unknown as SupabaseClient, calls, raw: client };
}

describe('readMyData', () => {
  it('reads every table, and every page of a long one, and the three friend lists', async () => {
    const { client, calls } = fake();
    const data = await readMyData(client);
    expect(Object.keys(data)).toEqual([
      ...MY_TABLES.map(([t]) => t),
      'my_notes',
      'my_gifts',
      'my_challenges',
      'fellowship',
    ]);
    expect((data.review_log as unknown[]).length).toBe(1003);
    expect(calls).toContain('review_log@1000');
    expect(data.my_notes).toEqual([]);
  });

  it('throws rather than hand over a file with a table missing', async () => {
    const { client } = fake();
    vi.spyOn(client, 'from').mockImplementation(() => {
      const q = {
        select: () => q,
        order: () => q,
        range: () => Promise.resolve({ data: null, error: new Error('no') }),
      };
      return q as never;
    });
    await expect(readMyData(client)).rejects.toThrow('no');
  });
});

describe('readMyData paging', () => {
  it('orders by the whole key, so rows that tie on the first column are neither repeated nor lost', async () => {
    const all = Array.from({ length: 2500 }, (_, i) => ({
      user_id: 'me',
      subject_id: 'morse',
      item_id: `item ${String(i).padStart(4, '0')}`,
    }));
    const client = {
      from: (table: string) => {
        const order: string[] = [];
        const query = {
          select: () => query,
          order: (c: string) => (order.push(c), query),
          range: (from: number, to: number) => {
            // Rows that tie on every column asked for come back in any order, as in Postgres.
            const rows = table === 'review_cards' ? [...all].sort(() => Math.random() - 0.5) : [];
            rows.sort((a, b) => {
              for (const c of order) {
                const x = a[c as keyof typeof a];
                const y = b[c as keyof typeof b];
                if (x !== y) return x < y ? -1 : 1;
              }
              return 0;
            });
            return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
          },
        };
        return query;
      },
      rpc: () => Promise.resolve({ data: null, error: null }),
    } as unknown as SupabaseClient;
    const got = (await readMyData(client)).review_cards as typeof all;
    expect(got).toHaveLength(2500);
    expect(new Set(got.map((r) => r.item_id)).size).toBe(2500);
  });
});

describe('deleteWordOk', () => {
  it('wants DELETE in capitals and nothing else', () => {
    expect(deleteWordOk('DELETE')).toBe(true);
    expect(deleteWordOk(' DELETE ')).toBe(true);
    for (const bad of ['', 'delete', 'Delete', 'DELETE ME', 'DEL'])
      expect(deleteWordOk(bad)).toBe(false);
  });
});

describe('deleteAccount', () => {
  it('checks the password, deletes, then signs out', async () => {
    const { client, raw } = fake();
    expect(await deleteAccount(client, 'pw')).toBeNull();
    expect(raw.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@x.com', password: 'pw' });
    expect(raw.rpc).toHaveBeenCalledWith('delete_my_account');
    expect(raw.auth.signOut).toHaveBeenCalled();
  });

  it('deletes nothing when the password is wrong', async () => {
    const { client, raw } = fake({ signIn: { error: { code: 'invalid_credentials' } } });
    expect(await deleteAccount(client, 'nope')).toBe('That password isn’t right.');
    expect(raw.rpc).not.toHaveBeenCalled();
    expect(raw.auth.signOut).not.toHaveBeenCalled();
  });

  it('still says it is gone when only the sign-out fails afterwards', async () => {
    const { client, raw } = fake();
    raw.auth.signOut.mockRejectedValueOnce(new Error('offline'));
    expect(await deleteAccount(client, 'pw')).toBeNull();
  });

  it('stays signed in when the database refuses', async () => {
    const { client, raw } = fake({ rpc: { error: { message: 'x' } } });
    expect(await deleteAccount(client, 'pw')).toMatch(/Nothing was removed/);
    expect(raw.auth.signOut).not.toHaveBeenCalled();
  });
});
