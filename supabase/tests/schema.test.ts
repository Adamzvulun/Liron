import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { levelForXp, rewardsFor, xpForLevel } from '../../src/core/progress/economy.ts';
import { supabaseStore } from '../../src/core/progress/supabaseStore.ts';

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

describe('record_progress and save_subject_state (ADR 0019)', () => {
  const today = async (zone: string) => {
    const [r] = await rows(`select to_char((now() at time zone $1)::date, 'YYYY-MM-DD') as d`, [
      zone,
    ]);
    return (r as { d: string }).d;
  };

  it('adds XP and minutes to the subject, to today and to the wallet, in one call', async () => {
    await rows(`update profiles set time_zone = 'Asia/Jerusalem' where id = $1`, [ADAM]);
    await as(ADAM, async () => {
      await rows(`select record_progress('morse', 30, 4)`);
      await rows(`select record_progress('arabic', 10, 0)`);
      await rows(`select record_progress('morse', 0, 3)`);
    });
    const day = await today('Asia/Jerusalem');
    expect(
      await rows(
        `select subject_id, xp, minutes from subject_progress where user_id = $1 order by subject_id`,
        [ADAM],
      ),
    ).toEqual([
      { subject_id: 'arabic', xp: 10, minutes: 0 },
      { subject_id: 'morse', xp: 30, minutes: 7 },
    ]);
    expect(
      await rows(`select xp, minutes from daily_activity where user_id = $1 and day = $2::date`, [
        ADAM,
        day,
      ]),
    ).toEqual([{ xp: 40, minutes: 7 + (day === '2026-11-02' ? 5 : 0) }]);
    expect(await rows(`select xp from wallets where user_id = $1`, [ADAM])).toEqual([{ xp: 40 }]);
    // The other player is untouched.
    expect(await rows(`select xp from wallets where user_id = $1`, [OTHER])).toEqual([{ xp: 0 }]);
  });

  it('falls back to UTC when the profile has an unknown time zone', async () => {
    await rows(`update profiles set time_zone = 'Not/AZone' where id = $1`, [ADAM]);
    await as(ADAM, () => rows(`select record_progress('morse', 5, 1)`));
    const day = await today('UTC');
    expect(
      await rows(`select xp from daily_activity where user_id = $1 and day = $2::date`, [
        ADAM,
        day,
      ]),
    ).toEqual([{ xp: 5 }]);
  });

  it('rejects empty, negative and absurd amounts', async () => {
    for (const [xp, minutes] of [
      [0, 0],
      [-1, 0],
      [0, -1],
      [10001, 0],
      [0, 241],
    ]) {
      await expect(
        as(ADAM, () => rows(`select record_progress('morse', $1, $2)`, [xp, minutes])),
      ).rejects.toThrow(/invalid amounts/);
    }
  });

  it('rejects malformed subject ids', async () => {
    await expect(
      as(ADAM, () => rows(`select record_progress('Morse Code', 5, 0)`)),
    ).rejects.toThrow(/check/);
  });

  it('saves only the subject state, replacing the previous one', async () => {
    await as(ADAM, async () => {
      await rows(`select save_subject_state('morse', '{"koch": 3}')`);
      await rows(`select save_subject_state('morse', '{"koch": 4}')`);
      await rows(`select save_subject_state('new-subject', '{"a": 1}')`);
    });
    expect(
      await rows(
        `select subject_id, xp, state from subject_progress where user_id = $1 order by subject_id`,
        [ADAM],
      ),
    ).toEqual([
      { subject_id: 'morse', xp: 0, state: { koch: 4 } },
      { subject_id: 'new-subject', xp: 0, state: { a: 1 } },
    ]);
    await expect(as(ADAM, () => rows(`select save_subject_state('morse', '[1]')`))).rejects.toThrow(
      /JSON object/,
    );
  });

  it('only works for signed-in users', async () => {
    await expect(as(null, () => rows(`select record_progress('morse', 5, 0)`))).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(null, () => rows(`select save_subject_state('morse', '{}')`))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('supabaseStore against the real functions', () => {
  // Just enough of supabase-js for supabaseStore: rpc() calls the function with named
  // arguments (as PostgREST does), from().select().eq().maybeSingle() reads one row.
  const fakeClient = {
    async rpc(fn: string, args: Record<string, unknown>) {
      const names = Object.keys(args);
      const call = names.map((n, i) => `${n} => $${i + 1}`).join(', ');
      try {
        const [r] = await rows(`select public.${fn}(${call}) as result`, Object.values(args));
        return { data: (r as { result: unknown }).result, error: null };
      } catch (e) {
        return { error: { message: (e as Error).message } };
      }
    },
    from: (table: string) => ({
      select: (cols: string) => {
        const one = async (where = '', params: unknown[] = []) => {
          const found = await rows(`select ${cols} from public.${table} ${where}`, params);
          return { data: found[0] ?? null, error: null };
        };
        return {
          maybeSingle: () => one(),
          eq: (col: string, value: string) => ({
            maybeSingle: () => one(`where ${col} = $1`, [value]),
          }),
        };
      },
    }),
  } as unknown as SupabaseClient;

  it('records, sums and saves state for the signed-in user', async () => {
    await as(ADAM, async () => {
      const store = supabaseStore(fakeClient);
      expect(await store.loadState('morse')).toBeNull(); // row exists, state never saved
      expect(await store.record('morse', 12, 2)).toEqual({
        xp: 12,
        gold: 2,
        gems: 0,
        xpEarned: 12,
        goldEarned: 2,
        gemsEarned: 0,
        levelBefore: 1,
        level: 1,
      });
      expect(await store.wallet()).toEqual({ xp: 12, gold: 2, gems: 0 });
      await store.saveState('morse', { koch: 2 });
      expect(await store.summary('morse')).toEqual({ xp: 12, minutes: 2 });
      expect(await store.loadState('morse')).toEqual({ koch: 2 });
      expect(await store.summary('arabic')).toEqual({ xp: 0, minutes: 0 });
      await expect(store.record('morse', 0, 0)).rejects.toThrow(/Couldn't save morse progress/);
    });
  });
});

describe('levels and rewards (ADR 0020)', () => {
  it('the database curve matches src/core/progress/economy.ts', async () => {
    const xps = [0, 1, 19, 20, 21, 49, 50, 139, 140, 539, 540, 2089, 2090, 12740, 50489, 50490];
    for (let l = 1; l <= 300; l += 7) xps.push(xpForLevel(l) - 1, xpForLevel(l));
    const [r] = await rows(
      `select array_agg(public.level_for_xp(x) order by i) as levels
         from unnest($1::bigint[]) with ordinality as t(x, i)`,
      [xps],
    );
    expect((r as { levels: number[] }).levels).toEqual(xps.map(levelForXp));
  });

  it('pays gold and gems exactly as rewardsFor says, and reports the level-up', async () => {
    const steps = [15, 5, 120, 10000, 3, 400];
    let before = 0;
    let gold = 0;
    let gems = 0;
    for (const xp of steps) {
      const [r] = await as(ADAM, () =>
        rows(`select record_progress('morse', $1, 0) as result`, [xp]),
      );
      const earned = rewardsFor(before, before + xp);
      gold += earned.gold;
      gems += earned.gems;
      expect((r as { result: unknown }).result).toEqual({
        xp: before + xp,
        gold,
        gems,
        xp_earned: xp,
        gold_earned: earned.gold,
        gems_earned: earned.gems,
        level_before: levelForXp(before),
        level: levelForXp(before + xp),
      });
      before += xp;
    }
    expect(await rows(`select xp, gold, gems from wallets where user_id = $1`, [ADAM])).toEqual([
      { xp: before, gold, gems },
    ]);
  });

  it('reaching level 5 from scratch pays 98 gold and a gem', async () => {
    const [r] = await as(ADAM, () => rows(`select record_progress('arabic', 140, 0) as result`));
    expect((r as { result: Record<string, number> }).result).toMatchObject({
      level_before: 1,
      level: 5,
      gold_earned: 98,
      gems_earned: 1,
    });
  });
});
