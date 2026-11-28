import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Our own error log (task 10.1, #499; ADR 0058): field caps, 20 rows a player a day, one row per
// message a day, the newest 2,000 kept, and nobody reading the table through the API.
const root = join(import.meta.dirname, '..');
const shim = readFileSync(join(import.meta.dirname, 'supabase-shim.sql'), 'utf8');
const migrations = readdirSync(join(root, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(root, 'migrations', f), 'utf8'));

const A = '00000000-0000-0000-0000-0000000000a1';
const B = '00000000-0000-0000-0000-0000000000b2';

let db: PGlite;

/** Runs one statement as a signed-in player (null: signed out). */
async function as(userId: string | null, sql: string, params: unknown[] = []) {
  await db.exec('set role authenticated');
  await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
  await db.exec('savepoint stmt');
  try {
    const r = await db.query(sql, params);
    await db.exec('release savepoint stmt');
    return r.rows;
  } catch (e) {
    await db.exec('rollback to savepoint stmt');
    throw e;
  } finally {
    await db.exec('reset role');
  }
}

const report = (who: string | null, message: string, stack = '', route = '/') =>
  as(who, 'select report_error($1, $2, $3, $4, $5)', [message, stack, route, '1.0.0', 'UA']);
const rows = async (sql = 'select * from error_log order by id') =>
  (await db.query<Record<string, unknown>>(sql)).rows;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(shim);
  for (const m of migrations) await db.exec(m);
  for (const id of [A, B]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [id, `${id}@x.com`]);
  }
});

beforeEach(() => db.exec('begin'));
afterEach(() => db.exec('rollback'));

describe('the error log', () => {
  it('keeps one row of what was listed, with fields cut to size', async () => {
    const stack = Array.from({ length: 15 }, (_, i) => `at line${i}`).join('\n');
    await report(A, 'x'.repeat(900), stack, '/arabic/slate?name=Adam#top');
    const [row] = await rows();
    expect(row).toMatchObject({ player_id: A, route: '/arabic/slate', version: '1.0.0' });
    expect(row.message).toHaveLength(500);
    expect((row.stack as string).split('\n')).toHaveLength(10);
    expect(row.user_agent).toBe('UA');
  });

  it('refuses a signed-out caller', async () => {
    await expect(report(null, 'boom')).rejects.toThrow(/not signed in/);
    expect(await rows()).toEqual([]);
  });

  it('writes the same message once a player a day', async () => {
    await report(A, 'boom');
    await report(A, 'boom');
    await report(B, 'boom');
    expect(await rows('select player_id from error_log order by id')).toHaveLength(2);
  });

  it('stops at 20 rows a player a day', async () => {
    for (let i = 0; i < 25; i++) await report(A, `error ${i}`);
    await report(B, 'mine');
    expect(await rows(`select 1 from error_log where player_id = '${A}'`)).toHaveLength(20);
    expect(await rows(`select 1 from error_log where player_id = '${B}'`)).toHaveLength(1);
  });

  it('keeps the newest 2,000 rows', async () => {
    await db.exec(`insert into error_log (player_id, message, stack, route, version, user_agent)
      select '${B}', 'old ' || n, '', '/', '1', '' from generate_series(1, 2000) n`);
    await report(A, 'newest');
    const all = await rows('select message from error_log order by id');
    expect(all).toHaveLength(2000);
    expect(all[0]?.message).toBe('old 2');
    expect(all.at(-1)?.message).toBe('newest');
  });

  it('can’t be read or written by a player', async () => {
    await expect(as(A, 'select * from error_log')).rejects.toThrow(/permission denied/);
    await expect(
      as(
        A,
        `insert into error_log (player_id, message, stack, route, version, user_agent)
             values ($1, 'm', '', '/', '1', '')`,
        [A],
      ),
    ).rejects.toThrow(/permission denied/);
  });
});
