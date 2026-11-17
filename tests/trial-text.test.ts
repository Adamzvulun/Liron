import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// A trial's story (and a contract's line) says how many words or characters, at what score: the same numbers the game
// uses. Both live in content/, so this keeps them from drifting apart (review, 2026-11-15).
const CONTENT = join(import.meta.dirname, '..', 'content');

function jsonFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? jsonFiles(join(dir, e.name))
      : e.name.endsWith('.json')
        ? [join(dir, e.name)]
        : [],
  );
}

interface Trial {
  name?: string;
  text: string;
  accuracy: number;
  words?: number;
  chars?: number;
}

function trials(node: unknown, out: Trial[] = []): Trial[] {
  if (Array.isArray(node)) node.forEach((n) => trials(n, out));
  else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (typeof o.text === 'string' && typeof o.accuracy === 'number')
      out.push(o as unknown as Trial);
    Object.values(o).forEach((v) => trials(v, out));
  }
  return out;
}

const all = jsonFiles(CONTENT).flatMap((f) => trials(JSON.parse(readFileSync(f, 'utf8'))));

describe('trial texts', () => {
  it('are found', () => {
    expect(all.length).toBeGreaterThan(10);
  });

  it.each(all.map((t) => [t.name ?? t.text.slice(0, 30), t] as const))(
    '%s says its own numbers',
    (_, t) => {
      for (const [, pct] of t.text.matchAll(/(\d+)%/g)) {
        expect(Number(pct)).toBe(Math.round(t.accuracy * 100));
      }
      const count = t.words ?? t.chars;
      for (const [, n] of t.text.matchAll(/(\d+) (?:of the chapter’s )?(?:words|characters)/g)) {
        expect(Number(n)).toBe(count);
      }
    },
  );
});

interface Contract {
  kind?: string;
  target: number;
  text: string;
}

const WORDS: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four', 5: 'five' };

const contracts = jsonFiles(CONTENT)
  .filter((f) => f.endsWith('contracts.json'))
  .flatMap(
    (f) =>
      (JSON.parse(readFileSync(f, 'utf8')) as { items: { id: string; data: Contract }[] }).items,
  );

describe('contract lines', () => {
  it.each(contracts.map((c) => [c.id, c.data] as const))('%s says its own numbers', (_, c) => {
    // "Finish 3 Koch runs": the count is the target.
    for (const [, n] of c.text.matchAll(/(\d+)(?!\d|%)/g)) expect(Number(n)).toBe(c.target);
    if (c.target > 1)
      expect(c.text.includes(String(c.target)) || c.text.includes(WORDS[c.target] ?? '?')).toBe(
        true,
      );
    // "Pass a Koch run at 90%": the score is the one its event is named for (run-90).
    const pct = [...c.text.matchAll(/(\d+)%/g)].map((m) => m[1]);
    const named = /-(\d+)$/.exec(c.kind ?? '')?.[1];
    expect(pct).toEqual(named ? [named] : []);
  });
});

interface Achievement {
  name: string;
  text: string;
  condition: { kind: string; n: number; kinds?: string[] };
}

const SAID: Record<number, string[]> = {
  2: ['two', 'both'],
  3: ['three'],
  4: ['four'],
  5: ['five'],
  6: ['six'],
  7: ['seven'],
  8: ['eight'],
  9: ['nine'],
  10: ['ten'],
};

const achievements = (
  JSON.parse(readFileSync(join(CONTENT, 'core', 'achievements.json'), 'utf8')) as {
    items: { data: Achievement }[];
  }
).items.map((i) => i.data);

describe('achievement lines', () => {
  it.each(achievements.map((a) => [a.name, a] as const))('%s says its own count', (_, a) => {
    const { n, kinds } = a.condition;
    // "Pass all five Silent Beacon trials": a list of events is all of them.
    if (kinds) expect(kinds).toHaveLength(n);
    if (n < 2) return;
    const said = [n.toLocaleString('en-US'), ...(SAID[n] ?? [])];
    expect(said.some((s) => new RegExp(`\\b${s}\\b`, 'i').test(a.text))).toBe(true);
  });
});
