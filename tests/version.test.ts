import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The release steps (VERSIONS.md, step 3): package.json carries the version whose notes are the
// newest in docs/process/releases/. v1.3.0 went out still saying 1.2.3; this catches that the
// moment the notes are drafted.
const parse = (v: string) => v.split('.').map(Number);
const newer = (a: string, b: string) => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};

describe('the version', () => {
  it('in package.json is the newest release’s', () => {
    const notes = readdirSync(new URL('../docs/process/releases/', import.meta.url))
      .map((f) => /^v(\d+\.\d+\.\d+)\.md$/.exec(f)?.[1])
      .filter((v): v is string => v !== undefined);
    const newest = notes.reduce((a, b) => (newer(b, a) ? b : a));
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      version: string;
    };
    expect(pkg.version).toBe(newest);
  });
});
