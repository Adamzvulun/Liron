import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Every relative link in our Markdown points at a file that exists (review, 2026-11-15: twelve
// had broken as files moved), and a link to a heading (`page.md#heading`, or `#heading` on the
// same page) finds that heading. Web links aren't checked.
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

/** GitHub's anchor for a heading: lower case, punctuation dropped, spaces as hyphens. */
function slug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[`*]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/** The anchors a Markdown file's headings make, with GitHub's -1, -2 for repeats. */
function anchors(file: string): Set<string> {
  const seen = new Map<string, number>();
  const out = new Set<string>();
  let fenced = false;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.startsWith('```')) fenced = !fenced;
    const m = !fenced && /^#{1,6}\s+(.*)$/.exec(line);
    if (!m) continue;
    const base = slug(m[1] ?? '');
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.add(n ? `${base}-${n}` : base);
  }
  return out;
}

describe('doc links', () => {
  it('turns headings into GitHub anchors', () => {
    expect(slug('The first real release, v1.0.0')).toBe('the-first-real-release-v100');
    expect(slug('4bx. Docs that tell the truth (2026-11-15)')).toBe(
      '4bx-docs-that-tell-the-truth-2026-11-15',
    );
    expect(slug('`main` and `dev`')).toBe('main-and-dev');
    expect(slug('The `content_licensees` table')).toBe('the-content_licensees-table');
  });

  it('all lead somewhere', () => {
    const broken: string[] = [];
    for (const file of markdown(ROOT)) {
      for (const [, url] of readFileSync(file, 'utf8').matchAll(/\]\(([^)\s]+)\)/g)) {
        if (!url || /^(https?:|mailto:)/.test(url)) continue;
        const [path = '', hash] = url.split('#');
        const target = path ? join(dirname(file), decodeURI(path)) : file;
        if (!existsSync(target)) broken.push(`${relative(ROOT, file)} → ${url}`);
        else if (
          hash &&
          target.endsWith('.md') &&
          statSync(target).isFile() &&
          !anchors(target).has(decodeURIComponent(hash).toLowerCase())
        )
          broken.push(`${relative(ROOT, file)} → ${url} (no such heading)`);
      }
    }
    expect(broken).toEqual([]);
  });
});
