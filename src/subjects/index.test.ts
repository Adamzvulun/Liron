import { describe, expect, it } from 'vitest';
import { subjects } from './index.ts';

describe('subject registry', () => {
  it('lists Morse and Arabic', () => {
    expect(subjects.map((s) => s.id)).toEqual(['morse', 'arabic']);
  });

  it('gives every subject a unique id and a guild colour', () => {
    const ids = new Set(subjects.map((s) => s.id));
    expect(ids.size).toBe(subjects.length);
    for (const s of subjects) expect(s.guildColor).toMatch(/^var\(--guild-/);
  });
});
