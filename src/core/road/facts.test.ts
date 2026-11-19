import { describe, expect, it } from 'vitest';
import { ASSUMED_FACTS, readFacts } from './facts.ts';

describe('what a road depends on (task 2.1, #316)', () => {
  it('reads the licence and the partner, once a page', async () => {
    let asked = 0;
    const facts = readFacts({
      licensee: async () => (asked++, false),
      talk: async () => false,
    });
    expect(await facts()).toEqual({ licensee: false, partner: 'off' });
    await facts();
    expect(asked).toBe(1);
  });

  it('a site that couldn’t say whether the partner is in is assumed to have it', async () => {
    expect(await readFacts({ licensee: async () => true, talk: async () => null })()).toEqual({
      licensee: true,
      partner: 'ready',
    });
  });

  it('falls back to the common case when an answer fails, never to a closed door', async () => {
    const facts = readFacts({
      licensee: () => Promise.reject(new Error('offline')),
      talk: () => Promise.reject(new Error('offline')),
    });
    expect(await facts()).toEqual(ASSUMED_FACTS);
  });
});
