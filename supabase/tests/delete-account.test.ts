import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Take your data and leave (task 10.2, #500): deleting an account removes every row of theirs,
// and what their friends see keeps working.
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

async function as<T = unknown>(userId: string | null, sql: string, params: unknown[] = []) {
  await db.exec('savepoint stmt');
  await db.exec('set role authenticated');
  await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
  try {
    const r = await db.query(sql, params);
    await db.exec('release savepoint stmt');
    return (Object.values((r.rows[0] ?? {}) as object)[0] ?? null) as T;
  } catch (e) {
    await db.exec('rollback to savepoint stmt');
    throw e;
  } finally {
    await db.exec('reset role');
  }
}
const count = async (sql: string, params: unknown[] = []) =>
  (await db.query(sql, params)).rows.length;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(shim);
  for (const m of migrations) await db.exec(m);
  // A is the project's first account (an inviter); B and C come after.
  for (const [id, name] of [
    [A, 'Adam'],
    [B, 'Basma'],
    [C, 'Chen'],
  ]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [id, `${name}@x.com`]);
    await db.query('update profiles set display_name = $2 where id = $1', [id, name]);
  }
});

beforeEach(async () => {
  await db.exec('begin');
  // A is friends with B and with C; B has left each of the things a friend sees.
  await db.query(
    `insert into friendships (low, high, asked_by, accepted_at)
     values ($1, $2, $1, now()), ($1, $3, $1, now())`,
    [A, B, C],
  );
  await db.query(`insert into fellowship_feed (user_id, kind, detail) values ($1, 'streak', '7')`, [
    B,
  ]);
  await db.query(`insert into fellowship_feed (user_id, kind, detail) values ($1, 'streak', '9')`, [
    C,
  ]);
  await db.query(`insert into home_notes (visitor_id, host_id, note) values ($1, $2, 'tea')`, [
    B,
    A,
  ]);
  await db.query(
    `insert into challenges (kind, from_id, to_id, from_score)
     values ((select kind from round_kinds limit 1), $1, $2, 100)`,
    [B, A],
  );
  await db.query(
    `insert into gifts (from_id, to_id, item_id, price) values ($1, $2, 'cloak', 180)`,
    [B, A],
  );
  await db.query(
    `insert into homes (user_id, layout) select id, home_starter() from auth.users where id in ($1, $2)`,
    [B, C],
  );
});
afterEach(() => db.exec('rollback'));

describe('delete_my_account (#500)', () => {
  it('removes the caller’s login and every row of theirs, and no one else’s', async () => {
    await as(B, 'select delete_my_account()');
    expect(await count('select 1 from auth.users where id = $1', [B])).toBe(0);
    expect(await count('select 1 from auth.users where id in ($1, $2)', [A, C])).toBe(2);
    expect(await count('select 1 from profiles where id = $1', [B])).toBe(0);
    for (const t of ['wallets', 'homes', 'fellowship_feed', 'friend_codes']) {
      expect(await count(`select 1 from ${t} where user_id = $1`, [B]), t).toBe(0);
    }
    expect(await count('select 1 from home_notes where visitor_id = $1', [B])).toBe(0);
    expect(await count('select 1 from friendships where $1 in (low, high)', [B])).toBe(0);
    expect(await count('select 1 from friendships where $1 in (low, high)', [A])).toBe(1);
  });

  it('is only for a signed-in player: no one else’s account, no anonymous call', async () => {
    await expect(as(null, 'select delete_my_account()')).rejects.toThrow(/not signed in/);
    await db.exec('savepoint anon');
    await db.exec('set role anon');
    await expect(db.query('select delete_my_account()')).rejects.toThrow(/permission denied/);
    await db.exec('rollback to savepoint anon');
    await db.exec('reset role');
    expect(await count('select 1 from auth.users')).toBe(3);
  });

  it('every column naming a login deletes with it (the invite’s “used by” is set null)', async () => {
    const refs = (await db.query(
      `select conrelid::regclass::text as t, a.attname as col, confdeltype as how
       from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
       where confrelid = 'auth.users'::regclass and contype = 'f' order by 1, 2`,
    )) as { rows: { t: string; col: string; how: string }[] };
    expect(refs.rows.length).toBeGreaterThan(20);
    const notCascading = refs.rows
      .filter((r) => r.how !== 'c')
      .map((r) => `${r.t}.${r.col}:${r.how}`);
    expect(notCascading).toEqual(['invites.used_by:n']);
  });

  it('a friend’s shelf, feed, visits, challenges, notes and gifts still work', async () => {
    await as(B, 'select delete_my_account()');
    const cards = await as<{ id: string }[]>(A, 'select fellowship()');
    expect(cards.map((c) => c.id).sort()).toEqual([A, C]);
    const feed = await as<{ user_id?: string; id?: string }[]>(A, 'select fellowship_feed()');
    expect(feed.length).toBeGreaterThan(0);
    expect(JSON.stringify(feed)).not.toContain(B);
    expect(await as(A, 'select my_notes()')).toEqual([]);
    expect(await as(A, 'select my_challenges()')).toEqual([]);
    expect(await as(A, 'select my_gifts()')).toEqual([]);
    expect(await as(A, 'select home_of($1)', [B])).toBeNull();
    // C is still a friend, and their room still opens.
    expect(await as(A, 'select home_of($1)', [C])).not.toBeNull();
  });

  it('an invite link the player made stops working; one they used keeps its row', async () => {
    const code = await as<string>(A, 'select make_invite()');
    const used = await as<string>(A, 'select make_invite()');
    await db.query('select claim_invite($1)', [used]);
    await db.query('select finish_invite($1, $2)', [used, B]);
    expect((await db.query('select invite_open($1) as o', [code])).rows).toEqual([{ o: true }]);
    await as(A, 'select delete_my_account()');
    expect((await db.query('select invite_open($1) as o', [code])).rows).toEqual([{ o: false }]);
    expect(await count('select 1 from invites')).toBe(0);
    // B's friend, A, is gone; B's own "used" link is A's, so it went with A.
    await as(B, 'select delete_my_account()');
  });
});
