import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Runs the real migrations in PGlite (Postgres compiled to WebAssembly, in-process) on top of a
// small stand-in for Supabase's auth schema, then checks row-level security as each role.
const root = join(import.meta.dirname, '..');
const shim = readFileSync(join(import.meta.dirname, 'supabase-shim.sql'), 'utf8');
const migrations = readdirSync(join(root, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(root, 'migrations', f), 'utf8'));

const ADAM = '00000000-0000-0000-0000-00000000000a';
const OTHER = '00000000-0000-0000-0000-00000000000b';
const TABLES = ['profiles', 'wallets', 'daily_activity', 'subject_progress'] as const;

let db: PGlite;

/**
 * Runs one statement inside a savepoint, so an expected error doesn't abort the test's
 * transaction (each test runs in a transaction that is rolled back afterwards).
 */
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

const rows = async (sql: string, params: unknown[] = []) => (await run(sql, params)).rows;

/** Runs `fn` as a signed-in user (or as a logged-out visitor when `userId` is null). */
async function as<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(userId ? 'set role authenticated' : 'set role anon');
  await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(shim);
  // Adam exists before the migration (as on the real projects); OTHER signs up afterwards.
  await db.query('insert into auth.users (id, email) values ($1, $2)', [ADAM, 'adam@example.com']);
  for (const m of migrations) await db.exec(m);
  await db.query('insert into auth.users (id, email) values ($1, $2)', [OTHER, 'b@example.com']);
  for (const id of [ADAM, OTHER]) {
    await db.query(
      `insert into daily_activity (user_id, day, minutes) values ($1, '2026-11-02', 5)`,
      [id],
    );
    await db.query(`insert into subject_progress (user_id, subject_id) values ($1, 'morse')`, [id]);
  }
});

// Every test starts from the same state: its changes are rolled back afterwards.
beforeEach(() => db.exec('begin'));
afterEach(() => db.exec('rollback'));

describe('player rows', () => {
  it('gives existing and new accounts a profile and an empty wallet', async () => {
    const profiles = await rows(
      'select id, title, daily_goal_minutes, time_zone from profiles order by id',
    );
    expect(profiles).toEqual([
      { id: ADAM, title: 'Traveller', daily_goal_minutes: 15, time_zone: 'UTC' },
      { id: OTHER, title: 'Traveller', daily_goal_minutes: 15, time_zone: 'UTC' },
    ]);
    const wallets = await rows('select user_id, xp, gold, gems from wallets order by user_id');
    expect(wallets).toEqual([
      { user_id: ADAM, xp: 0, gold: 0, gems: 0 },
      { user_id: OTHER, xp: 0, gold: 0, gems: 0 },
    ]);
  });

  it('keeps updated_at current', async () => {
    await rows(`update wallets set updated_at = '2000-01-01' where user_id = $1`, [ADAM]);
    await rows(`update wallets set gold = 5 where user_id = $1`, [ADAM]);
    const [w] = await rows(
      `select updated_at > '2001-01-01' as fresh from wallets where user_id = '${ADAM}'`,
    );
    expect(w).toEqual({ fresh: true });
  });
});

describe('row-level security', () => {
  for (const table of TABLES) {
    const owner = table === 'profiles' ? 'id' : 'user_id';

    it(`${table}: a signed-in user sees only their own rows`, async () => {
      const seen = await as(ADAM, () => rows(`select ${owner} as owner from ${table}`));
      expect(seen).toEqual([{ owner: ADAM }]);
    });

    it(`${table}: a user can't change someone else's rows`, async () => {
      const result = await as(ADAM, () =>
        run(`update ${table} set updated_at = now() where ${owner} = $1`, [OTHER]),
      );
      expect(result.affectedRows).toBe(0);
    });

    it(`${table}: a logged-out visitor can't read anything`, async () => {
      await expect(as(null, () => rows(`select * from ${table}`))).rejects.toThrow(
        /permission denied/,
      );
    });
  }

  it("a user can't create rows for someone else", async () => {
    await expect(
      as(ADAM, () =>
        rows(`insert into daily_activity (user_id, day) values ($1, '2026-11-03')`, [OTHER]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(ADAM, () =>
        rows(`insert into subject_progress (user_id, subject_id) values ($1, 'arabic')`, [OTHER]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("a user can't move their row to someone else", async () => {
    await expect(
      as(ADAM, () => rows(`update wallets set user_id = $1 where user_id = $2`, [OTHER, ADAM])),
    ).rejects.toThrow(/row-level security/);
  });

  it('a user can update their own rows and add their own activity', async () => {
    await as(ADAM, async () => {
      await rows(`update wallets set xp = 120, gold = 3 where user_id = $1`, [ADAM]);
      await rows(
        `insert into daily_activity (user_id, day, minutes, xp) values ($1, '2026-11-03', 16, 40)`,
        [ADAM],
      );
      await rows(
        `update profiles set display_name = 'Adam', time_zone = 'Asia/Jerusalem' where id = $1`,
        [ADAM],
      );
    });
    expect(await rows(`select xp, gold from wallets where user_id = $1`, [ADAM])).toEqual([
      { xp: 120, gold: 3 },
    ]);
    expect(
      await rows(`select count(*)::int as n from daily_activity where user_id = $1`, [ADAM]),
    ).toEqual([{ n: 2 }]);
  });

  it('nobody can delete rows through the API', async () => {
    const result = await as(ADAM, () =>
      run(`delete from daily_activity where user_id = $1`, [ADAM]).catch((e: Error) => e),
    );
    expect(result).toBeInstanceOf(Error);
    expect(String(result)).toMatch(/permission denied/);
  });
});

describe('constraints', () => {
  it('rejects negative currency and XP', async () => {
    await expect(rows(`update wallets set gold = -1 where user_id = $1`, [ADAM])).rejects.toThrow(
      /check/,
    );
    await expect(rows(`update wallets set xp = -1 where user_id = $1`, [ADAM])).rejects.toThrow(
      /check/,
    );
  });

  it('rejects malformed subject ids and impossible minutes', async () => {
    await expect(
      rows(`insert into subject_progress (user_id, subject_id) values ($1, 'Morse Code')`, [ADAM]),
    ).rejects.toThrow(/check/);
    await expect(
      rows(`insert into daily_activity (user_id, day, minutes) values ($1, '2026-11-04', 2000)`, [
        ADAM,
      ]),
    ).rejects.toThrow(/check/);
  });

  it('keeps the daily goal in a sensible range', async () => {
    await expect(
      rows(`update profiles set daily_goal_minutes = 1 where id = $1`, [ADAM]),
    ).rejects.toThrow(/check/);
  });

  it("removes all of a player's rows when the account is deleted", async () => {
    await rows(`delete from auth.users where id = $1`, [OTHER]);
    for (const table of TABLES) {
      const owner = table === 'profiles' ? 'id' : 'user_id';
      expect(await rows(`select 1 from ${table} where ${owner} = $1`, [OTHER])).toEqual([]);
    }
  });
});
