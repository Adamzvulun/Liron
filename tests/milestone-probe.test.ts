import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('the Arabic probe is a measurement', () => {
  // No component test setup here, so this reads the probe: it may load state and the deck, and
  // nothing else of the subject's api, so no review, rating, session, XP or time is written.
  const source = readFileSync(
    join(import.meta.dirname, '..', 'src', 'subjects', 'arabic', 'MilestoneProbe.tsx'),
    'utf8',
  );
  it('calls only loadState and privateContent on its api', () => {
    const used = [...source.matchAll(/\bapi\.(\w+)/g)].map((m) => m[1]);
    expect([...new Set(used)].sort()).toEqual(['loadState', 'privateContent']);
  });
});
