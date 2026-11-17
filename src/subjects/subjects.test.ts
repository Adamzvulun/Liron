import { describe, expect, it } from 'vitest';
import { memoryStore } from '../core/progress/store.ts';
import { subjectApi } from '../core/progress/subjectApi.ts';
import { arabic } from './arabic/index.ts';
import { example, finishDrill, type ExampleState } from './example/index.ts';
import { subjects } from './index.ts';
import { morse } from './morse/index.ts';
import { defineSubjects } from './registry.ts';

describe('subject registry', () => {
  it('lists Morse and Arabic', () => {
    expect(subjects.map((s) => s.id)).toEqual(['morse', 'arabic']);
  });

  it('rejects bad or repeated ids and repeated places', () => {
    expect(() => defineSubjects([{ ...example, id: 'Bad Id' }])).toThrow(/Invalid subject id/);
    expect(() => defineSubjects([morse, { ...example, id: 'morse' }])).toThrow(/id "morse"/);
    expect(() => defineSubjects([morse, { ...example, place: morse.place }])).toThrow(/place/);
  });

  it('gives each subject its own building, one of the city’s halls', () => {
    expect(subjects.map((s) => s.building)).toEqual(['tower', 'caravanserai']);
    expect(() => defineSubjects([morse, { ...example, building: 'tower' }])).toThrow(
      /building "tower"/,
    );
    const nowhere = { ...example, building: 'market' } as unknown as typeof example;
    expect(() => defineSubjects([nowhere])).toThrow(/Unknown building/);
  });
});

describe('a new subject needs no platform changes', () => {
  it('registers next to the others and reports progress through the contract', async () => {
    const all = defineSubjects([morse, arabic, example]);
    expect(all.map((s) => s.place)).toContain('Example Yard');

    const store = memoryStore();
    const api = subjectApi<ExampleState>(example, store);
    await finishDrill(api, { correct: 5, minutes: 3.4 });
    await finishDrill(api, { correct: 0, minutes: 2 });

    expect(await api.progressSummary()).toEqual({ xp: 10, minutes: 5 });
    expect(await api.loadState()).toEqual({ drillsDone: 2 });
    expect(await store.wallet()).toEqual({ xp: 10, gold: 2, gems: 0 });
    // Other subjects are untouched.
    expect(await store.summary('morse')).toEqual({ xp: 0, minutes: 0 });
  });
});
