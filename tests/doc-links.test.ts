import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Every relative link in our Markdown points at a file that exists (review, 2026-11-15: twelve
// had broken as files moved). Web links and links inside a page aren't checked.
const ROOT = join(import.meta.dirname, '..');
const SKIP = new Set(['node_modules', 'dist', 'sources', '.claude', '.git', 'test-results']);

function markdown(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    SKIP.has(e.name)
      ? []
      : e.isDirectory()
        ? markdown(join(dir, e.name))
        : e.name.endsWith('.md')
          ? [join(dir, e.name)]
          : [],
  );
}

describe('doc links', () => {
  it('all lead somewhere', () => {
    const broken: string[] = [];
    for (const file of markdown(ROOT)) {
      for (const [, url] of readFileSync(file, 'utf8').matchAll(/\]\(([^)\s]+)\)/g)) {
        if (!url || /^(https?:|mailto:|#)/.test(url)) continue;
        const path = url.split('#')[0] ?? '';
        if (path && !existsSync(join(dirname(file), decodeURI(path))))
          broken.push(`${relative(ROOT, file)} → ${url}`);
      }
    }
    expect(broken).toEqual([]);
  });
});
