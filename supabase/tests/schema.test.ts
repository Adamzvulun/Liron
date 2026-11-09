import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  addDays,
  dailyChest,
  levelForXp,
  STREAK_GEM_EVERY,
  rewardsFor,
  streakFrom,
  xpForLevel,
} from '../../src/core/progress/economy.ts';
import { subjectApi } from '../../src/core/progress/subjectApi.ts';
import { supabaseStore } from '../../src/core/progress/supabaseStore.ts';
import { loadPrivatePack } from '../../src/core/content/privateContent.ts';

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
const TABLES = [
  'profiles',
  'wallets',
  'daily_activity',
  'subject_progress',
  'review_cards',
  'review_log',
  'skill_ratings',
  'item_ratings',
  'rating_log',
] as const;
const APPEND_ONLY: readonly string[] = ['review_log', 'rating_log'];
// Written only by the database functions (security review, 2026-11-04).
const FUNCTIONS_ONLY: readonly string[] = ['wallets', 'daily_activity', 'subject_progress'];

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
    await db.query(
      `insert into review_cards (user_id, subject_id, item_id, due, state, card)
       values ($1, 'morse', 'char:E', now(), 0, '{}')`,
      [id],
    );
    await db.query(
      `insert into review_log (user_id, subject_id, item_id, rating, reviewed_at, log)
       values ($1, 'morse', 'char:E', 3, now(), '{}')`,
      [id],
    );
    await db.query(
      `insert into skill_ratings (user_id, subject_id, skill, rating, rd, volatility, games, rated_at)
       values ($1, 'morse', 'receive', 1000, 350, 0.06, 0, now())`,
      [id],
    );
    await db.query(
      `insert into item_ratings
         (user_id, subject_id, skill, item_id, rating, rd, volatility, games, rated_at)
       values ($1, 'morse', 'receive', 'char:E', 1000, 350, 0.06, 0, now())`,
      [id],
    );
    await db.query(
      `insert into rating_log
         (user_id, subject_id, skill, item_id, score, rated_at, learner_rating, item_rating)
       values ($1, 'morse', 'receive', 'char:E', 1, now(), 1000, 1000)`,
      [id],
    );
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
      if (APPEND_ONLY.includes(table)) {
        // Append-only: nobody can change any row, their own included.
        await expect(
          as(ADAM, () => run(`update ${table} set item_id = 'x' where user_id = $1`, [OTHER])),
        ).rejects.toThrow(/permission denied/);
        return;
      }
      if (FUNCTIONS_ONLY.includes(table)) {
        await expect(
          as(ADAM, () => run(`update ${table} set updated_at = now() where user_id = $1`, [OTHER])),
        ).rejects.toThrow(/permission denied/);
        return;
      }
      const column = table === 'profiles' ? 'display_name' : 'updated_at';
      const value = table === 'profiles' ? `'x'` : 'now()';
      const result = await as(ADAM, () =>
        run(`update ${table} set ${column} = ${value} where ${owner} = $1`, [OTHER]),
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
    ).rejects.toThrow(/permission denied|row-level security/);
    await expect(
      as(ADAM, () =>
        rows(`insert into subject_progress (user_id, subject_id) values ($1, 'arabic')`, [OTHER]),
      ),
    ).rejects.toThrow(/permission denied|row-level security/);
  });

  it("a user can't move their row to someone else", async () => {
    await expect(
      as(ADAM, () => rows(`update wallets set user_id = $1 where user_id = $2`, [OTHER, ADAM])),
    ).rejects.toThrow(/permission denied|row-level security/);
  });

  it('a user edits only their own name and look; rewards go through the functions', async () => {
    await as(ADAM, async () => {
      await rows(`update profiles set display_name = 'Adam', avatar = '{}' where id = $1`, [ADAM]);
      for (const sql of [
        `update wallets set xp = 120, gold = 999999 where user_id = '${ADAM}'`,
        `insert into daily_activity (user_id, day, minutes, xp) values ('${ADAM}', '2026-11-03', 16, 40)`,
        `update daily_activity set goal_reached = false where user_id = '${ADAM}'`,
        `update subject_progress set xp = 99999 where user_id = '${ADAM}'`,
        `update profiles set time_zone = 'Asia/Jerusalem' where id = '${ADAM}'`,
        `update profiles set daily_goal_minutes = 5 where id = '${ADAM}'`,
        `insert into daily_chests (user_id, day, gold, gems) values ('${ADAM}', '2026-11-03', 0, 0)`,
      ]) {
        await expect(rows(sql), sql).rejects.toThrow(/permission denied/);
      }
    });
    expect(await rows(`select display_name from profiles where id = $1`, [ADAM])).toEqual([
      { display_name: 'Adam' },
    ]);
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
    ).rejects.toThrow(/unknown subject/);
  });

  it('takes only subjects that exist', async () => {
    for (const fn of [
      `record_progress('zzz-fake', 10000, 0)`,
      `save_subject_state('zzz-fake', '{}')`,
    ]) {
      await expect(as(ADAM, () => rows(`select ${fn}`))).rejects.toThrow(/unknown subject/);
    }
  });

  it('counts at most 3,000 XP a day', async () => {
    const [a] = await as(ADAM, () => rows(`select record_progress('morse', 2500, 0) as r`));
    const [b] = await as(ADAM, () => rows(`select record_progress('arabic', 2500, 0) as r`));
    const [c] = await as(ADAM, () => rows(`select record_progress('arabic', 100, 5) as r`));
    expect((a as { r: { xp_earned: number } }).r.xp_earned).toBe(2500);
    expect((b as { r: { xp_earned: number } }).r.xp_earned).toBe(500);
    expect((c as { r: { xp_earned: number; xp: number } }).r).toMatchObject({
      xp_earned: 0,
      xp: 3000,
    });
  });

  it('saves only the subject state, replacing the previous one', async () => {
    await as(ADAM, async () => {
      await rows(`select save_subject_state('morse', '{"koch": 3}')`);
      await rows(`select save_subject_state('morse', '{"koch": 4}')`);
      await rows(`select save_subject_state('arabic', '{"a": 1}')`);
    });
    expect(
      await rows(
        `select subject_id, xp, state from subject_progress where user_id = $1 order by subject_id`,
        [ADAM],
      ),
    ).toEqual([
      { subject_id: 'arabic', xp: 0, state: { a: 1 } },
      { subject_id: 'morse', xp: 0, state: { koch: 4 } },
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
  // A small PostgREST stand-in: select with eq / in / lte / order / limit, then
  // maybeSingle() or await for all rows.
  from: (table: string) => {
    const where: string[] = [];
    const params: unknown[] = [];
    let cols = '*';
    let tail = '';
    const run = async () =>
      rows(
        `select ${cols} from public.${table} ${where.length ? `where ${where.join(' and ')}` : ''} ${tail}`,
        params,
      );
    const q = {
      select(c: string) {
        cols = c;
        return q;
      },
      eq(col: string, v: unknown) {
        params.push(v);
        where.push(`${col} = $${params.length}`);
        return q;
      },
      in(col: string, vs: unknown[]) {
        params.push(vs);
        where.push(`${col} = any($${params.length})`);
        return q;
      },
      lte(col: string, v: unknown) {
        params.push(v);
        where.push(`${col} <= $${params.length}`);
        return q;
      },
      order(col: string) {
        tail += ` order by ${col}`;
        return q;
      },
      limit(n: number) {
        tail += ` limit ${n}`;
        return q;
      },
      range(from: number, to: number) {
        tail += ` offset ${from} limit ${to - from + 1}`;
        return q;
      },
      async maybeSingle() {
        return { data: (await run())[0] ?? null, error: null };
      },
      then<T>(
        resolve: (r: { data: unknown[]; error: null }) => T,
        reject: (e: unknown) => unknown,
      ) {
        return run().then((data) => resolve({ data, error: null }), reject);
      },
    };
    return q;
  },
} as unknown as SupabaseClient;

describe('supabaseStore against the real functions', () => {
  it('records reviews and finds due items through the real functions (ADR 0022)', async () => {
    await as(ADAM, async () => {
      const morse = subjectApi({ id: 'morse' }, supabaseStore(fakeClient));
      const t0 = new Date(Date.now() - 3 * 86_400_000); // three days ago
      await morse.recordReview('char:K', 'again', t0);
      await morse.recordReview('char:M', 'easy', t0);
      await morse.recordReview('char:K', 'good', new Date(t0.getTime() + 60_000));
      const status = await morse.reviewStatus(['char:K', 'char:M', 'char:X']);
      expect([...status.keys()].sort()).toEqual(['char:K', 'char:M']);
      expect(status.get('char:K')).toMatchObject({ reps: 2 });
      const due = await morse.dueItems();
      expect(due.map((d) => d.itemId)).toContain('char:K');
      const times = due.map((d) => d.due.getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
    });
    expect(
      await rows(
        `select item_id, rating from review_log where user_id = $1 and item_id <> 'char:E' order by id`,
        [ADAM],
      ),
    ).toEqual([
      { item_id: 'char:K', rating: 1 },
      { item_id: 'char:M', rating: 4 },
      { item_id: 'char:K', rating: 3 },
    ]);
  });

  it('records, sums and saves state for the signed-in user', async () => {
    await as(ADAM, async () => {
      const store = supabaseStore(fakeClient);
      expect(await store.loadState('morse')).toBeNull(); // row exists, state never saved
      expect(await store.record('morse', 12, 2)).toMatchObject({
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

describe('save_session: one save per session (ADR 0031)', () => {
  const SESSION = '5e5510a0-0000-4000-8000-000000000001';
  const report = (sessionId = SESSION) => ({
    state: { runs: 1 },
    reviews: [
      { itemId: 'char:K', grade: 'good' as const },
      { itemId: 'char:K', grade: 'good' as const },
    ],
    results: [
      { skill: 'receive', itemId: 'char:K', score: 1 },
      { skill: 'receive', itemId: 'char:M', score: 0 },
    ],
    xp: 12,
    minutes: 3,
    sessionId,
  });
  const counts = async () =>
    (
      await rows(
        `select
           (select count(*)::int from review_log where user_id = $1 and item_id = 'char:K') as reviews,
           (select count(*)::int from rating_log where user_id = $1 and item_id in ('char:K', 'char:M')) as results,
           (select xp from wallets where user_id = $1) as xp,
           (select state from subject_progress where user_id = $1 and subject_id = 'morse') as state`,
        [ADAM],
      )
    )[0];

  it('saves the whole session through subjectApi in one call', async () => {
    const calls: string[] = [];
    const client = {
      ...fakeClient,
      rpc: (fn: string, args: object) => {
        calls.push(fn);
        return fakeClient.rpc(fn, args);
      },
    } as unknown as SupabaseClient;
    await as(ADAM, () => subjectApi({ id: 'morse' }, supabaseStore(client)).saveSession(report()));
    expect(calls).toEqual(['save_session']);
    expect(await counts()).toEqual({ reviews: 2, results: 2, xp: 12, state: { runs: 1 } });
    const card = await rows(
      `select card->>'reps' as reps from review_cards where user_id = $1 and item_id = 'char:K'`,
      [ADAM],
    );
    expect(card).toEqual([{ reps: '2' }]);
  });

  it('applies a session id once', async () => {
    const morse = () => subjectApi({ id: 'morse' }, supabaseStore(fakeClient));
    await as(ADAM, () => morse().saveSession(report()));
    await as(ADAM, () => morse().saveSession(report()));
    expect(await counts()).toEqual({ reviews: 2, results: 2, xp: 12, state: { runs: 1 } });
    // Another player may use the same id: ids are per player.
    await as(OTHER, () => morse().saveSession(report()));
    expect(await rows(`select xp from wallets where user_id = $1`, [OTHER])).toEqual([{ xp: 12 }]);
  });

  it('saves nothing when any part fails', async () => {
    const bad = `select save_session('morse', $1, '{"runs": 9}', $2, '[]', 12, 3) as r`;
    const reviews = JSON.stringify([
      {
        item: 'char:K',
        rating: 3,
        reviewed_at: new Date().toISOString(),
        due: new Date().toISOString(),
        state: 1,
        card: {},
        log: {},
      },
      // A review dated far in the future is refused by record_review.
      {
        item: 'char:M',
        rating: 3,
        reviewed_at: '2099-01-01T00:00:00Z',
        due: new Date().toISOString(),
        state: 1,
        card: {},
        log: {},
      },
    ]);
    await expect(as(ADAM, () => rows(bad, [SESSION, reviews]))).rejects.toThrow(/future/);
    expect(await counts()).toMatchObject({ reviews: 0, results: 0, state: {} });
    // Nothing was recorded for the id either, so the session can be sent again.
    expect(await rows(`select count(*)::int as n from saved_sessions`)).toEqual([{ n: 0 }]);
  });

  it('refuses the signed-out, unknown subjects and oversized sessions', async () => {
    const call = (subject: string, reviews = '[]') =>
      rows(`select save_session($1, $2, null, $3::jsonb, '[]', 0, 0)`, [subject, SESSION, reviews]);
    await expect(as(null, () => call('morse'))).rejects.toThrow(/permission denied/);
    await expect(as(ADAM, () => call('chess'))).rejects.toThrow();
    const many = JSON.stringify(Array.from({ length: 201 }, () => ({})));
    await expect(as(ADAM, () => call('morse', many))).rejects.toThrow(/at most 200/);
    await expect(as(ADAM, () => rows(`select * from saved_sessions`))).rejects.toThrow(
      /permission denied/,
    );
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
    const steps = [15, 5, 120, 2000, 3, 400];
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
      expect((r as { result: unknown }).result).toMatchObject({
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

describe('daily goal and streak (ADR 0021)', () => {
  type Json = Record<string, unknown>;
  const one = async (sql: string, params: unknown[] = []) =>
    ((await as(ADAM, () => rows(`select ${sql} as r`, params)))[0] as { r: Json }).r;
  const today = async () => (await one('public.player_today()::text')) as unknown as string;
  /** Adam's goal days, as offsets from today (0 = today, 1 = yesterday, ...). */
  const goalDays = async (offsets: number[]) => {
    const t = await today();
    await rows(`delete from daily_activity where user_id = $1`, [ADAM]);
    for (const o of offsets) {
      await rows(
        `insert into daily_activity (user_id, day, minutes, goal_reached) values ($1, $2, 15, true)`,
        [ADAM, addDays(t, -o)],
      );
    }
    return t;
  };

  beforeEach(() => rows(`delete from daily_activity where user_id = $1`, [ADAM]));

  it('reaching the goal pays the chest once, and reports today', async () => {
    const first = await one(`record_progress('morse', 0, 10)`);
    expect(first.today).toMatchObject({ minutes: 10, goal_minutes: 15, goal_reached_now: false });
    const second = await one(`record_progress('morse', 0, 5)`);
    expect(second.today).toMatchObject({
      minutes: 15,
      goal_reached: true,
      goal_reached_now: true,
      streak: 1,
      chest_gold: dailyChest(1).gold,
      chest_gems: dailyChest(1).gems,
    });
    expect(second.gold).toBe(dailyChest(1).gold);
    const third = await one(`record_progress('morse', 0, 5)`);
    expect(third.today).toMatchObject({ goal_reached_now: false, chest_gold: 0, streak: 1 });
    expect(third.gold).toBe(dailyChest(1).gold);
  });

  it('the streak matches streakFrom in src/core/progress/economy.ts', async () => {
    const patterns = [
      [],
      [0],
      [1],
      [0, 1, 2],
      [1, 2, 3],
      [2, 3],
      [0, 2, 3],
      [1, 3],
      [0, 1, 2, 3, 4, 5, 6, 8],
    ];
    for (const offsets of patterns) {
      const t = await goalDays(offsets);
      const expected = streakFrom(
        offsets.map((o) => addDays(t, -o)),
        t,
      );
      expect([offsets, await one('public.current_streak()')]).toEqual([offsets, expected]);
    }
  });

  // The chest's numbers come from economy.ts, so changing them there alone fails here (review:
  // the SQL had its own 20 and 7 that no test compared).
  it('the 7th day of a streak puts a gem in the chest', async () => {
    await goalDays(Array.from({ length: STREAK_GEM_EVERY - 1 }, (_, i) => i + 1));
    const r = await one(`record_progress('arabic', 0, 15)`);
    const chest = dailyChest(STREAK_GEM_EVERY);
    expect(chest.gems).toBe(1);
    expect(r.today).toMatchObject({
      streak: STREAK_GEM_EVERY,
      chest_gold: chest.gold,
      chest_gems: chest.gems,
    });
  });

  it('changing the goal never rewrites past days; lowering it can reach today', async () => {
    await goalDays([1, 2]);
    await one(`record_progress('morse', 0, 6)`);
    let r = await one('set_daily_goal(60)');
    expect(r).toMatchObject({ goal_minutes: 60, goal_reached: false, streak: 2 });
    r = await one('set_daily_goal(5)');
    expect(r).toMatchObject({ goal_reached_now: true, streak: 3, chest_gold: dailyChest(3).gold });
    expect(r.wallet).toEqual({ xp: 0, gold: dailyChest(3).gold, gems: 0 });
    await expect(one('set_daily_goal(1)')).rejects.toThrow(/check/);
  });

  it('a missed day resets the streak', async () => {
    await goalDays([2, 3, 4]);
    expect(await one('today_status()')).toMatchObject({ streak: 0, minutes: 0 });
  });

  it('accepts real time zones only', async () => {
    await one(`set_time_zone('Asia/Jerusalem')`);
    expect(await rows(`select time_zone from profiles where id = $1`, [ADAM])).toEqual([
      { time_zone: 'Asia/Jerusalem' },
    ]);
    await expect(one(`set_time_zone('Mars/Olympus')`)).rejects.toThrow(/unknown time zone/);
  });

  it('changes the time zone at most once every 20 hours, so zone-hopping pays no extra chest', async () => {
    await one(`set_time_zone('Pacific/Kiritimati')`);
    await one(`set_time_zone('Etc/GMT+12')`);
    expect(await rows(`select time_zone from profiles where id = $1`, [ADAM])).toEqual([
      { time_zone: 'Pacific/Kiritimati' },
    ]);
  });

  it('only works for signed-in users', async () => {
    for (const fn of ['today_status()', 'check_daily_goal()', 'set_daily_goal(20)']) {
      await expect(as(null, () => rows(`select ${fn}`))).rejects.toThrow(/permission denied/);
    }
  });
});

describe('spaced repetition tables (ADR 0022)', () => {
  it('the review log is append-only', async () => {
    const upd = await as(ADAM, () =>
      run(`update review_log set rating = 4 where user_id = $1`, [ADAM]).catch((e: Error) => e),
    );
    expect(String(upd)).toMatch(/permission denied/);
  });

  it('record_review refuses future times, bad ratings and logged-out visitors', async () => {
    const call = (rating: number, at: string) =>
      rows(`select record_review('morse', 'k', $1, $2::timestamptz, now(), 1, '{}', '{}')`, [
        rating,
        at,
      ]);
    await expect(as(ADAM, () => call(3, '2999-01-01'))).rejects.toThrow(/future/);
    await expect(as(ADAM, () => call(5, new Date().toISOString()))).rejects.toThrow(/check/);
    await expect(as(null, () => call(3, new Date().toISOString()))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('skill ratings (ADR 0024)', () => {
  it('records results through the real function and reads them back', async () => {
    await as(ADAM, async () => {
      const morse = subjectApi(
        { id: 'morse', skills: ['receive', 'send'] },
        supabaseStore(fakeClient),
      );
      const at = new Date(Date.now() - 60_000);
      const first = await morse.recordResult('receive', 'char:K', 1, { at });
      await morse.recordResult('receive', 'char:K', 0, { at: new Date(at.getTime() + 1000) });
      await morse.recordResult('send', 'char:M', 1, { at, itemSeed: 1200 });
      expect(first.learner).toMatchObject({ games: 1, provisional: true }); // seeded row had 0
      const skills = await morse.skillRatings();
      expect(skills.get('receive')).toMatchObject({ games: 2 });
      expect(skills.get('send')).toMatchObject({ games: 1 });
      const items = await morse.itemRatings('receive', ['char:K', 'char:E', 'char:X']);
      expect([...items.keys()].sort()).toEqual(['char:E', 'char:K']);
      expect(items.get('char:K')).toMatchObject({ games: 2 });
      const send = await morse.itemRatings('send', ['char:M']);
      expect(send.get('char:M')?.rating).toBeLessThan(1200);
    });
    expect(
      await rows(
        `select skill, item_id, score from rating_log where user_id = $1 and item_id <> 'char:E'
         order by id`,
        [ADAM],
      ),
    ).toEqual([
      { skill: 'receive', item_id: 'char:K', score: 1 },
      { skill: 'receive', item_id: 'char:K', score: 0 },
      { skill: 'send', item_id: 'char:M', score: 1 },
    ]);
  });

  it('record_result refuses future times, bad numbers and logged-out visitors', async () => {
    const call = (score: number, at: string, rd = 200) =>
      rows(
        `select record_result('morse', 'receive', 'k', $1, $2::timestamptz,
           jsonb_build_object('rating', 1000, 'rd', $3::float8, 'volatility', 0.06, 'games', 1),
           '{"rating": 1000, "rd": 200, "volatility": 0.06, "games": 1}')`,
        [score, at, rd],
      );
    const now = new Date().toISOString();
    await expect(as(ADAM, () => call(1, '2999-01-01'))).rejects.toThrow(/future/);
    await expect(as(ADAM, () => call(2, now))).rejects.toThrow(/check/);
    await expect(as(ADAM, () => call(1, now, 400))).rejects.toThrow(/check/);
    await expect(as(null, () => call(1, now))).rejects.toThrow(/permission denied/);
  });
});

describe('private content (ADR 0023)', () => {
  beforeEach(async () => {
    await rows(
      `insert into content_items (subject_id, item_id, source, type, data)
       values ('arabic', 'pcav:0001', 'lingualism-pcav', 'vocab', '{"arabic": "حَياة"}')`,
    );
    await rows(
      `insert into storage.objects (bucket_id, name)
       values ('private-media', 'lingualism-pcav/pcav01-1.mp3')`,
    );
  });

  it('the licensee can read the text and the audio', async () => {
    expect(
      await as(ADAM, () =>
        rows(`select item_id from content_items where source = 'lingualism-pcav'`),
      ),
    ).toEqual([{ item_id: 'pcav:0001' }]);
    expect(await as(ADAM, () => rows(`select name from storage.objects`))).toEqual([
      { name: 'lingualism-pcav/pcav01-1.mp3' },
    ]);
  });

  it('other signed-in accounts, and anonymous sessions, read nothing (ADR 0011)', async () => {
    // OTHER signed up after the migration, so it isn't a licensee.
    expect(await as(OTHER, () => rows(`select item_id from content_items`))).toEqual([]);
    expect(await as(OTHER, () => rows(`select lesson_id from content_lessons`))).toEqual([]);
    expect(await as(OTHER, () => rows(`select name from storage.objects`))).toEqual([]);
    await rows(`select set_config('request.jwt.claims', '{"is_anonymous": true}', true)`);
    expect(await as(ADAM, () => rows(`select item_id from content_items`))).toEqual([]);
    await rows(`select set_config('request.jwt.claims', '', true)`);
    await expect(as(ADAM, () => rows(`select * from content_licensees`))).rejects.toThrow(
      /permission denied/,
    );
  });

  it('logged-out visitors get neither', async () => {
    await expect(as(null, () => rows(`select * from content_items`))).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(null, () => rows(`select * from content_lessons`))).rejects.toThrow(
      /permission denied/,
    );
    expect(await as(null, () => rows(`select name from storage.objects`))).toEqual([]);
  });

  it('nobody can change content through the API', async () => {
    for (const sql of [
      `update content_items set type = 'x'`,
      `insert into content_items (subject_id, item_id, source, type, data) values ('arabic', 'x', 's', 't', '{}')`,
      `delete from content_lessons`,
    ]) {
      await expect(as(ADAM, () => rows(sql))).rejects.toThrow(/permission denied/);
    }
  });

  it('loadPrivatePack reads items and lessons through the API, paging past 1,000', async () => {
    await rows(
      `insert into content_items (subject_id, item_id, source, type, data, tags)
       select 'arabic', 'pcav:' || lpad(n::text, 4, '0'), 'lingualism-pcav', 'vocab',
              jsonb_build_object('order', n), array['A1']
       from generate_series(2, 1201) n`,
    );
    await rows(
      `insert into content_lessons (subject_id, lesson_id, source, title, position, items)
       values ('arabic', 'pcav-section:01', 'lingualism-pcav', 'Life and Death', 1, '{pcav:0001}')`,
    );
    const pack = await as(ADAM, () => loadPrivatePack(fakeClient, 'arabic', 'lingualism-pcav'));
    expect(pack.items).toHaveLength(1201);
    expect(pack.items[0]).toEqual({
      id: 'pcav:0001',
      subject: 'arabic',
      type: 'vocab',
      data: { arabic: 'حَياة' },
      media: [],
      tags: [],
    });
    expect(pack.lessons).toEqual([
      {
        id: 'pcav-section:01',
        subject: 'arabic',
        title: 'Life and Death',
        order: 1,
        items: ['pcav:0001'],
        tags: [],
      },
    ]);
    await expect(
      as(null, () => loadPrivatePack(fakeClient, 'arabic', 'lingualism-pcav')),
    ).rejects.toThrow(/permission denied/);
  });

  it('the bucket is private', async () => {
    expect(await rows(`select public from storage.buckets where id = 'private-media'`)).toEqual([
      { public: false },
    ]);
  });
});

describe('the daily cap on speech checks (ADR 0011 #4, ADR 0014)', () => {
  const claim = async (userId: string | null) =>
    ((await as(userId, () => rows(`select claim_speech_check() as left`)))[0] as { left: number })
      .left;

  it('counts down from 100 a day and then refuses, taking nothing more', async () => {
    expect(await claim(ADAM)).toBe(99);
    expect(await claim(ADAM)).toBe(98);
    await rows(`update speech_checks set checks = 99 where user_id = $1`, [ADAM]);
    expect(await claim(ADAM)).toBe(0);
    expect(await claim(ADAM)).toBe(-1);
    expect(await claim(ADAM)).toBe(-1);
    expect(await rows(`select checks from speech_checks where user_id = $1`, [ADAM])).toEqual([
      { checks: 100 },
    ]);
  });

  it('starts again each UTC day', async () => {
    await rows(
      `insert into speech_checks (user_id, day, checks)
       values ($1, (now() at time zone 'utc')::date - 1, 100)`,
      [ADAM],
    );
    expect(await claim(ADAM)).toBe(99);
  });

  it('is for the signed-in licensee only, never anonymous sessions or logged-out visitors', async () => {
    await expect(claim(OTHER)).rejects.toThrow(/only the licensed learner/);
    await rows(`select set_config('request.jwt.claims', '{"is_anonymous": true}', true)`);
    await expect(claim(ADAM)).rejects.toThrow(/only the licensed learner/);
    await rows(`select set_config('request.jwt.claims', '', true)`);
    await expect(claim(null)).rejects.toThrow(/permission denied/);
  });

  it('nobody reads or writes the counts through the API', async () => {
    for (const sql of [
      `select * from speech_checks`,
      `insert into speech_checks (user_id, day, checks) values ('${ADAM}', '2026-01-01', 0)`,
      `delete from speech_checks`,
    ]) {
      await expect(as(ADAM, () => rows(sql))).rejects.toThrow(/permission denied/);
    }
  });
});

describe('daily contracts (ADR 0032)', () => {
  type Board = {
    day: string;
    contracts: {
      id: string;
      subject: string | null;
      progress: number;
      target: number;
      paid: boolean;
      gold: number;
    }[];
    paid_now: string[];
    gold: number;
  };
  const board = async (userId: string) =>
    ((await as(userId, () => rows(`select todays_contracts() as b`)))[0] as { b: Board }).b;
  const today = async (userId: string) =>
    ((await as(userId, () => rows(`select player_today()::text as d`)))[0] as { d: string }).d;
  let n = 0;
  const save = (subject: string, events: unknown[], xp = 0, minutes = 0) =>
    as(ADAM, async () => {
      n += 1;
      const id = `c0c0c0c0-0000-4000-8000-${String(n).padStart(12, '0')}`;
      return (
        (
          await rows(`select save_session($1, $2, null, '[]', '[]', $3, $4, $5::jsonb) as r`, [
            subject,
            id,
            xp,
            minutes,
            JSON.stringify(events),
          ])
        )[0] as { r: { award: { gold: number } | null; contracts_paid: string[] } }
      ).r;
    });
  /** Sets today's contracts by hand, so a test knows what it has to do. */
  const setBoard = async (ids: string[]) => {
    const day = await today(ADAM);
    for (const [i, id] of ids.entries())
      await rows(
        `insert into daily_contracts (user_id, day, template_id, slot) values ($1, $2, $3, $4)`,
        [ADAM, day, id, i + 1],
      );
  };
  const gold = async () =>
    ((await rows(`select gold from wallets where user_id = $1`, [ADAM]))[0] as { gold: number })
      .gold;

  it('holds exactly the templates in content/', async () => {
    const files = ['core', 'morse', 'arabic'].map(
      (s) =>
        JSON.parse(readFileSync(join(root, '..', 'content', s, 'contracts.json'), 'utf8')) as {
          subject: string;
          items: { id: string; data: Record<string, unknown> }[];
        },
    );
    const want = files
      .flatMap((f) =>
        f.items.map((i) => ({
          id: i.id,
          subject_id: f.subject === 'core' ? null : f.subject,
          metric: i.data.metric,
          kind: i.data.kind ?? null,
          target: i.data.target,
          gold: i.data.gold,
          text: i.data.text,
          requires_kind: i.data.requires ?? null,
        })),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(await rows(`select * from contract_templates order by id`)).toEqual(want);
  });

  it('picks a habit and two contracts from the only subject started, the same all day', async () => {
    const first = await board(ADAM);
    expect(first.contracts.map((c) => c.subject)).toEqual([null, 'morse', 'morse']);
    expect(first.contracts[0]?.id).not.toBe('habit-subjects');
    expect(first.contracts.every((c) => c.progress === 0 && !c.paid)).toBe(true);
    // Starting a second subject later in the day doesn't reshuffle the board.
    await rows(`insert into subject_progress (user_id, subject_id) values ($1, 'arabic')`, [ADAM]);
    expect((await board(ADAM)).contracts.map((c) => c.id)).toEqual(
      first.contracts.map((c) => c.id),
    );
  });

  it('offers a drill’s contracts only once the drill was played on an earlier day', async () => {
    const day0 = await today(ADAM);
    const picked = async (from: number, to: number) => {
      const ids = new Set<string>();
      for (let d = from; d <= to; d += 1) {
        const day = addDays(day0, d);
        await rows(`select pick_contracts($1, $2::date)`, [ADAM, day]);
        for (const r of (await rows(
          `select template_id from daily_contracts where user_id = $1 and day = $2::date`,
          [ADAM, day],
        )) as { template_id: string }[])
          ids.add(r.template_id);
      }
      return ids;
    };
    const drill = (ids: Set<string>) =>
      [...ids].filter((id) => id.startsWith('morse-words') || id.startsWith('morse-rush')).sort();
    const before = await picked(1, 40);
    expect(before.has('morse-runs')).toBe(true);
    expect(drill(before)).toEqual([]);
    // A Codebook round on day 50 opens the Codebook's contracts from day 51, not the rush's.
    await rows(
      `insert into subject_events (user_id, day, subject_id, kind, count)
       values ($1, $2::date, 'morse', 'words-round', 1)`,
      [ADAM, addDays(day0, 50)],
    );
    expect(drill(await picked(41, 50))).toEqual([]);
    const after = drill(await picked(51, 90));
    expect(after.length).toBeGreaterThan(0);
    expect(after.every((id) => id.startsWith('morse-words'))).toBe(true);
  });

  it('counts the drills’ events toward their contracts', async () => {
    await setBoard(['morse-words', 'morse-rush-fast']);
    await save('morse', [{ kind: 'words-round' }, { kind: 'rush-fast', count: 2 }]);
    expect((await save('morse', [{ kind: 'words-round' }])).contracts_paid).toEqual([
      'morse-words',
    ]);
    expect((await save('morse', [{ kind: 'rush-fast', count: 1 }])).contracts_paid).toEqual([
      'morse-rush-fast',
    ]);
  });

  it('picks one contract from each of two subjects started', async () => {
    await rows(`insert into subject_progress (user_id, subject_id) values ($1, 'arabic')`, [ADAM]);
    const subjects = (await board(ADAM)).contracts.map((c) => c.subject);
    expect(subjects[0]).toBeNull();
    expect(subjects.slice(1).sort()).toEqual(['arabic', 'morse']);
  });

  it('counts events from saved sessions, and pays a finished contract once', async () => {
    await setBoard(['habit-sessions', 'morse-runs', 'morse-run-90']);
    const before = await gold();
    await save('morse', [{ kind: 'run' }, { kind: 'run-90' }]);
    let b = await board(ADAM);
    expect(b.contracts.map((c) => [c.id, c.progress, c.paid])).toEqual([
      ['habit-sessions', 1, false],
      ['morse-runs', 1, false],
      ['morse-run-90', 1, true],
    ]);
    expect(await gold()).toBe(before + 20);
    // Paid in the save itself, so the board has nothing left to pay.
    expect(b.paid_now).toEqual([]);
    await save('morse', [{ kind: 'run' }, { kind: 'run-90' }]);
    const r = await save('morse', [{ kind: 'run', count: 1 }], 5, 1);
    expect(r.contracts_paid.sort()).toEqual(['habit-sessions', 'morse-runs']);
    expect(r.award?.gold).toBe(await gold());
    b = await board(ADAM);
    expect(b.contracts.every((c) => c.paid && c.progress === c.target)).toBe(true);
    // 20 + 10 + 15, and XP's own gold from the last save.
    const xpGold = (await gold()) - before - 45;
    expect(xpGold).toBeGreaterThanOrEqual(0);
    await save('morse', [{ kind: 'run' }, { kind: 'run-90' }]);
    expect(await gold()).toBe(before + 45 + xpGold);
  });

  it('counts minutes and subjects for habits, and pays when the board opens', async () => {
    await setBoard(['habit-minutes', 'habit-subjects']);
    await save('morse', [], 0, 0);
    expect((await save('arabic', [], 0, 0)).contracts_paid).toEqual(['habit-subjects']);
    // Minutes reached some other way (a single practice call) are paid when the board opens.
    await rows(
      `insert into daily_activity (user_id, day, minutes) values ($1, $2, 25)
       on conflict (user_id, day) do update set minutes = 25`,
      [ADAM, await today(ADAM)],
    );
    const b = await board(ADAM);
    expect(b.paid_now).toEqual(['habit-minutes']);
    expect(b.gold).toBe(await gold());
    expect((await board(ADAM)).paid_now).toEqual([]);
  });

  it('ignores unknown kinds, odd counts and other subjects’ kinds, and caps a day', async () => {
    await save('morse', [
      { kind: 'nonsense' },
      { kind: 'letters-90' },
      { kind: 'run', count: 0 },
      { kind: 'run', count: 1000 },
      { kind: 'run', count: 60 },
      { kind: 'run', count: 60 },
    ]);
    expect(
      await rows(`select kind, count from subject_events where user_id = $1 order by kind`, [ADAM]),
    ).toEqual([
      { kind: 'run', count: 100 },
      { kind: 'session', count: 1 },
    ]);
    await expect(
      save('morse', [{ kind: 'run' }].concat(Array(50).fill({ kind: 'run' }))),
    ).rejects.toThrow(/at most 200 reviews, 200 results and 50 events/);
  });

  it('writes only through the functions, and shows each player only their own', async () => {
    await board(ADAM);
    await save('morse', [{ kind: 'run' }]);
    expect(await as(OTHER, () => rows(`select * from daily_contracts`))).toEqual([]);
    expect(await as(OTHER, () => rows(`select * from subject_events`))).toEqual([]);
    expect((await as(ADAM, () => rows(`select * from daily_contracts`))).length).toBe(3);
    for (const sql of [
      `update daily_contracts set paid_gold = null`,
      `insert into subject_events (user_id, day, subject_id, kind, count) values ('${ADAM}', '2026-01-01', 'morse', 'run', 5)`,
      `select * from contract_templates`,
      `select * from subject_event_kinds`,
      `select claim_contracts('${ADAM}', '2026-01-01')`,
      `select pick_contracts('${ADAM}', '2026-01-01')`,
    ]) {
      await expect(as(ADAM, () => rows(sql))).rejects.toThrow(/permission denied/);
    }
    await expect(as(null, () => rows(`select todays_contracts()`))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('owned items, milestone gear and streak shields (ADR 0033, ADR 0034)', () => {
  type Status = {
    streak: number;
    streak_shields: number;
    shielded_days: number;
    goal_reached: boolean;
  };
  const status = async () =>
    ((await as(ADAM, () => rows(`select today_status() as s`)))[0] as { s: Status }).s;
  const day = async () =>
    ((await as(ADAM, () => rows(`select player_today()::text as d`)))[0] as { d: string }).d;
  /** Adam's goal days, as offsets from today (0 = today, 1 = yesterday, ...). */
  const goalDays = async (offsets: number[]) => {
    const t = await day();
    for (const o of offsets)
      await rows(
        `insert into daily_activity (user_id, day, minutes, goal_reached) values ($1, $2, 15, true)`,
        [ADAM, addDays(t, -o)],
      );
    return t;
  };
  const shields = (count: number) =>
    rows(`update wallets set streak_shields = $2 where user_id = $1`, [ADAM, count]);
  const owned = async () =>
    (
      (await as(ADAM, () => rows(`select item_id from owned_items order by item_id`))) as {
        item_id: string;
      }[]
    ).map((r) => r.item_id);
  const boardOpens = () => as(ADAM, () => rows(`select todays_contracts()`));

  beforeEach(() => rows(`delete from daily_activity where user_id = $1`, [ADAM]));

  it('holds exactly the catalogue in content/core/items.json', async () => {
    const pack = JSON.parse(
      readFileSync(join(root, '..', 'content', 'core', 'items.json'), 'utf8'),
    ) as { items: { id: string; data: Record<string, unknown> }[] };
    const want = pack.items
      .map((i) => ({
        id: i.id,
        kind: i.data.kind,
        slot: i.data.slot ?? null,
        rarity: i.data.rarity,
        price: i.data.price,
        milestone: i.data.milestone ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(await rows(`select * from items order by id`)).toEqual(want);
  });

  it('a shield covers a missed day: the streak lives on but the day adds nothing', async () => {
    const t = await goalDays([2, 3, 4]);
    await shields(1);
    expect(await status()).toMatchObject({ streak: 3, streak_shields: 0, shielded_days: 1 });
    expect(
      await rows(`select day::text, shielded from daily_activity where user_id = $1 and day = $2`, [
        ADAM,
        addDays(t, -1),
      ]),
    ).toEqual([{ day: addDays(t, -1), shielded: true }]);
    // Reading again uses nothing more.
    expect(await status()).toMatchObject({ streak: 3, streak_shields: 0, shielded_days: 1 });
  });

  it('uses no shield when there are too few for the gap, or no streak to keep', async () => {
    await goalDays([3, 4]);
    await shields(1);
    expect(await status()).toMatchObject({ streak: 0, streak_shields: 1, shielded_days: 0 });
    await rows(`delete from daily_activity where user_id = $1`, [ADAM]);
    expect(await status()).toMatchObject({ streak: 0, streak_shields: 1, shielded_days: 0 });
  });

  it('the streak with shielded days matches streakFrom in economy.ts', async () => {
    const t = await day();
    for (const [goals, shielded] of [
      [[0, 2], [1]],
      [[1, 3, 4], [2]],
      [
        [2, 5],
        [3, 4],
      ],
      [[0], [1, 2]],
    ] as const) {
      await rows(`delete from daily_activity where user_id = $1`, [ADAM]);
      await goalDays([...goals]);
      for (const o of shielded)
        await rows(`insert into daily_activity (user_id, day, shielded) values ($1, $2, true)`, [
          ADAM,
          addDays(t, -o),
        ]);
      const expected = streakFrom(
        goals.map((o) => addDays(t, -o)),
        t,
        shielded.map((o) => addDays(t, -o)),
      );
      const got = await as(ADAM, () => rows(`select current_streak() as s`));
      expect([goals, shielded, (got[0] as { s: number }).s]).toEqual([goals, shielded, expected]);
    }
  });

  it('gives milestone gear once its milestone is met, and only once', async () => {
    await boardOpens();
    expect(await owned()).toEqual([]);
    await rows(`update subject_progress set xp = 140 where user_id = $1 and subject_id = 'morse'`, [
      ADAM,
    ]);
    await goalDays([0, 1, 2, 3, 4, 5, 6]);
    await boardOpens();
    expect(await owned()).toEqual(['cloak', 'headset']);
    await boardOpens();
    expect(await owned()).toEqual(['cloak', 'headset']);
    // A trial passed is sent with the session save; the gear follows straight away.
    await as(ADAM, () =>
      rows(`select save_session('arabic', $1, null, '[]', '[]', 0, 0, $2::jsonb)`, [
        'c1c1c1c1-0000-4000-8000-000000000001',
        JSON.stringify([{ kind: 'trial-1' }, { kind: 'trial-1' }]),
      ]),
    );
    expect(await owned()).toEqual(['breeches', 'cloak', 'headset']);
    expect(
      await rows(`select count from subject_events where user_id = $1 and kind = 'trial-1'`, [
        ADAM,
      ]),
    ).toEqual([{ count: 1 }]);
  });

  it('only database functions write what a player owns, and each sees only their own', async () => {
    await rows(`insert into owned_items (user_id, item_id, source) values ($1, 'boots', 'chest')`, [
      ADAM,
    ]);
    expect(await as(OTHER, () => rows(`select * from owned_items`))).toEqual([]);
    for (const sql of [
      `insert into owned_items (user_id, item_id, source) values ('${OTHER}', 'cloak', 'chest')`,
      `update wallets set streak_shields = 2`,
      `update daily_activity set shielded = true`,
      `select * from items`,
      `select use_streak_shields('${ADAM}', '2026-01-01')`,
      `select grant_milestones('${ADAM}')`,
    ]) {
      await expect(as(OTHER, () => rows(sql))).rejects.toThrow(/permission denied/);
    }
    await expect(as(null, () => rows(`select today_status()`))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('reward chests (ADR 0033, #48)', () => {
  type Opened = {
    kind: string;
    gold: number;
    gems: number;
    item: string | null;
    item_gold: number;
    shield: boolean;
    shield_gold: number;
    already_open: boolean;
    wallet?: { gold: number; gems: number; streak_shields: number };
  };
  const day = async () =>
    ((await as(ADAM, () => rows(`select player_today()::text as d`)))[0] as { d: string }).d;
  const chests = async () =>
    (await as(ADAM, () =>
      rows(`select kind, source, source_key, opened_at is not null as opened from chests
            order by source, source_key`),
    )) as { kind: string; source: string; source_key: string; opened: boolean }[];
  const boardOpens = () => as(ADAM, () => rows(`select todays_contracts()`));
  const open = async (id: string, userId = ADAM) =>
    ((await as(userId, () => rows(`select open_chest($1) as o`, [id])))[0] as { o: Opened }).o;
  const wallet = async () =>
    (
      await rows(`select gold, gems, streak_shields from wallets where user_id = $1`, [ADAM])
    )[0] as { gold: number; gems: number; streak_shields: number };
  /** A chest of `kind` for Adam whose id makes roll `roll` fall below or above `chance`. */
  const chestWith = async (kind: string, roll: number, below: boolean, chance: number) => {
    for (let i = 0; i < 500; i++) {
      const id = `d0d0d0d0-0000-4000-8000-${String(i).padStart(12, '0')}`;
      const r = ((await rows(`select chest_roll($1, $2) as r`, [id, roll]))[0] as { r: number }).r;
      if (r < chance === below) {
        await rows(
          `insert into chests (id, user_id, kind, source, source_key) values ($1::uuid, $2, $3, 'trial', $1::text)`,
          [id, ADAM, kind],
        );
        return id;
      }
    }
    throw new Error('no such id in 500 tries');
  };

  beforeEach(() => rows(`delete from daily_activity where user_id = $1`, [ADAM]));

  it('holds exactly the drop tables in content/core/chests.json', async () => {
    const pack = JSON.parse(
      readFileSync(join(root, '..', 'content', 'core', 'chests.json'), 'utf8'),
    ) as { items: { id: string; type: string; data: Record<string, unknown> }[] };
    const drops = pack.items
      .filter((i) => i.type === 'chest')
      .map(({ id, data: d }) => {
        const [goldMin, goldMax] = d.gold as number[];
        const [gemsMin, gemsMax] = d.gems as number[];
        return {
          kind: id,
          name: d.name,
          gold_min: goldMin,
          gold_max: goldMax,
          gem_chance: d.gemChance,
          gems_min: gemsMin,
          gems_max: gemsMax,
          gear_chance: d.gearChance,
          shield_chance: d.shieldChance,
        };
      })
      .sort((a, b) => a.kind.localeCompare(b.kind));
    const got = (await rows(`select * from chest_drops order by kind`)) as Record<string, number>[];
    // Postgres reals: compare the chances to 6 places.
    const round = (r: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 1e6) : v]),
      );
    expect(got.map(round)).toEqual(drops.map(round));
    const sources = pack.items
      .filter((i) => i.type === 'chest-source')
      .map(({ id, data: d }) => ({ id, source: d.source, days: d.days ?? null, chest: d.chest }))
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(await rows(`select * from chest_sources order by id`)).toEqual(sources);
  });

  it('a day with all 3 contracts done gives a wooden chest, once', async () => {
    const t = await day();
    for (const [i, id] of ['habit-sessions', 'morse-runs', 'morse-run-90'].entries())
      await rows(
        `insert into daily_contracts (user_id, day, template_id, slot, paid_gold) values ($1, $2, $3, $4, $5)`,
        [ADAM, t, id, i + 1, i < 2 ? 10 : null],
      );
    await boardOpens();
    expect(await chests()).toEqual([]);
    await rows(`update daily_contracts set paid_gold = 20 where user_id = $1`, [ADAM]);
    await boardOpens();
    await boardOpens();
    expect(await chests()).toEqual([
      { kind: 'wooden', source: 'contracts', source_key: t, opened: false },
    ]);
  });

  it('each trial passed gives a brass chest, once', async () => {
    for (let i = 0; i < 2; i++)
      await as(ADAM, () =>
        rows(`select save_session('morse', $1, null, '[]', '[]', 0, 0, $2::jsonb)`, [
          `c2c2c2c2-0000-4000-8000-00000000000${i}`,
          JSON.stringify([{ kind: 'trial-1' }, { kind: 'trial-2' }]),
        ]),
      );
    expect(await chests()).toEqual([
      { kind: 'brass', source: 'trial', source_key: 'morse:1', opened: false },
      { kind: 'brass', source: 'trial', source_key: 'morse:2', opened: false },
    ]);
  });

  it('streak days 7 and 30 give a chest; a shielded day never does by itself', async () => {
    const t = await day();
    const goals = async (offsets: number[]) => {
      await rows(`delete from daily_activity where user_id = $1`, [ADAM]);
      for (const o of offsets)
        await rows(
          `insert into daily_activity (user_id, day, minutes, goal_reached) values ($1, $2, 15, true)`,
          [ADAM, addDays(t, -o)],
        );
    };
    await goals([0, 1, 2, 3, 4, 5]);
    await boardOpens();
    expect(await chests()).toEqual([]);
    await goals([0, 1, 2, 3, 4, 5, 6]);
    await boardOpens();
    await goals(Array.from({ length: 30 }, (_, i) => i));
    await boardOpens();
    // Sorted as text: "…:30" before "…:7".
    expect(await chests()).toEqual([
      { kind: 'jeweled', source: 'streak', source_key: `${t}:30`, opened: false },
      { kind: 'brass', source: 'streak', source_key: `${t}:7`, opened: false },
    ]);
  });

  it('opening rolls from the drop table, pays once, and the same chest always gives the same', async () => {
    await rows(`update wallets set gold = 0, gems = 0 where user_id = $1`, [ADAM]);
    const id = await chestWith('brass', 4, false, 0.4);
    const first = await open(id);
    expect(first.already_open).toBe(false);
    expect(first.gold).toBeGreaterThanOrEqual(40);
    expect(first.gold).toBeLessThanOrEqual(80);
    expect(first.item).toBeNull();
    const paid = first.gold + first.shield_gold;
    expect(await wallet()).toMatchObject({ gold: paid, gems: first.gems });
    expect(first.wallet).toMatchObject({ gold: paid, gems: first.gems });
    const again = await open(id);
    expect(again).toEqual({ ...first, wallet: again.wallet, already_open: true });
    expect(again.wallet).toBeUndefined();
    expect(await wallet()).toMatchObject({ gold: paid, gems: first.gems });
    expect(await chests()).toContainEqual(expect.objectContaining({ opened: true }));
  });

  it('gives gear not owned yet, or its price when all is owned; a 3rd shield is gold', async () => {
    await rows(`update wallets set gold = 0, streak_shields = 2 where user_id = $1`, [ADAM]);
    const allGear = (
      (await rows(`select id from items where kind = 'gear'`)) as { id: string }[]
    ).map((r) => r.id);
    const gear = await chestWith('jeweled', 4, true, 0.6);
    const opened = await open(gear);
    expect(allGear).toContain(opened.item);
    expect(opened.item_gold).toBe(0);
    expect(
      await rows(`select source from owned_items where user_id = $1 and item_id = $2`, [
        ADAM,
        opened.item,
      ]),
    ).toEqual([{ source: 'chest' }]);

    for (const item of allGear)
      await rows(
        `insert into owned_items (user_id, item_id, source) values ($1, $2, 'market') on conflict do nothing`,
        [ADAM, item],
      );
    await rows(`delete from chests where user_id = $1`, [ADAM]);
    const owned = await chestWith('jeweled', 4, true, 0.6);
    const second = await open(owned);
    expect(second.item_gold).toBeGreaterThan(0);

    await rows(`delete from chests where user_id = $1`, [ADAM]);
    const shield = await chestWith('jeweled', 6, true, 0.4);
    const third = await open(shield);
    expect(third).toMatchObject({ shield: true, shield_gold: 120 });
    expect((await wallet()).streak_shields).toBe(2);
  });

  it('only database functions grant chests, and only the owner sees or opens one', async () => {
    const id = await chestWith('wooden', 1, true, 1);
    expect(await as(OTHER, () => rows(`select * from chests`))).toEqual([]);
    await expect(open(id, OTHER)).rejects.toThrow(/no such chest/);
    for (const sql of [
      `insert into chests (user_id, kind, source, source_key) values ('${OTHER}', 'jeweled', 'trial', 'x')`,
      `update chests set opened_at = null`,
      `select * from chest_drops`,
      `select grant_chests('${OTHER}', '2026-01-01')`,
      `select chest_roll('${id}', 1)`,
    ]) {
      await expect(as(OTHER, () => rows(sql))).rejects.toThrow(/permission denied/);
    }
    await expect(as(null, () => rows(`select open_chest('${id}')`))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('the Market (ADR 0033, #49)', () => {
  type Ware = {
    id: string;
    kind: string;
    slot: string | null;
    price: number;
    owned: boolean;
    affordable: boolean;
  };
  const stall = async (userId = ADAM) =>
    (
      (await as(userId, () => rows(`select market_today() as m`)))[0] as {
        m: { day: string; wares: Ware[] };
      }
    ).m;
  const buy = async (id: string, userId = ADAM) =>
    (
      (await as(userId, () => rows(`select buy_item($1) as b`, [id])))[0] as {
        b: { item: string; wallet: { gold: number; gems: number; streak_shields: number } };
      }
    ).b;
  const gold = (n: number, shields = 0) =>
    rows(`update wallets set gold = $2, streak_shields = $3 where user_id = $1`, [
      ADAM,
      n,
      shields,
    ]);

  it('sells 4 wares a day, the same for everyone: 2 gear, 1 color, 1 functional', async () => {
    const m = await stall();
    expect(m.wares.map((w) => w.kind)).toEqual(['gear', 'gear', 'color', 'functional']);
    expect(new Set(m.wares.map((w) => w.id)).size).toBe(4);
    expect((await stall(OTHER)).wares.map((w) => w.id)).toEqual(m.wares.map((w) => w.id));
    // Another day, other wares (over a fortnight, the gear changes).
    const days = (await rows(
      `select distinct array_to_string(market_stock(current_date + n), ',') as s
       from generate_series(0, 13) n`,
    )) as { s: string }[];
    expect(days.length).toBeGreaterThan(1);
  });

  it('marks what you own and what you can afford', async () => {
    await gold(100, 2);
    const m = await stall();
    for (const w of m.wares) expect(w.affordable).toBe(w.price <= 100);
    expect(m.wares.find((w) => w.kind === 'functional')?.owned).toBe(true);
    const [gear] = m.wares;
    await rows(`insert into owned_items (user_id, item_id, source) values ($1, $2, 'chest')`, [
      ADAM,
      gear.id,
    ]);
    expect((await stall()).wares[0].owned).toBe(true);
  });

  it('takes the gold and gives the item, once', async () => {
    const [gear, , color, shield] = (await stall()).wares;
    await gold(1000);
    const bought = await buy(gear.id);
    expect(bought).toEqual({
      item: gear.id,
      wallet: expect.objectContaining({ gold: 1000 - gear.price }),
    });
    expect(
      await rows(`select source from owned_items where user_id = $1 and item_id = $2`, [
        ADAM,
        gear.id,
      ]),
    ).toEqual([{ source: 'market' }]);
    await expect(buy(gear.id)).rejects.toThrow(/already owned/);

    await buy(color.id);
    expect((await buy(shield.id)).wallet.streak_shields).toBe(1);
    expect((await buy(shield.id)).wallet.streak_shields).toBe(2);
    await expect(buy(shield.id)).rejects.toThrow(/already owned/);
    expect(
      (await rows(`select gold from wallets where user_id = $1`, [ADAM]))[0] as { gold: number },
    ).toEqual({ gold: 1000 - gear.price - color.price - 2 * shield.price });
  });

  it('refuses too little gold and wares not on sale today', async () => {
    const m = await stall();
    await gold(m.wares[0].price - 1);
    await expect(buy(m.wares[0].id)).rejects.toThrow(/too little gold/);
    await gold(10000);
    const notToday = (
      (await rows(`select id from items where kind = 'gear' and not (id = any($1))`, [
        m.wares.map((w) => w.id),
      ])) as { id: string }[]
    )[0].id;
    await expect(buy(notToday)).rejects.toThrow(/not for sale today/);
    expect(
      await rows(`select item_id from owned_items where user_id = $1 and source = 'market'`, [
        ADAM,
      ]),
    ).toEqual([]);
  });

  it('is closed to visitors who are not signed in', async () => {
    await expect(as(null, () => rows(`select market_today()`))).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(null, () => rows(`select buy_item('tarboosh')`))).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(ADAM, () => rows(`select market_stock(current_date)`))).rejects.toThrow(
      /permission denied/,
    );
  });
});
