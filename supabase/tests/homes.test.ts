import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  FURNITURE_PIECES,
  ROOM,
  STARTER,
  STARTER_PIECES,
  type PieceDef,
} from '../../src/core/home/layout.ts';
import { BAD, EXTRA, GOOD } from '../../src/core/home/layouts.fixture.ts';

// Homes in the database (task 7.3, #438; docs/game/the-home.md R7 and R9, ADR 0055). save_home
// must accept and refuse exactly what the browser's checkLayout does, on the same cases.
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

const save = (who: string, layout: unknown) =>
  as(who, 'select save_home($1::jsonb)', [JSON.stringify(layout)]);

/** Why save_home refused, as layout.ts's Refusal. */
async function refusal(who: string, layout: unknown): Promise<unknown> {
  try {
    await save(who, layout);
  } catch (e) {
    const err = e as { message: string; detail?: string };
    expect(err.message).toBe('home refused');
    return JSON.parse(err.detail ?? 'null');
  }
  throw new Error('saved');
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(shim);
  for (const m of migrations) await db.exec(m);
  for (const id of [A, B, C]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [id, `${id}@x.com`]);
  }
  // A owns the fixture's extra furniture; B and C own none of it.
  for (const p of EXTRA) {
    await db.query(`insert into owned_items (user_id, item_id, source) values ($1, $2, 'market')`, [
      A,
      p.id,
    ]);
  }
  await db.query(
    `insert into friendships (low, high, asked_by, accepted_at) values ($1, $2, $1, now())`,
    [A, B],
  );
});

beforeEach(() => db.exec('begin'));
afterEach(() => db.exec('rollback'));

describe('the room in the database', () => {
  it('is the room and the starter layout in content/core/home.json', async () => {
    const one = async (sql: string) => Object.values((await db.query(sql)).rows[0] as object)[0];
    // ROOM is read from the same item as the starter layout, which home_room() leaves out.
    const room = Object.fromEntries(Object.entries(ROOM).filter(([k]) => k !== 'starter'));
    expect(await one('select home_room()')).toEqual(room);
    expect(await one('select home_starter()')).toEqual(STARTER);
    const pieces = (
      await db.query<{
        id: string;
        place: string;
        w: number;
        d: number;
        does: string;
        starter: boolean;
      }>(`select id, place, w, d, does, starter from home_pieces order by id`)
    ).rows;
    const row = (p: PieceDef, starter: boolean) => ({
      id: p.id,
      place: p.place,
      w: p.size[0],
      d: p.size[1],
      does: p.does,
      starter,
    });
    expect(pieces).toEqual(
      [
        ...STARTER_PIECES.map((p) => row(p, true)),
        ...FURNITURE_PIECES.map((p) => row(p, false)),
      ].sort((a, b) => a.id.localeCompare(b.id)),
    );
    // Every piece of furniture is an item to buy or find (§7).
    const items = (
      await db.query<{ id: string }>(`select id from items where kind = 'furniture' order by id`)
    ).rows.map((r) => r.id);
    expect(items).toEqual(FURNITURE_PIECES.map((p) => p.id).sort());
  });
});

describe('save_home refuses what checkLayout refuses (layouts.fixture.ts)', () => {
  for (const { name, layout } of GOOD)
    it(`saves ${name}`, async () => {
      await save(A, layout);
      expect(await as(A, 'select my_home()')).toEqual(layout);
    });

  for (const { name, layout, refusal: why } of BAD)
    it(`refuses ${name}, and saves nothing`, async () => {
      expect(await refusal(A, layout)).toEqual(why);
      expect(await as(A, 'select my_home()')).toEqual(STARTER);
    });

  it('refuses furniture the player does not own', async () => {
    const chair = GOOD.find((g) => g.name === 'a chair on the rug');
    expect(await refusal(B, chair?.layout)).toEqual({ why: 'unknown', id: 'home-chair' });
  });

  it('refuses a layout of the wrong shape', async () => {
    for (const bad of [
      null,
      {},
      { ...STARTER, v: 2 },
      { ...STARTER, extra: 1 },
      { ...STARTER, pieces: [{ id: 'home:bed', at: [-1, 0], facing: 'left' }] },
      { ...STARTER, pieces: [{ id: 'home:bed', at: [0, 0], facing: 'up' }] },
      { ...STARTER, pieces: [{ id: 'home:picture', slot: 1, at: [0, 0] }] },
      { ...STARTER, pieces: [{ id: 'Home Bed', slot: 1 }] },
    ])
      await expect(save(A, bad)).rejects.toThrow(/bad layout/);
  });

  it('needs a signed-in player', async () => {
    await expect(
      db.query(`select save_home($1::jsonb)`, [JSON.stringify(STARTER)]),
    ).rejects.toThrow(/not signed in/);
  });
});

describe('reading homes (R9)', () => {
  const moved = GOOD.find((g) => g.name === 'the chest moved to the middle')?.layout;

  it('gives a player who never decorated the starter room', async () => {
    expect(await as(C, 'select my_home()')).toEqual(STARTER);
  });

  it('shows a friend your room, and a stranger nothing', async () => {
    await save(A, moved);
    expect(await as(B, 'select home_of($1)', [A])).toEqual(moved);
    expect(await as(C, 'select home_of($1)', [A])).toBeNull();
    // A friend who never decorated shows the starter room; nobody at all shows nothing.
    expect(await as(A, 'select home_of($1)', [B])).toEqual(STARTER);
    expect(await as(A, 'select home_of($1)', ['00000000-0000-0000-0000-0000000000ff'])).toBeNull();
  });

  it('keeps the table to its owner, and writes only through save_home', async () => {
    await save(A, moved);
    expect(await as(A, 'select count(*)::int from homes')).toBe(1);
    expect(await as(B, 'select count(*)::int from homes')).toBe(0);
    await expect(
      as(B, `insert into homes (user_id, layout) values ($1, '{}'::jsonb)`, [B]),
    ).rejects.toThrow(/permission denied/);
    await expect(as(A, `update homes set layout = '{}'::jsonb`)).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(A, `select home_refusal($1, $2::jsonb)`, [A, '{}'])).rejects.toThrow(
      /permission denied/,
    );
  });
});
