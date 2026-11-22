import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

// The repo is public (ADR 0054): raw sources, paid or copyrighted, are never committed. Only
// each source's README.md and the folders' .gitkeep are tracked in sources/.
const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);

describe('raw sources', () => {
  it('are never committed: sources/ holds only READMEs and .gitkeep', () => {
    const files = tracked.filter((f) => f.startsWith('sources/'));
    expect(files.filter((f) => !/(^|\/)(README\.md|\.gitkeep)$/.test(f))).toEqual([]);
  });

  it('no Anki deck is tracked anywhere', () => {
    expect(tracked.filter((f) => f.endsWith('.apkg'))).toEqual([]);
  });

  // The speech spike's 31 clips, made from deck sentences, sat in docs/research/ until
  // 2026-11-22. The game's sounds are made in the browser, so no recording belongs in git.
  it('no recording is tracked anywhere', () => {
    expect(tracked.filter((f) => /\.(mp3|ogg|wav|m4a|aac|flac|opus)$/i.test(f))).toEqual([]);
  });
});
