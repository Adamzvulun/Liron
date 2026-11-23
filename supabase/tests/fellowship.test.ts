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
const CARD_KEYS = [
  'achievements',
  'cozy',
  'id',
  'level',
  'look',
  'me',
  'name',
  'ranks',
  'streak',
  'title',
];

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
    // Nobody reads the table itself: a waiting row would say whether a code was real (trap 5).
    await expect(as(C, 'select count(*) from friendships')).rejects.toThrow(/permission denied/);
    await expect(as(A, 'select count(*) from friendships')).rejects.toThrow(/permission denied/);
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
    for (const bad of ['Ad‮am', 'Ad\u0007am', 'A⁦dam', 'Ad\u061cam', 'Ad\u0085am']) {
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

describe('the party feed (task 3.3, fellowship-build.md §6 test 8)', () => {
  type Row = { who: string; name: string; me: boolean; kind: string; detail: string; day: string };
  const feed = async (who: string) => (await as(who, 'select fellowship_feed()')) as Row[];
  const event = (who: string, kind: string, subject = 'morse') =>
    rows(
      `insert into subject_events (user_id, day, subject_id, kind, count)
       values ($1, current_date, $2, $3, 1)
       on conflict (user_id, day, subject_id, kind) do update set count = subject_events.count + 1`,
      [who, subject, kind],
    );

  it('the database writes a milestone as it happens, once, and friends read it newest first', async () => {
    await befriend(A, B);
    await event(A, 'rank-keyer');
    await event(A, 'rank-keyer');
    await rows(`update fellowship_feed set at = now() - interval '1 hour'`);
    await event(A, 'trial-3', 'arabic');
    const theirs = await feed(B);
    expect(theirs.map((r) => [r.kind, r.detail])).toEqual([
      ['trial', 'arabic:trial-3'],
      ['rank', 'morse:rank-keyer'],
      ['rank', 'morse:rank-listener'],
    ]);
    expect(theirs[0]).toMatchObject({ who: A, name: 'Adam', me: false });
    expect(theirs[0].day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Object.keys(theirs[0]).sort()).toEqual([
      'day',
      'detail',
      'id',
      'kind',
      'me',
      'name',
      'who',
    ]);
  });

  it('achievements and streak chests are milestones; ordinary events are not', async () => {
    await rows(
      `insert into player_achievements (user_id, achievement_id)
       values ($1, (select id from achievements order by 1 limit 1))`,
      [A],
    );
    await rows(
      `insert into chests (user_id, kind, source, source_key)
       values ($1, (select kind from chest_drops order by 1 limit 1), 'streak', '2026-11-02:30')`,
      [A],
    );
    await event(A, 'recognition-round');
    const kinds = (await feed(A)).map((r) => `${r.kind}:${r.detail}`);
    expect(kinds).toContain('streak:30');
    expect(kinds.some((k) => k.startsWith('achievement:'))).toBe(true);
    expect(kinds.some((k) => k.includes('recognition'))).toBe(false);
  });

  it('with sharing off, a rank writes no feed row', async () => {
    await as(A, `update profiles set share_milestones = false where id = '${A}'`);
    await event(A, 'rank-keyer');
    expect(
      await rows(`select * from fellowship_feed where user_id = $1 and detail like '%keyer'`, [A]),
    ).toEqual([]);
  });

  it('a stranger, or a removed friend, reads none of it', async () => {
    await befriend(A, B);
    await event(A, 'rank-keyer');
    expect((await feed(C)).filter((r) => r.who === A)).toEqual([]);
    await as(A, 'select remove_friend($1)', [B]);
    expect((await feed(B)).filter((r) => r.who === A)).toEqual([]);
  });

  it('forgets milestones older than 60 days', async () => {
    await event(A, 'rank-keyer');
    await rows(`update fellowship_feed set at = now() - interval '61 days' where user_id = $1`, [
      A,
    ]);
    expect(await feed(A)).toEqual([]);
    expect(await rows(`select * from fellowship_feed where user_id = $1`, [A])).toEqual([]);
  });

  it('nobody writes the feed through the API', async () => {
    await expect(
      as(A, `insert into fellowship_feed (user_id, kind, detail) values ('${A}', 'streak', '100')`),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('challenges (task 3.4, docs/game/challenges.md)', () => {
  let n = 0;
  /** Saves a round as the player would: a session, its event, then its score. */
  async function play(who: string, kind: 'rush' | 'words', score: number) {
    n += 1;
    const session = `00000000-0000-0000-0000-${(0xc000 + n).toString(16).padStart(12, '0')}`;
    await rows(
      `insert into saved_sessions (user_id, session_id, subject_id) values ($1, $2, 'morse')`,
      [who, session],
    );
    await rows(
      `insert into subject_events (user_id, day, subject_id, kind, count)
       values ($1, (now() at time zone 'utc')::date, 'morse', $2, 1) on conflict do nothing`,
      [who, kind === 'rush' ? 'rush-round' : 'words-round'],
    );
    await as(who, 'select record_round_score($1, $2, $3)', [session, kind, score]);
    return session;
  }
  type Challenge = {
    id: string;
    kind: string;
    mine: boolean;
    state: string;
    from: { name: string; score: number; best: number };
    to: { name: string; score: number | null; best: number | null };
  };
  const mine = async (who: string) => (await as(who, 'select my_challenges()')) as Challenge[];
  const send = async (who: string, friend: string, session: string) =>
    (await as(who, 'select send_challenge($1, $2)', [friend, session])) as string;

  it('a score is kept only for your own fresh round, once, in range', async () => {
    const s = await play(A, 'rush', 534);
    await expect(as(A, 'select record_round_score($1, $2, $3)', [s, 'rush', 600])).rejects.toThrow(
      /already has a score/,
    );
    await rows(
      `insert into saved_sessions (user_id, session_id, subject_id) values ($1, $2, 'morse')`,
      [A, '00000000-0000-0000-0000-00000000dead'],
    );
    await expect(
      as(A, 'select record_round_score($1, $2, $3)', [
        '00000000-0000-0000-0000-00000000dead',
        'rush',
        9999,
      ]),
    ).rejects.toThrow(/not a score/);
    await expect(
      as(B, 'select record_round_score($1, $2, $3)', [
        '00000000-0000-0000-0000-00000000dead',
        'rush',
        10,
      ]),
    ).rejects.toThrow(/no such round/);
    await rows(
      `update saved_sessions set saved_at = now() - interval '20 minutes'
       where session_id = '00000000-0000-0000-0000-00000000dead'`,
    );
    await expect(
      as(A, 'select record_round_score($1, $2, $3)', [
        '00000000-0000-0000-0000-00000000dead',
        'rush',
        10,
      ]),
    ).rejects.toThrow(/no such round/);
  });

  it('a round with no round event counted today can’t be scored', async () => {
    await rows(
      `insert into saved_sessions (user_id, session_id, subject_id) values ($1, $2, 'morse')`,
      [B, '00000000-0000-0000-0000-00000000beef'],
    );
    await expect(
      as(B, 'select record_round_score($1, $2, $3)', [
        '00000000-0000-0000-0000-00000000beef',
        'words',
        7,
      ]),
    ).rejects.toThrow(/no such round/);
  });

  it('sent, then answered: both see both scores and both bests', async () => {
    await befriend(A, B);
    await play(A, 'rush', 610);
    const id = await send(A, B, await play(A, 'rush', 534));
    expect((await mine(B))[0]).toMatchObject({
      id,
      mine: false,
      state: 'open',
      from: { score: 534 },
    });
    await as(B, 'select answer_challenge($1, $2)', [id, await play(B, 'rush', 498)]);
    const done = (await mine(A))[0];
    expect(done).toMatchObject({
      state: 'answered',
      mine: true,
      from: { name: 'Adam', score: 534, best: 610 },
      to: { name: 'Basma', score: 498, best: 498 },
    });
  });

  it('only a round of the same kind, played after the challenge, answers it', async () => {
    await befriend(A, B);
    const early = await play(B, 'rush', 900);
    const id = await send(A, B, await play(A, 'rush', 534));
    await expect(as(B, 'select answer_challenge($1, $2)', [id, early])).rejects.toThrow(
      /no such round/,
    );
    await expect(
      as(B, 'select answer_challenge($1, $2)', [id, await play(B, 'words', 9)]),
    ).rejects.toThrow(/no such round/);
    await expect(
      as(C, 'select answer_challenge($1, $2)', [id, await play(C, 'rush', 1)]),
    ).rejects.toThrow(/closed/);
  });

  it('declined and expired challenges close, and can’t be answered', async () => {
    await befriend(A, B);
    const one = await send(A, B, await play(A, 'words', 8));
    const two = await send(A, B, await play(A, 'words', 9));
    await as(B, 'select decline_challenge($1)', [one]);
    await rows(`update challenges set expires_at = now() - interval '1 minute' where id = $1`, [
      two,
    ]);
    const states = Object.fromEntries((await mine(A)).map((c) => [c.id, c.state]));
    expect(states).toEqual({ [one]: 'declined', [two]: 'expired' });
    await expect(
      as(B, 'select answer_challenge($1, $2)', [two, await play(B, 'words', 10)]),
    ).rejects.toThrow(/closed/);
  });

  it('only friends, three open a pair, and a removed friend reads nothing more', async () => {
    await expect(send(A, C, await play(A, 'rush', 100))).rejects.toThrow(/only a friend/);
    await befriend(A, B);
    for (let i = 0; i < 3; i++) await send(A, B, await play(A, 'rush', 100 + i));
    await expect(send(B, A, await play(B, 'rush', 50))).rejects.toThrow(/too many open/);
    expect(await mine(C)).toEqual([]);
    await as(A, 'select remove_friend($1)', [B]);
    expect(await mine(B)).toEqual([]);
  });

  it('a score typed into a call never becomes a challenge', async () => {
    await befriend(A, B);
    await expect(send(A, B, '00000000-0000-0000-0000-000000000999')).rejects.toThrow(
      /no such round/,
    );
    await expect(
      as(
        A,
        `insert into challenges (kind, from_id, to_id, from_score) values ('rush', '${A}', '${B}', 1250)`,
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('Fellowship quests (task 3.5, fellowship-build.md §5)', () => {
  type Quest = {
    id: string;
    metric: 'minutes' | 'event';
    subject: string | null;
    target: number;
    gold: number;
    week: string;
    total: number;
    mine: number;
    collected: boolean;
  };
  const quest = async (who: string) => (await as(who, 'select fellowship_quest()')) as Quest | null;
  const gold = async (who: string) =>
    ((await rows('select gold from wallets where user_id = $1', [who]))[0] as { gold: number })
      .gold;
  /** Adds `amount` to a player's part of this week's quest, as their real play would. */
  async function help(who: string, q: Quest, amount: number) {
    const def = (await rows('select * from fellowship_quests where id = $1', [q.id]))[0] as {
      subject_id: string;
      kind: string;
    };
    for (let day = 0; amount > 0; day++) {
      const part = Math.min(amount, q.metric === 'minutes' ? 1440 : 1000);
      amount -= part;
      if (q.metric === 'minutes') {
        await rows(
          `insert into daily_activity (user_id, day, minutes) values ($1, $2::date + $3::int, $4)
           on conflict (user_id, day) do update set minutes = excluded.minutes`,
          [who, q.week, day, part],
        );
      } else {
        await rows(
          `insert into subject_events (user_id, day, subject_id, kind, count)
           values ($1, $2::date + $3::int, $4, $5, $6)`,
          [who, q.week, day, def.subject_id, def.kind, part],
        );
      }
    }
  }

  it('is only for a player with a friend, and the same for everyone this week', async () => {
    expect(await quest(A)).toBeNull();
    await befriend(A, B);
    const a = await quest(A);
    expect(a).toMatchObject({ total: 0, mine: 0, collected: false });
    expect((await quest(B))?.id).toBe(a?.id);
    expect(new Date(`${a?.week}T00:00:00Z`).getUTCDay()).toBe(1);
  });

  it('counts each member’s own rows once, and only your Fellowship’s', async () => {
    await befriend(A, B);
    await befriend(A, C);
    const q = (await quest(A)) as Quest;
    await help(A, q, 2);
    await help(B, q, 3);
    await help(C, q, 4);
    expect(await quest(A)).toMatchObject({ total: 9, mine: 2 });
    // B and C aren't friends: B's Fellowship is B and A.
    expect(await quest(B)).toMatchObject({ total: 5, mine: 3 });
    // Last week's play doesn't count.
    await rows(`update daily_activity set day = day - 7 where user_id = $1`, [C]);
    await rows(`update subject_events set day = day - 7 where user_id = $1 and day >= $2`, [
      C,
      q.week,
    ]);
    expect(await quest(A)).toMatchObject({ total: 5 });
  });

  it('pays once, to members who helped, when the Fellowship reaches it', async () => {
    await befriend(A, B);
    const q = (await quest(A)) as Quest;
    await help(B, q, q.target - 1);
    await expect(as(B, 'select collect_fellowship_quest()')).rejects.toThrow(/not done yet/);
    await help(A, q, 1);
    const before = await gold(B);
    expect(await as(B, 'select collect_fellowship_quest()')).toBe(before + q.gold);
    await expect(as(B, 'select collect_fellowship_quest()')).rejects.toThrow(/already collected/);
    expect(await gold(B)).toBe(before + q.gold);
    expect(await quest(B)).toMatchObject({ collected: true });
    // C helped nobody's Fellowship: no friend, no quest, no pay.
    await expect(as(C, 'select collect_fellowship_quest()')).rejects.toThrow(/not done yet/);
  });

  it('a member who didn’t help collects nothing', async () => {
    await befriend(A, B);
    const q = (await quest(A)) as Quest;
    await help(B, q, q.target);
    await expect(as(A, 'select collect_fellowship_quest()')).rejects.toThrow(/help first/);
  });

  it('nobody writes rewards or quests through the API', async () => {
    await expect(
      as(
        B,
        `insert into fellowship_quest_rewards (user_id, week, quest_id, gold)
             values ('${B}', '2026-11-16', 'inn-talk', 100)`,
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(as(B, `update fellowship_quests set gold = 100`)).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('gifts (task 3.5, fellowship-build.md §5)', () => {
  /** Today's giftable wares (gear and colors on the stall), cheapest first. */
  const wares = async () =>
    (await rows(
      `select i.id, i.price from unnest(market_stock((now() at time zone 'utc')::date)) s(id)
       join items i on i.id = s.id where i.kind <> 'functional' order by i.price`,
    )) as { id: string; price: number }[];
  const give = (who: string, friend: string, item: string) =>
    as(who, 'select give_item($1, $2)', [friend, item]);
  const goldOf = async (who: string) =>
    ((await rows('select gold from wallets where user_id = $1', [who]))[0] as { gold: number })
      .gold;
  const owns = async (who: string, item: string) =>
    (await rows('select source from owned_items where user_id = $1 and item_id = $2', [who, item]))
      .length > 0;

  it('a gift to a stranger fails and costs nothing', async () => {
    const [w] = await wares();
    await expect(give(A, B, w.id)).rejects.toThrow(/only a friend/);
    expect(await goldOf(A)).toBe(999);
    expect(await owns(B, w.id)).toBe(false);
  });

  it('gives a ware from today’s stall, paid in the giver’s gold', async () => {
    await befriend(A, B);
    const [w] = await wares();
    expect(await give(A, B, w.id)).toBe(999 - w.price);
    expect(await goldOf(A)).toBe(999 - w.price);
    expect(
      await rows('select source from owned_items where user_id = $1 and item_id = $2', [B, w.id]),
    ).toEqual([{ source: 'gift' }]);
    expect(await owns(A, w.id)).toBe(false);
    const got = (await as(B, 'select my_gifts()')) as { name: string; item: string }[];
    expect(got).toMatchObject([{ name: 'Adam', item: w.id }]);
    expect(await as(A, 'select my_gifts()')).toEqual([]);
  });

  it('a ware they own already fails and costs nothing; twice gives once', async () => {
    await befriend(A, B);
    const [w] = await wares();
    await give(A, B, w.id);
    await expect(give(A, B, w.id)).rejects.toThrow(/they have it/);
    expect(await goldOf(A)).toBe(999 - w.price);
  });

  it('refuses shields, rank gear and wares not on today’s stall', async () => {
    await befriend(A, B);
    for (const item of ['streak-shield', 'ear-cups', 'no-such-thing']) {
      await expect(give(A, B, item)).rejects.toThrow(/not for giving today/);
    }
  });

  it('never takes gold below zero', async () => {
    await befriend(A, B);
    await rows('update wallets set gold = 1 where user_id = $1', [B]);
    const [w] = await wares();
    await expect(give(B, A, w.id)).rejects.toThrow(/too little gold/);
    expect(await goldOf(B)).toBe(1);
    expect(await owns(A, w.id)).toBe(false);
  });

  it('three gifts a day', async () => {
    await befriend(A, B);
    await befriend(A, C);
    const stall = await wares();
    // Two gear, a dye and a piece of furniture: all can be given, three a day.
    expect(stall.length).toBe(4);
    for (const w of stall.slice(0, 3)) await give(A, B, w.id);
    await expect(give(A, C, stall[3].id)).rejects.toThrow(/enough for today/);
  });

  it('a removed friend’s gifts vanish from the list, and nobody writes gifts directly', async () => {
    await befriend(A, B);
    const [w] = await wares();
    await give(A, B, w.id);
    await as(A, 'select remove_friend($1)', [B]);
    expect(await as(B, 'select my_gifts()')).toEqual([]);
    expect(await owns(B, w.id)).toBe(true);
    await expect(
      as(
        B,
        `insert into gifts (from_id, to_id, item_id, price) values ('${A}', '${B}', '${w.id}', 1)`,
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('the wire (task 3.6, ADR 0046): who may join a private Realtime channel', () => {
  const pair = (x: string, y: string) => (x < y ? `wire:${x}:${y}` : `wire:${y}:${x}`);
  /**
   * Does what Realtime does to authorize a private channel: as the player, with the topic set,
   * try to send (insert) or hear (select) a broadcast row, then roll it back.
   */
  async function may(who: string, topic: string, how: 'send' | 'hear', extension = 'broadcast') {
    await db.exec('savepoint wire');
    try {
      await db.exec('set role authenticated');
      await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [who]);
      await db.query(`select set_config('realtime.topic', $1, true)`, [topic]);
      if (how === 'send') {
        await db.query(
          `insert into realtime.messages (topic, extension, private) values ($1, $2, true)`,
          [topic, extension],
        );
        return true;
      }
      // Realtime's check for hearing: a row it wrote itself, read back as the player.
      await db.exec('reset role');
      await db.query(
        `insert into realtime.messages (topic, extension, private) values ($1, $2, true)`,
        [topic, extension],
      );
      await db.exec('set role authenticated');
      const r = await db.query('select 1 from realtime.messages where topic = $1', [topic]);
      return r.rows.length > 0;
    } catch {
      return false;
    } finally {
      await db.exec('rollback to savepoint wire');
      await db.exec('reset role');
    }
  }

  it('two friends may join, send and hear on their own wire', async () => {
    await befriend(A, B);
    for (const who of [A, B]) {
      expect(await may(who, pair(A, B), 'send')).toBe(true);
      expect(await may(who, pair(A, B), 'hear')).toBe(true);
    }
  });

  it('a stranger, or a friend on someone else’s wire, may not', async () => {
    await befriend(A, B);
    await befriend(A, C);
    expect(await may(C, pair(A, B), 'send')).toBe(false);
    expect(await may(C, pair(A, B), 'hear')).toBe(false);
    // B and C aren't friends: their wire doesn't open, even though both know A.
    expect(await may(B, pair(B, C), 'send')).toBe(false);
  });

  it('a removed friend’s wire closes', async () => {
    await befriend(A, B);
    await as(A, 'select remove_friend($1)', [B]);
    expect(await may(B, pair(A, B), 'send')).toBe(false);
  });

  it('only broadcast, only the wire’s own shape of name', async () => {
    await befriend(A, B);
    expect(await may(A, pair(A, B), 'send', 'presence')).toBe(false);
    const [low, high] = A < B ? [A, B] : [B, A];
    expect(await may(A, `wire:${high}:${low}`, 'send')).toBe(false);
    expect(await may(A, `room:${low}:${high}`, 'send')).toBe(false);
    expect(await may(A, `wire:${low}:${high}:x`, 'send')).toBe(false);
    expect(await may(A, 'wire:not-a-uuid-at-all-not-a-uuid-at-a:x', 'send')).toBe(false);
  });

  it('a signed-out visitor may not', async () => {
    await befriend(A, B);
    await db.exec('savepoint anon');
    try {
      await db.exec('set role anon');
      await db.query(`select set_config('realtime.topic', $1, true)`, [pair(A, B)]);
      await expect(
        db.query(`insert into realtime.messages (topic, extension) values ($1, 'broadcast')`, [
          pair(A, B),
        ]),
      ).rejects.toThrow(/row-level security/);
    } finally {
      await db.exec('rollback to savepoint anon');
      await db.exec('reset role');
    }
  });
});
