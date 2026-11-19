import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Invite links (ADR 0052): who may make one, and how the server uses one.
const root = join(import.meta.dirname, '..');
const shim = readFileSync(join(import.meta.dirname, 'supabase-shim.sql'), 'utf8');
const migrations = readdirSync(join(root, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(root, 'migrations', f), 'utf8'));

const ADAM = '00000000-0000-0000-0000-0000000000a1';
const BASMA = '00000000-0000-0000-0000-0000000000b2';
const NEW = '00000000-0000-0000-0000-0000000000c3';

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

/** Runs one statement as `role` (signed in as `userId`, if given) and returns its single value. */
async function one(role: string, userId: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`set role ${role}`);
  if (userId) await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
  try {
    const r = (await run(sql, params)).rows[0] as Record<string, unknown> | undefined;
    return r ? Object.values(r)[0] : undefined;
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', true)`);
  }
}

const as = (who: string, sql: string, params: unknown[] = []) =>
  one('authenticated', who, sql, params);
const server = (sql: string, params: unknown[] = []) => one('service_role', null, sql, params);
const makeInvite = async (who = ADAM) => (await as(who, 'select make_invite()')) as string;
const open = async (code: string) => (await server('select invite_open($1)', [code])) as boolean;
const claim = async (code: string) =>
  (await server('select claim_invite($1)', [code])) as string | null;
const newUser = (id: string, email: string) =>
  run('insert into auth.users (id, email) values ($1, $2)', [id, email]);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(shim);
  for (const m of migrations) await db.exec(m);
  // Adam's account is the project's first; Basma's comes after.
  for (const [id, email] of [
    [ADAM, 'adam@x.com'],
    [BASMA, 'basma@x.com'],
  ])
    await db.query('insert into auth.users (id, email) values ($1, $2)', [id, email]);
});

beforeEach(() => db.exec('begin'));
afterEach(() => db.exec('rollback'));

describe('invite links (ADR 0052)', () => {
  it('the first account may invite, and nobody else', async () => {
    expect(await as(ADAM, 'select can_invite()')).toBe(true);
    expect(await as(BASMA, 'select can_invite()')).toBe(false);
    await expect(as(BASMA, 'select make_invite()')).rejects.toThrow(/not an inviter/);
  });

  it('a link is a long random code, and only its hash is kept', async () => {
    const code = await makeInvite();
    expect(code).toMatch(/^[0-9a-f]{64}$/);
    expect(await makeInvite()).not.toBe(code);
    const kept = (await run('select code_hash from invites')).rows as { code_hash: string }[];
    expect(kept).toHaveLength(2);
    expect(kept.map((k) => k.code_hash)).not.toContain(code);
  });

  it('works once: a second claim gets nothing', async () => {
    const code = await makeInvite();
    expect(await open(code)).toBe(true);
    expect(await claim(code)).toBe(ADAM);
    expect(await open(code)).toBe(false);
    expect(await claim(code)).toBeNull();
  });

  it('a wrong code opens nothing', async () => {
    await makeInvite();
    expect(await open('0'.repeat(64))).toBe(false);
    expect(await claim('0'.repeat(64))).toBeNull();
    expect(await open('')).toBe(false);
  });

  it('expires after 7 days', async () => {
    const code = await makeInvite();
    await run(`update invites set expires_at = now() - interval '1 second'`);
    expect(await open(code)).toBe(false);
    expect(await claim(code)).toBeNull();
  });

  it('a link given back can be used again, until someone joins with it', async () => {
    const code = await makeInvite();
    await claim(code);
    await server('select release_invite($1)', [code]);
    expect(await open(code)).toBe(true);
    await claim(code);
    await newUser(NEW, 'new@x.com');
    await server('select finish_invite($1, $2)', [code, NEW]);
    await server('select release_invite($1)', [code]);
    expect(await open(code)).toBe(false);
  });

  it('whoever joins is the inviter’s friend at once', async () => {
    const code = await makeInvite();
    await claim(code);
    await newUser(NEW, 'new@x.com');
    await server('select finish_invite($1, $2)', [code, NEW]);
    const pair = (await run('select asked_by, accepted_at from friendships')).rows as {
      asked_by: string;
      accepted_at: Date | null;
    }[];
    expect(pair).toHaveLength(1);
    expect(pair[0]?.asked_by).toBe(ADAM);
    expect(pair[0]?.accepted_at).not.toBeNull();
    expect((await run('select used_by from invites')).rows as { used_by: string }[]).toEqual([
      { used_by: NEW },
    ]);
  });

  it('at most 20 open links', async () => {
    for (let i = 0; i < 20; i++) await makeInvite();
    await expect(makeInvite()).rejects.toThrow(/too many open invites/);
  });

  it('a player can’t use a link or look one up: only the server can', async () => {
    const code = await makeInvite();
    await expect(as(BASMA, 'select claim_invite($1)', [code])).rejects.toThrow();
    await expect(as(BASMA, 'select invite_open($1)', [code])).rejects.toThrow();
    await expect(as(BASMA, 'select finish_invite($1, $2)', [code, BASMA])).rejects.toThrow();
    await expect(as(BASMA, 'select count(*) from invites')).rejects.toThrow();
    await expect(one('anon', null, 'select invite_open($1)', [code])).rejects.toThrow();
  });
});
