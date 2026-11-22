import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// What the guide has shown each player (task 6.2, #407; docs/game/the-guide.md §4).
const root = join(import.meta.dirname, '..');
const shim = readFileSync(join(import.meta.dirname, 'supabase-shim.sql'), 'utf8');
const migrations = readdirSync(join(root, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(root, 'migrations', f), 'utf8'));

const A = '00000000-0000-0000-0000-0000000000a1';
const B = '00000000-0000-0000-0000-0000000000b2';

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

const seen = async (who: string) =>
  (await as(who, `select guide_seen from profiles where id = '${who}'`)) as string[];
const mark = (who: string, ids: string[]) => as(who, 'select guide_mark($1)', [ids]);

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

describe('guide_seen', () => {
  it('starts empty for a new player', async () => {
    expect(await seen(A)).toEqual([]);
  });

  it('adds ids once each, and keeps what was there (another device)', async () => {
    await mark(A, ['welcome', 'intro:board']);
    await mark(A, ['intro:board', 'card:market']);
    expect(await seen(A)).toEqual(['card:market', 'intro:board', 'welcome']);
  });

  it('marks only the signed-in player', async () => {
    await mark(A, ['welcome']);
    expect(await seen(B)).toEqual([]);
  });

  it("can't be written from the browser, only through guide_mark", async () => {
    await expect(as(A, `update profiles set guide_seen = '{x}' where id = '${A}'`)).rejects.toThrow(
      /permission denied/,
    );
  });

  it("another player can't read it", async () => {
    await mark(A, ['welcome']);
    expect(await as(B, `select guide_seen from profiles where id = '${A}'`)).toBeUndefined();
  });

  it('refuses an id that is not short and plain, and too many at once', async () => {
    await expect(mark(A, ['Welcome!'])).rejects.toThrow(/bad guide id/);
    await expect(mark(A, ['x'.repeat(65)])).rejects.toThrow(/bad guide id/);
    await expect(
      mark(
        A,
        Array.from({ length: 51 }, (_, i) => `id-${i}`),
      ),
    ).rejects.toThrow(/bad guide id/);
    expect(await seen(A)).toEqual([]);
  });

  it('holds at most 300 ids', async () => {
    for (let n = 0; n < 6; n++) {
      await mark(
        A,
        Array.from({ length: 50 }, (_, i) => `id-${n}-${i}`),
      );
    }
    await expect(mark(A, ['one-more'])).rejects.toThrow(/profiles_guide_seen_size/);
  });

  it('an empty list changes nothing, and a visitor who is not signed in is refused', async () => {
    await mark(A, []);
    expect(await seen(A)).toEqual([]);
    await db.exec('set role anon');
    try {
      await expect(run(`select guide_mark('{welcome}')`)).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec('reset role');
    }
  });
});

describe('players who were here before the guide', () => {
  it('have the welcome counted as seen by the migration; new accounts do not', async () => {
    // The migration ran before these accounts existed, so run its backfill again on purpose,
    // with A as an old player (XP) and B as a friend who never played.
    await db.query('update wallets set xp = 120 where user_id = $1', [A]);
    const backfill = migrations.find((m) => m.includes('guide_mark')) ?? '';
    const update = /update public\.profiles p set guide_seen[\s\S]*?;\n/.exec(backfill)?.[0];
    if (!update) throw new Error('the migration has no backfill');
    await db.exec(update);
    expect(await seen(A)).toEqual(['welcome']);
    expect(await seen(B)).toEqual([]);
  });
});
