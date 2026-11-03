import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  addDays,
  levelForXp,
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
] as const;

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
      if (table === 'review_log') {
        // Append-only: nobody can change any row, their own included.
        await expect(
          as(ADAM, () => run(`update review_log set rating = 4 where user_id = $1`, [OTHER])),
        ).rejects.toThrow(/permission denied/);
        return;
      }
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
      chest_gold: 20,
      chest_gems: 0,
    });
    expect(second.gold).toBe(20);
    const third = await one(`record_progress('morse', 0, 5)`);
    expect(third.today).toMatchObject({ goal_reached_now: false, chest_gold: 0, streak: 1 });
    expect(third.gold).toBe(20);
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

  it('the 7th day of a streak puts a gem in the chest', async () => {
    await goalDays([1, 2, 3, 4, 5, 6]);
    const r = await one(`record_progress('arabic', 0, 15)`);
    expect(r.today).toMatchObject({ streak: 7, chest_gold: 20, chest_gems: 1 });
  });

  it('changing the goal never rewrites past days; lowering it can reach today', async () => {
    await goalDays([1, 2]);
    await one(`record_progress('morse', 0, 6)`);
    let r = await one('set_daily_goal(60)');
    expect(r).toMatchObject({ goal_minutes: 60, goal_reached: false, streak: 2 });
    r = await one('set_daily_goal(5)');
    expect(r).toMatchObject({ goal_reached_now: true, streak: 3, chest_gold: 20 });
    expect(r.wallet).toEqual({ xp: 0, gold: 20, gems: 0 });
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

  it('signed-in users can read the text and the audio', async () => {
    expect(
      await as(ADAM, () =>
        rows(`select item_id from content_items where source = 'lingualism-pcav'`),
      ),
    ).toEqual([{ item_id: 'pcav:0001' }]);
    expect(await as(OTHER, () => rows(`select name from storage.objects`))).toEqual([
      { name: 'lingualism-pcav/pcav01-1.mp3' },
    ]);
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
