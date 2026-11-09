import { describe, expect, it } from 'vitest';
import type { SubjectInfo } from '../subject.ts';
import { loadQuestlines } from './questlines.ts';

const subject = (id: string, extra: Partial<SubjectInfo> = {}): SubjectInfo => ({
  id,
  place: id,
  tagline: 't',
  guildColor: 'red',
  ...extra,
});

const status = (done: number) => ({
  questline: 'Q',
  chapter: 'I: One',
  done,
  total: 8,
  unit: 'lamps',
});

describe('loadQuestlines (ADR 0032, #47)', () => {
  it('asks each subject with a questline, handing it only its own state', async () => {
    const seen: [string, unknown][] = [];
    const tracked = (id: string) =>
      subject(id, {
        questStatus: async (state) => {
          seen.push([id, state]);
          return state ? status((state as { n: number }).n) : null;
        },
      });
    const states: Record<string, unknown> = { beacon: { n: 3 }, road: null };
    const found = await loadQuestlines(
      [tracked('beacon'), tracked('road'), subject('plain')],
      async (id) => states[id] ?? null,
    );
    expect([...found]).toEqual([['beacon', status(3)]]);
    expect(seen).toEqual([
      ['beacon', { n: 3 }],
      ['road', null],
    ]);
  });

  it('leaves out a subject whose state or status fails, and keeps the rest', async () => {
    const found = await loadQuestlines(
      [
        subject('broken', { questStatus: async () => Promise.reject(new Error('no')) }),
        subject('offline', { questStatus: async () => status(1) }),
        subject('fine', { questStatus: async () => status(2) }),
      ],
      async (id) => {
        if (id === 'offline') throw new Error('offline');
        return {};
      },
    );
    expect([...found.keys()]).toEqual(['fine']);
  });
});
