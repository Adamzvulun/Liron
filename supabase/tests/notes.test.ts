import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NOTES } from '../../src/core/home/notes.ts';

// Notes at the letterbox (task 8.1, #469; docs/game/the-home.md §13). Only friends leave them,
// only from the set, at most one a day each; only the host and the writer read them.
const root = join(import.meta.dirname, '..');
const shim = readFileSync(join(import.meta.dirname, 'supabase-shim.sql'), 'utf8');
const migrations = readdirSync(join(root, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(root, 'migrations', f), 'utf8'));

const A = '00000000-0000-0000-0000-0000000000a1';
const B = '00000000-0000-0000-0000-0000000000b2';
const C = '00000000-0000-0000-0000-0000000000c3';

let db: PGlite;

async function run(sql: string, params: unknown[] = []) {
  await db.exec('savepoint stmt');
  try {
    const result = await db.query(sql, params);
    await db.exec('release savepoint stmt');
    return result;
  } catch (e) {
    await db.exec('rollback to savepoint stmt');
    throw e;
  }
}

/** Runs one statement as a signed-in player and returns its single value. */
async function as(userId: string, sql: string, params: unknown[] = []): Promise<unknown> {
  await db.exec('set role authenticated');
  await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
  try {
    const r = (await run(sql, params)).rows[0] as Record<string, unknown> | undefined;
    return r ? Object.values(r)[0] : undefined;
  } finally {
    await db.exec('reset role');
  }
}

const leave = (who: string, host: string, note: string) =>
  as(who, 'select leave_note($1, $2)', [host, note]);
const notes = async (who: string) =>
  (await as(who, 'select my_notes()')) as Record<string, unknown>[];
const feed = async (who: string) =>
  (await as(who, 'select fellowship_feed()')) as Record<string, unknown>[];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(shim);
  for (const m of migrations) await db.exec(m);
  for (const [id, name] of [
    [A, 'Adam'],
    [B, 'Basma'],
    [C, 'Carim'],
  ]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [id, `${id}@x.com`]);
    await db.query('update profiles set display_name = $2 where id = $1', [id, name]);
  }
  await db.query(
    `insert into friendships (low, high, asked_by, accepted_at) values ($1, $2, $1, now())`,
    [A, B],
  );
});

beforeEach(() => db.exec('begin'));
afterEach(() => db.exec('rollback'));

describe('notes at the letterbox', () => {
  it('are the notes in content/core/home.json', async () => {
    const ids = (await db.query<{ ids: string[] }>('select home_note_ids() as ids')).rows[0].ids;
    expect(ids).toEqual(NOTES.map((n) => n.id));
  });

  it('reach a friend’s letterbox, one a day, the later one kept', async () => {
    await leave(B, A, 'tea');
    await leave(B, A, '73');
    const got = await notes(A);
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ from: B, name: 'Basma', note: '73' });
    expect(got[0].day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await as(B, 'select my_note_for($1)', [A])).toBe('73');
    expect(await as(A, 'select my_note_for($1)', [B])).toBeNull();
  });

  it('are refused from a stranger, to yourself, and outside the set', async () => {
    await expect(leave(C, A, 'tea')).rejects.toThrow(/not a friend/);
    await expect(leave(A, A, 'tea')).rejects.toThrow(/not a friend/);
    await expect(leave(B, A, 'hello there')).rejects.toThrow(/no such note/);
    await expect(leave(B, A, '')).rejects.toThrow(/no such note/);
    expect(await notes(A)).toEqual([]);
  });

  it('are read by the host and nobody else', async () => {
    await leave(B, A, 'clean');
    expect(await notes(B)).toEqual([]);
    expect(await notes(C)).toEqual([]);
    expect(await as(C, 'select my_note_for($1)', [A])).toBeNull();
    await expect(as(B, 'select count(*) from home_notes')).rejects.toThrow(/permission denied/);
    await expect(
      as(B, `insert into home_notes (host_id, visitor_id, note) values ($1, $2, 'tea')`, [A, B]),
    ).rejects.toThrow(/permission denied/);
  });

  it('say who stopped by in the host’s feed only', async () => {
    await leave(B, A, 'window');
    const mine = (await feed(A)).filter((r) => r.kind === 'visit');
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ who: B, name: 'Basma', me: false, detail: 'window' });
    expect(Number(mine[0].id)).toBeLessThan(0);
    expect((await feed(B)).filter((r) => r.kind === 'visit')).toEqual([]);
  });

  it('go quiet when the friendship ends, and are gone after 60 days', async () => {
    await leave(B, A, 'bye');
    await db.query('delete from friendships');
    expect(await notes(A)).toEqual([]);
    expect((await feed(A)).filter((r) => r.kind === 'visit')).toEqual([]);
    await db.query(
      `insert into friendships (low, high, asked_by, accepted_at) values ($1, $2, $1, now())`,
      [A, B],
    );
    await db.query(`update home_notes set at = now() - interval '61 days'`);
    expect(await notes(A)).toEqual([]);
    expect(await db.query('select * from home_notes')).toMatchObject({ rows: [] });
  });
});
