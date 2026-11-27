import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

// The data budget's size report (task 13.2, #516) must keep running as the schema changes.
const root = join(import.meta.dirname, '..');
const shim = readFileSync(join(import.meta.dirname, 'supabase-shim.sql'), 'utf8');
const migrations = readdirSync(join(root, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(root, 'migrations', f), 'utf8'));
const report = readFileSync(join(root, 'reports', 'size-report.sql'), 'utf8');

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(shim);
  for (const m of migrations) await db.exec(m);
});

describe('size report', () => {
  it('lists every public table and the whole database', async () => {
    const { rows } = await db.query<{ table_name: string; bytes: string }>(report);
    const names = rows.map((r) => r.table_name);
    expect(names).toContain('(whole database)');
    for (const t of ['review_log', 'rating_log', 'subject_events', 'saved_sessions', 'chat_lines'])
      expect(names).toContain(t);
  });

  it('works out rows per player per active day', async () => {
    const A = '00000000-0000-0000-0000-0000000000a1';
    await db.query(`insert into auth.users (id) values ($1)`, [A]);
    await db.query(
      `insert into public.subject_events (user_id, day, subject_id, kind, count)
       values ($1, '2027-01-01', 'arabic', 'a', 1), ($1, '2027-01-01', 'arabic', 'b', 1),
              ($1, '2027-01-02', 'arabic', 'a', 1)`,
      [A],
    );
    const { rows } = await db.query<{ table_name: string; rows_per_player_day: string }>(report);
    expect(rows.find((r) => r.table_name === 'subject_events')?.rows_per_player_day).toBe('1.5');
  });
});
