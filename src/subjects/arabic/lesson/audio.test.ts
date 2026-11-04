import { describe, expect, it } from 'vitest';
import { linkCache } from './useAudio.ts';

describe('linkCache (security review L1)', () => {
  it('reuses a link while it is fresh and renews it before it expires', async () => {
    let t = 0;
    let n = 0;
    const get = linkCache(
      async (p) => `${p}?v=${++n}`,
      () => t,
    );
    expect(await get('a.mp3')).toBe('a.mp3?v=1');
    t = 8 * 60_000;
    expect(await get('a.mp3')).toBe('a.mp3?v=1');
    t = 9 * 60_000 + 1;
    expect(await get('a.mp3')).toBe('a.mp3?v=2');
  });

  it('forgets a failed fetch so the next play tries again', async () => {
    let fail = true;
    const get = linkCache(async (p) => {
      if (fail) throw new Error('offline');
      return p;
    });
    await expect(get('a.mp3')).rejects.toThrow('offline');
    fail = false;
    await Promise.resolve();
    expect(await get('a.mp3')).toBe('a.mp3');
  });
});
