import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Friend codes and the Fellowship list (task 3.1, #326): fellowship-build.md §6, tests 3–7.
const root = join(import.meta.dirname, '..');
const shim = readFileSync(join(import.meta.dirname, 'supabase-shim.sql'), 'utf8');
const migrations = readdirSync(join(root, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(root, 'migrations', f), 'utf8'));

const A = '00000000-0000-0000-0000-0000000000a1';
const B = '00000000-0000-0000-0000-0000000000b2';
const C = '00000000-0000-0000-0000-0000000000c3';

/** The card's fields: fellowship.md §3, and nothing else. Adding one means changing this on purpose. */
const CARD_KEYS = ['achievements', 'id', 'level', 'look', 'me', 'name', 'ranks', 'streak', 'title'];

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

const rows = async (sql: string, params: unknown[] = []) => (await run(sql, params)).rows;

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

const code = async (who: string) => (await as(who, 'select my_friend_code()')) as string;
const ask = (who: string, c: string) => as(who, 'select ask_friend($1)', [c]);
const answer = (who: string, other: string, yes: boolean) =>
  as(who, 'select answer_friend($1, $2)', [other, yes]);
type Card = Record<string, unknown> & { id: string; name: string; me: boolean };
const cards = async (who: string) => (await as(who, 'select fellowship()')) as Card[];
const requests = async (who: string) =>
  (await as(who, 'select fellowship_requests()')) as { id: string; name: string }[];

/** Makes `n` extra players, each with a code, and returns their ids. */
async function others(n: number, from = 0x100) {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const id = `00000000-0000-0000-0000-${(from + i).toString(16).padStart(12, '0')}`;
    await rows('insert into auth.users (id, email) values ($1, $2)', [id, `p${from + i}@x.com`]);
    ids.push(id);
  }
  return ids;
}

/** Makes two players friends, as they would: one asks, the other accepts. */
async function befriend(x: string, y: string) {
  await ask(x, await code(y));
  await answer(y, x, true);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(shim);
  for (const m of migrations) await db.exec(m);
  for (const [id, name] of [
    [A, 'Adam'],
    [B, 'Basma'],
    [C, 'Chen'],
  ]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [id, `${name}@x.com`]);
    await db.query('update profiles set display_name = $2 where id = $1', [id, name]);
  }
  await db.query('update wallets set xp = 500, gold = 999, gems = 7 where user_id = $1', [A]);
  await db.query(
    `insert into subject_events (user_id, day, subject_id, kind, count)
     values ($1, '2026-11-02', 'morse', 'rank-listener', 1)`,
    [A],
  );
});

beforeEach(() => db.exec('begin'));
afterEach(() => db.exec('rollback'));

describe('friend codes (fellowship-build.md §1 trap 5)', () => {
  it('each player gets one 8-character code, made the first time, kept after', async () => {
    const mine = await code(A);
    expect(mine).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    expect(await code(A)).toBe(mine);
    expect(await code(B)).not.toBe(mine);
  });

  it('a new code makes the old one useless, 3 a day', async () => {
    const old = await code(A);
    const fresh = (await as(A, 'select new_friend_code()')) as string;
    expect(fresh).not.toBe(old);
    await ask(B, old);
    expect(await requests(A)).toEqual([]);
    await as(A, 'select new_friend_code()');
    await as(A, 'select new_friend_code()');
    await expect(as(A, 'select new_friend_code()')).rejects.toThrow(/enough for today/);
  });

  it('asking answers the same for a real code, a wrong one, your own and a friend’s', async () => {
    await befriend(A, C);
    const answers = [
      await ask(A, await code(B)),
      await ask(A, 'ZZZZZZZZ'),
      await ask(A, await code(A)),
      await ask(A, await code(C)),
    ];
    expect(new Set(answers.map((x) => JSON.stringify(x ?? null))).size).toBe(1);
  });

  it('a code is never readable by another player', async () => {
    await code(A);
    await expect(as(B, `select count(*) from friend_codes where user_id = '${A}'`)).resolves.toBe(
      0,
    );
  });
});

describe('asking, answering and removing', () => {
  it('two players link by code and unlink, from either side', async () => {
    await ask(A, (await code(B)).toLowerCase().replace(/(.{4})/, '$1-'));
    expect(await requests(B)).toEqual([{ id: A, name: 'Adam', look: {} }]);
    expect(await requests(A)).toEqual([]);
    expect((await cards(A)).map((c) => c.name)).toEqual(['Adam']);
    await answer(B, A, true);
    expect((await cards(A)).map((c) => c.name)).toEqual(['Adam', 'Basma']);
    expect((await cards(B)).map((c) => c.name)).toEqual(['Basma', 'Adam']);
    await as(B, 'select remove_friend($1)', [A]);
    expect((await cards(A)).map((c) => c.name)).toEqual(['Adam']);
  });

  it('a decline is silent: the request goes, and the asker is told nothing', async () => {
    await ask(A, await code(B));
    await answer(B, A, false);
    expect(await requests(B)).toEqual([]);
    expect(await cards(A)).toHaveLength(1);
  });

  it('asking someone who already asked you makes you friends', async () => {
    await ask(A, await code(B));
    await ask(B, await code(A));
    expect((await cards(B)).map((c) => c.name)).toEqual(['Basma', 'Adam']);
  });

  it('you can only answer a request sent to you', async () => {
    await ask(A, await code(B));
    await answer(A, B, true);
    await answer(C, A, true);
    expect(await cards(A)).toHaveLength(1);
  });
});

describe('what a friend sees (fellowship-build.md §3, §4)', () => {
  it('the card has exactly §3’s fields, and no gold, gems or XP', async () => {
    await befriend(A, B);
    const theirs = (await cards(B)).find((c) => c.id === A);
    expect(Object.keys(theirs ?? {}).sort()).toEqual(CARD_KEYS);
    expect(theirs).toMatchObject({ name: 'Adam', me: false, ranks: ['morse:rank-listener'] });
    expect(theirs?.level).toBeGreaterThan(1);
    expect(JSON.stringify(theirs)).not.toMatch(/999|"xp"|"gold"|"gems"|email/);
  });

  it('three players: A and B are friends, C is a stranger and sees only themself', async () => {
    await befriend(A, B);
    expect((await cards(C)).map((c) => c.id)).toEqual([C]);
    expect((await cards(A)).map((c) => c.id)).toEqual([A, B]);
    expect(await as(C, 'select count(*) from friendships')).toBe(0);
  });

  it('a removed friend reads nothing more', async () => {
    await befriend(A, B);
    await as(A, 'select remove_friend($1)', [B]);
    expect((await cards(B)).map((c) => c.id)).toEqual([B]);
  });

  it('a waiting request shows the asker nothing of the other player', async () => {
    await ask(A, await code(B));
    expect((await cards(A)).map((c) => c.id)).toEqual([A]);
  });
});

describe('the limits (fellowship-build.md §6, test 6)', () => {
  it('the 11th ask in a day fails cleanly, wrong codes included', async () => {
    for (let i = 0; i < 10; i++) await ask(A, `WRONG${i}XX`);
    await expect(ask(A, await code(B))).rejects.toThrow(/enough for today/);
    expect(await requests(B)).toEqual([]);
  });

  it('the 6th waiting request fails cleanly', async () => {
    const five = await others(5);
    for (const p of five) await ask(A, await code(p));
    await expect(ask(A, await code(B))).rejects.toThrow(/too many requests waiting/);
  });

  it('the 21st friend fails cleanly, on either side', async () => {
    const twenty = await others(20);
    for (const p of twenty) {
      await rows(
        `insert into friendships (low, high, asked_by, accepted_at)
         values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid), $1, now())`,
        [A, p],
      );
    }
    await expect(ask(A, await code(B))).rejects.toThrow(/too many friends/);
    await ask(B, await code(A));
    await expect(answer(A, B, true)).rejects.toThrow(/too many friends/);
    // B's request to a full player stays waiting, and nothing breaks.
    expect((await cards(B)).map((c) => c.id)).toEqual([B]);
  });
});

describe('names others will read (fellowship-build.md §1 trap 4)', () => {
  it('refuses control and direction characters in a new name', async () => {
    for (const bad of ['Ad‮am', 'Ad\u0007am', 'A⁦dam']) {
      await expect(
        as(A, `update profiles set display_name = $1 where id = '${A}'`, [bad]),
      ).rejects.toThrow(/profiles_display_name_plain/);
    }
  });

  it('cleans an older name on its way to a friend', async () => {
    await rows(`alter table profiles drop constraint profiles_display_name_plain`);
    await rows(`update profiles set display_name = $1 where id = $2`, ['  Ad‮am \n Z ', A]);
    await befriend(A, B);
    expect((await cards(B)).find((c) => c.id === A)?.name).toBe('Adam Z');
  });
});
