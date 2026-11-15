import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// A trial's story says how many words or characters, at what score: the same numbers the game
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
