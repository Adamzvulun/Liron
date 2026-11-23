import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Two players, one database (task 2.4, #325; fellowship-build.md §6, tests 1 and 2). Every list
// below is read from the database itself, so a new table or function can't slip past: it fails
// here until someone looks at it and adds it on purpose.
const root = join(import.meta.dirname, '..');
const shim = readFileSync(join(import.meta.dirname, 'supabase-shim.sql'), 'utf8');
const migrations = readdirSync(join(root, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(root, 'migrations', f), 'utf8'));

const A = '00000000-0000-0000-0000-0000000000a1';
const B = '00000000-0000-0000-0000-0000000000b2';
/** A third player, after both in id order, so each of A and B has a pair row with them. */
const T = '00000000-0000-0000-0000-0000000000f3';

/**
 * Every table holding a player's own rows, and the column naming the player. A new one fails
 * "every player table is checked" until it is added here, with a row for each player below.
 */
const PLAYER_TABLES: Record<string, string> = {
  profiles: 'id',
  wallets: 'user_id',
  daily_activity: 'user_id',
  subject_progress: 'user_id',
  review_cards: 'user_id',
  review_log: 'user_id',
  skill_ratings: 'user_id',
  item_ratings: 'user_id',
  rating_log: 'user_id',
  saved_sessions: 'user_id',
  subject_events: 'user_id',
  daily_chests: 'user_id',
  daily_contracts: 'user_id',
  chests: 'user_id',
  owned_items: 'user_id',
  player_achievements: 'user_id',
  speech_checks: 'user_id',
  partner_replies: 'user_id',
  chat_lines: 'user_id',
  content_licensees: 'user_id',
  friend_codes: 'user_id',
  fellowship_limits: 'user_id',
  // A pair is one row (low < high); each player reads the rows they're in, nothing else.
  friendships: 'low',
  fellowship_feed: 'user_id',
  round_scores: 'user_id',
  // A challenge has two players; each reads theirs through my_challenges() only.
  challenges: 'from_id',
  fellowship_quest_rewards: 'user_id',
  // A gift has two players; the receiver reads theirs through my_gifts() only.
  gifts: 'from_id',
  // One room per player (task 7.3); a friend reads it through home_of() only.
  homes: 'user_id',
  // A note has two players (task 8.1); the host reads theirs through my_notes() only.
  home_notes: 'visitor_id',
};

/**
 * Tables with no player in them: game data and counters, read only by the functions or by
 * licensees. Also the invite links and who may make them (ADR 0052): nobody but the functions
 * reads them, and the server alone uses a link.
 */
const SHARED_TABLES = [
  'achievements',
  'chest_drops',
  'chest_sources',
  'content_items',
  'content_lessons',
  'contract_templates',
  'fellowship_quests',
  'home_pieces',
  'starter_names',
  'invites',
  'inviters',
  'items',
  'round_kinds',
  'site_usage',
  'subject_event_kinds',
  'subjects',
  'world_events',
];

/**
 * The functions a signed-in player may call, each reviewed for acting only on the caller
 * (auth.uid()) and for a per-player limit where it spends something shared. A new function
 * fails "only reviewed functions are callable" until it is added here.
 */
const CALLABLE: Record<string, string> = {
  'buy_item(p_item text)': 'spends the caller’s own gold; one of each item',
  'can_invite()': 'whether the caller may make invite links (ADR 0052)',
  'chat_lines_per_day()': 'a constant',
  'check_daily_goal()': 'the caller’s own day',
  'claim_chat_line()': 'the caller’s allowance (60 a day) and the site’s ceiling (ADR 0041)',
  'claim_partner_reply()': 'the caller’s allowance (40 a day) and the site’s ceiling',
  'claim_speech_check()': 'the licensee’s allowance (100 a day) and the site’s ceiling',
  'current_streak()': 'the caller’s own streak',
  'is_content_licensee()': 'whether the caller is a licensee',
  'level_for_xp(p_xp bigint)': 'pure arithmetic',
  'make_invite()': 'only an inviter; 20 open links at most (ADR 0052)',
  'market_today()': 'the day’s wares and the caller’s purchases',
  'my_achievements()': 'the caller’s own achievements',
  'open_chest(p_chest uuid)': 'only a chest the caller owns',
  'partner_replies_per_day()': 'a constant',
  'player_today()': 'the caller’s own day',
  'record_progress(p_subject text, p_xp integer, p_minutes integer)':
    'the caller’s own progress, capped per call and at 3,000 XP a day',
  'save_session(p_subject text, p_session uuid, p_state jsonb, p_reviews jsonb, p_results jsonb, p_xp integer, p_minutes integer, p_events jsonb)':
    'the caller’s own rows, once per session id',
  'save_subject_state(p_subject text, p_state jsonb)': 'the caller’s own state',
  'set_daily_goal(p_minutes integer)': 'the caller’s own goal, from a fixed list',
  'set_time_zone(p_zone text)': 'the caller’s own profile',
  'set_title(p_title text)': 'the caller’s own title, from what they earned',
  'guide_mark(p_ids text[])': 'appends ids to the caller’s own guide_seen (#407)',
  // The home (task 7.3, homes.test.ts).
  'my_home()': 'the caller’s own room, or the starter room',
  'save_home(p_layout jsonb)': 'the caller’s own room, whole, only if every rule holds',
  'home_of(p_friend uuid)': 'an accepted friend’s placed pieces; null for anyone else',
  'my_home_held()': 'what the caller’s own room has ever held (task 8.2)',
  // Notes at the letterbox (task 8.1, notes.test.ts).
  'leave_note(p_friend uuid, p_note text)': 'a note from the set, to an accepted friend only',
  'my_notes()': 'notes to the caller from current friends: who, which note, the day',
  'my_note_for(p_friend uuid)': 'the note the caller left that friend today',
  'speech_checks_per_day()': 'a constant',
  'today_status()': 'the caller’s own day',
  'todays_contracts()': 'the caller’s own contracts',
  'touch_updated_at()': 'a trigger function; calling it directly does nothing',
  'xp_for_level(p_level integer)': 'pure arithmetic',
  // The Fellowship (task 3.1, fellowship-build.md §3).
  'my_friend_code()': 'the caller’s own code',
  'new_friend_code()': 'the caller’s own code; 3 a day',
  'ask_friend(p_code text)':
    'answers nothing about the code; 10 a day, 5 waiting, 20 friends (fellowship.test.ts)',
  'answer_friend(p_other uuid, p_accept boolean)': 'only a request sent to the caller',
  'remove_friend(p_other uuid)': 'only a pair the caller is in',
  'fellowship()': 'the caller’s card and accepted friends’ cards, with §3’s fields only',
  'fellowship_requests()': 'requests to the caller: name and look only',
  'fellowship_feed(p_before timestamp with time zone)':
    'the caller’s and accepted friends’ milestones: codes and a day, 50 at a time',
  'friends_max()': 'a constant',
  // Challenges (task 3.4, docs/game/challenges.md).
  'record_round_score(p_session uuid, p_kind text, p_score integer)':
    'the caller’s own fresh saved session, once, in range',
  'send_challenge(p_friend uuid, p_session uuid)':
    'a friend only, from the caller’s scored round; 3 open a pair, 10 a day',
  'answer_challenge(p_challenge uuid, p_session uuid)': 'only a challenge sent to the caller',
  'decline_challenge(p_challenge uuid)': 'only a challenge sent to the caller',
  'my_challenges()': 'the caller’s challenges with current friends: names, scores, bests',
  'challenges_per_day()': 'a constant',
  'open_challenges_max()': 'a constant',
  // Fellowship quests and gifts (task 3.5, ADR 0045).
  'fellowship_quest()': 'this week’s quest: the caller’s part and their Fellowship’s total',
  'collect_fellowship_quest()': 'pays the caller once a week, if reached and they helped',
  'give_item(p_friend uuid, p_item text)':
    'a friend only, one of today’s gear or colors, in the giver’s gold; 3 a day',
  'my_gifts()': 'gifts to the caller from current friends: who, what, the day',
  'gifts_per_day()': 'a constant',
  // The wire (task 3.6, ADR 0046): Realtime's policies call it as the player.
  'may_use_wire(p_topic text)': 'true only for one of the two friends a wire: topic names',
  'friend_asks_per_day()': 'a constant',
  'waiting_asks_max()': 'a constant',
  'new_codes_per_day()': 'a constant',
};

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

/** Runs `fn` as a signed-in player. */
async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec('set role authenticated');
  await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

/** One row for `id` in every player table, written as the database's owner. */
async function seed(id: string) {
  const one = (table: string, column: string) =>
    `(select ${column} from public.${table} order by 1 limit 1)`;
  const statements = [
    `insert into daily_activity (user_id, day, minutes) values ($1, '2026-11-02', 5)`,
    `insert into subject_progress (user_id, subject_id) values ($1, 'morse')`,
    `insert into review_cards (user_id, subject_id, item_id, due, state, card)
       values ($1, 'morse', 'char:E', now(), 0, '{}')`,
    `insert into review_log (user_id, subject_id, item_id, rating, reviewed_at, log)
       values ($1, 'morse', 'char:E', 3, now(), '{}')`,
    `insert into skill_ratings (user_id, subject_id, skill, rating, rd, volatility, games, rated_at)
       values ($1, 'morse', 'receive', 1000, 350, 0.06, 0, now())`,
    `insert into item_ratings
       (user_id, subject_id, skill, item_id, rating, rd, volatility, games, rated_at)
       values ($1, 'morse', 'receive', 'char:E', 1000, 350, 0.06, 0, now())`,
    `insert into rating_log
       (user_id, subject_id, skill, item_id, score, rated_at, learner_rating, item_rating)
       values ($1, 'morse', 'receive', 'char:E', 1, now(), 1000, 1000)`,
    `insert into saved_sessions (user_id, session_id, subject_id)
       values ($1, gen_random_uuid(), 'morse')`,
    `insert into subject_events (user_id, day, subject_id, kind, count)
       values ($1, '2026-11-02', 'morse', ${one('subject_event_kinds', 'kind')}, 1)`,
    `insert into daily_chests (user_id, day, gold, gems) values ($1, '2026-11-02', 10, 0)`,
    `insert into daily_contracts (user_id, day, template_id, slot)
       values ($1, '2026-11-02', ${one('contract_templates', 'id')}, 1)`,
    `insert into chests (user_id, kind, source, source_key)
       values ($1, ${one('chest_drops', 'kind')}, 'trial', 'morse:1')`,
    `insert into owned_items (user_id, item_id, source) values ($1, ${one('items', 'id')}, 'market')`,
    `insert into player_achievements (user_id, achievement_id)
       values ($1, ${one('achievements', 'id')})`,
    `insert into speech_checks (user_id, day, checks) values ($1, '2026-11-02', 1)`,
    `insert into partner_replies (user_id, day, replies) values ($1, '2026-11-02', 1)`,
    `insert into chat_lines (user_id, day, lines) values ($1, '2026-11-02', 1)`,
    `insert into content_licensees (user_id) values ($1) on conflict do nothing`,
    `insert into friend_codes (user_id, code)
       values ($1, 'ABCDEFG' || case when $1::uuid = '${A}' then 'H' else 'J' end)`,
    `insert into fellowship_limits (user_id, day, kind, used) values ($1, '2026-11-02', 'ask', 1)`,
    `insert into friendships (low, high, asked_by) values ($1, '${T}', $1)`,
    `insert into fellowship_feed (user_id, kind, detail) values ($1, 'streak', '7')`,
    `insert into saved_sessions (user_id, session_id, subject_id)
       values ($1, '00000000-0000-0000-0000-00000000c0de', 'morse')`,
    `insert into round_scores (user_id, session_id, kind, score)
       values ($1, '00000000-0000-0000-0000-00000000c0de', 'rush', 100)`,
    `insert into challenges (kind, from_id, to_id, from_score) values ('rush', $1, '${T}', 100)`,
    `insert into fellowship_quest_rewards (user_id, week, quest_id, gold)
       values ($1, '2026-11-02', 'inn-talk', 40)`,
    `insert into gifts (from_id, to_id, item_id, price) values ($1, '${T}', 'cloak', 180)`,
    `insert into homes (user_id, layout) values ($1, home_starter())`,
    `insert into home_notes (visitor_id, host_id, note) values ($1, '${T}', 'tea')`,
  ];
  for (const sql of statements) await db.query(sql, [id]);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(shim);
  for (const m of migrations) await db.exec(m);
  await db.query('insert into auth.users (id, email) values ($1, $2)', [T, 't@example.com']);
  for (const [id, email] of [
    [A, 'a@example.com'],
    [B, 'b@example.com'],
  ]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [id, email]);
    await seed(id);
  }
});

beforeEach(() => db.exec('begin'));
afterEach(() => db.exec('rollback'));

const tables = async () =>
  (
    (await rows(
      `select c.relname as name, c.relrowsecurity as rls from pg_class c
       where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
       order by 1`,
    )) as { name: string; rls: boolean }[]
  ).map((t) => t);

describe('two players, one database (task 2.4, #325)', () => {
  it('every table is known: a player’s own, or shared on purpose', async () => {
    const names = (await tables()).map((t) => t.name);
    expect(names.filter((n) => !(n in PLAYER_TABLES) && !SHARED_TABLES.includes(n))).toEqual([]);
    expect(Object.keys(PLAYER_TABLES).filter((n) => !names.includes(n))).toEqual([]);
  });

  it('every table has row-level security, and logged-out visitors can touch none', async () => {
    expect((await tables()).filter((t) => !t.rls).map((t) => t.name)).toEqual([]);
    const anon = await rows(
      `select c.relname from pg_class c
       where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
         and (has_table_privilege('anon', c.oid, 'select, insert, update, delete')
              or has_any_column_privilege('anon', c.oid, 'select, insert, update'))`,
    );
    expect(anon).toEqual([]);
  });

  it('a player writes no table directly except their own profile’s name and look', async () => {
    const writable = await rows(
      `select c.relname as name from pg_class c
       where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
         and (has_table_privilege('authenticated', c.oid, 'insert, delete, truncate')
              or has_any_column_privilege('authenticated', c.oid, 'insert, update'))
       order by 1`,
    );
    expect(writable).toEqual([{ name: 'profiles' }]);
  });

  it('every policy that lets a player in names the player, or the licence', async () => {
    const policies = (await rows(
      `select tablename, policyname, coalesce(qual, '') || ' ' || coalesce(with_check, '') as rule
       from pg_policies where schemaname = 'public'`,
    )) as { tablename: string; policyname: string; rule: string }[];
    expect(policies.length).toBeGreaterThan(0);
    const loose = policies.filter(
      (p) => !/auth\.uid\(\)/.test(p.rule) && !/is_content_licensee\(\)/.test(p.rule),
    );
    expect(loose).toEqual([]);
  });

  for (const [table, column] of Object.entries(PLAYER_TABLES)) {
    it(`${table}: neither player can read, change or remove the other’s rows`, async () => {
      for (const [me, them] of [
        [A, B],
        [B, A],
      ]) {
        const theirs = async () =>
          (
            (await rows(`select count(*)::int as n from ${table} where ${column} = $1`, [
              them,
            ])) as {
              n: number;
            }[]
          )[0].n;
        const before = await theirs();
        expect(before, `${table} has a row for each player to protect`).toBeGreaterThan(0);
        const attempts: [string, unknown[]][] = [
          [`select * from ${table} where ${column} = $1`, [them]],
          [`update ${table} set ${column} = ${column} where ${column} = $1 returning 1`, [them]],
          [`delete from ${table} where ${column} = $1 returning 1`, [them]],
          [`update ${table} set ${column} = $1 where ${column} = $2 returning 1`, [them, me]],
        ];
        for (const [sql, params] of attempts) {
          const seen = await as(me, () => rows(sql, params)).catch((e: Error) => {
            expect(e.message).toMatch(/permission denied|violates row-level security/);
            return [];
          });
          expect(seen, sql).toEqual([]);
        }
        // Writing a row in the other player's name.
        await expect(
          as(me, () => rows(`insert into ${table} (${column}) values ($1)`, [them])),
        ).rejects.toThrow(/permission denied|violates row-level security/);
        expect(await theirs()).toBe(before);
      }
    });
  }

  it('only reviewed functions are callable by a player, and none by a logged-out visitor', async () => {
    const callable = (role: string) =>
      rows(
        `select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as f
         from pg_proc p where p.pronamespace = 'public'::regnamespace
           and has_function_privilege($1, p.oid, 'execute')
         order by 1`,
        [role],
      ).then((r) => (r as { f: string }[]).map((x) => x.f));
    expect(await callable('authenticated')).toEqual(Object.keys(CALLABLE).sort());
    const pure = [
      'chat_lines_per_day()',
      'level_for_xp(p_xp bigint)',
      'partner_replies_per_day()',
      'speech_checks_per_day()',
      'touch_updated_at()',
      'xp_for_level(p_level integer)',
    ];
    expect((await callable('anon')).filter((f) => !pure.includes(f))).toEqual([]);
  });

  it('every function that runs with its owner’s rights fixes its search path', async () => {
    // A security definer function that looked names up through the caller's search_path could be
    // handed a look-alike table or function of the caller's own making.
    const loose = await rows(
      `select p.proname as name from pg_proc p
       where p.pronamespace = 'public'::regnamespace and p.prosecdef
         and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
       order by 1`,
    );
    expect(loose).toEqual([]);
    const [{ n }] = (await rows(
      `select count(*)::int as n from pg_proc
       where pronamespace = 'public'::regnamespace and prosecdef`,
    )) as { n: number }[];
    expect(n, 'there are such functions to check').toBeGreaterThan(20);
  });

  it('a chest of the other player’s can’t be opened', async () => {
    const [{ id }] = (await rows(`select id from chests where user_id = $1`, [A])) as {
      id: string;
    }[];
    await expect(as(B, () => rows(`select open_chest($1)`, [id]))).rejects.toThrow();
    expect(await rows(`select opened_at from chests where id = $1`, [id])).toEqual([
      { opened_at: null },
    ]);
  });
});
