import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

// Every new player starts with a name from content/core/names.json (Adam, 2026-11-22).
const root = join(import.meta.dirname, '..');
const shim = readFileSync(join(import.meta.dirname, 'supabase-shim.sql'), 'utf8');
const migrations = readdirSync(join(root, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(root, 'migrations', f), 'utf8'));
const pack = JSON.parse(
  readFileSync(join(root, '..', 'content', 'core', 'names.json'), 'utf8'),
) as { items: { data: { name: string } }[] };
const NAMES = pack.items.map((i) => i.data.name).sort();

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(shim);
  for (const m of migrations) await db.exec(m);
});

const user = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

describe('starter names', () => {
  it('holds exactly the names in content/core/names.json', async () => {
    const rows = (await db.query<{ name: string }>('select name from starter_names order by name'))
      .rows;
    expect(rows.map((r) => r.name)).toEqual(NAMES);
    expect(NAMES.length).toBeGreaterThanOrEqual(50);
  });

  it('names no character of the game', () => {
    const story = ['questline.json', 'road.json', 'finale.json']
      .map((f) => readFileSync(join(root, '..', 'content', 'arabic', f), 'utf8'))
      .join('\n');
    for (const name of NAMES) expect(new RegExp(`\\b${name}\\b`).test(story), name).toBe(false);
  });

  it('gives every new player a name from the list, not the same one for all', async () => {
    const given: string[] = [];
    for (let i = 1; i <= 30; i++) {
      await db.query('insert into auth.users (id, email) values ($1, $2)', [user(i), `${i}@x.com`]);
      const r = await db.query<{ display_name: string }>(
        'select display_name from profiles where id = $1',
        [user(i)],
      );
      given.push(r.rows[0]?.display_name ?? '');
    }
    for (const name of given) expect(NAMES).toContain(name);
    expect(new Set(given).size).toBeGreaterThan(5);
  });

  it('lets the player change it', async () => {
    await db.exec('set role authenticated');
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user(1)]);
    await db.query(`update profiles set display_name = 'Adam' where id = $1`, [user(1)]);
    await db.exec('reset role');
    const r = await db.query<{ display_name: string }>(
      'select display_name from profiles where id = $1',
      [user(1)],
    );
    expect(r.rows[0]?.display_name).toBe('Adam');
  });
});
