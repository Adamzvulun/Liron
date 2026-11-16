import { describe, expect, it } from 'vitest';
import type { RoadAnswer, RoadContext, RoadStep } from '../road.ts';
import type { SubjectInfo } from '../subject.ts';
import { loadCompass, type CompassSources } from './compass.ts';

const step = (n: number, door = 'koch'): RoadStep => ({
  id: `s${n}`,
  chapter: 1,
  kind: 'lesson',
  title: `Step ${n}`,
  invite: `Do step ${n}.`,
  door,
});

/** A road whose state says where it stands: `at` (a step number), or a meanwhile. */
const road = (state: unknown, ctx: RoadContext): RoadAnswer => {
  const s = (state ?? { at: 0 }) as { at: number | 'waiting' | 'done'; door?: string };
  const position = (index: number) => ({
    index,
    step: step(index + 1),
    chapter: { number: 1, title: 'One' },
    inChapter: index + 1,
    ofChapter: 10,
  });
  const base = { questline: 'The Tale', steps: 10, chapters: 1 };
  if (typeof s.at === 'number') {
    return {
      ...base,
      position: position(s.at),
      now: { kind: 'step', index: s.at, step: step(s.at + 1, s.door) },
    };
  }
  const line = ctx.due ? `${ctx.due} due` : ctx.contractDoor ? 'A contract' : 'The fountain';
  return {
    ...base,
    position: s.at === 'done' ? null : position(4),
    now: { kind: 'meanwhile', door: 'listen', line, why: 'station' },
    ...(s.at === 'waiting' && {
      waiting: { step: step(5), reason: 'tomorrow', line: 'The road goes on tomorrow: Step 5.' },
    }),
  };
};

const guild = (id: string, building: 'tower' | 'caravanserai'): SubjectInfo => ({
  id,
  place: id === 'morse' ? 'Signal Tower' : 'Caravanserai',
  tagline: 't',
  guildColor: id,
  building,
  road: async (state, ctx) => road(state, ctx),
});
const tower = guild('morse', 'tower');
const guilds = [tower, guild('arabic', 'caravanserai')];
const day = { today: '2026-11-16', contracts: [] };

const sources = (
  states: Record<string, unknown>,
  practiced: string[] = [],
  due: Record<string, number> = {},
): CompassSources => ({
  loadState: async (id) => states[id] ?? null,
  due: async (id) => due[id] ?? 0,
  practiced: async () => practiced,
});

describe('the compass in the square (the-road.md §6)', () => {
  it('a new player gets the first guild’s first step, and the other in a quieter voice', async () => {
    const lines = await loadCompass(guilds, sources({}), day);
    expect(lines).toEqual([
      {
        subject: 'morse',
        giver: 'Signal Tower',
        color: 'morse',
        href: '/signal-tower?open=koch',
        text: 'Do step 1.',
        progress: 'Step 1 of 10',
        quiet: false,
      },
      expect.objectContaining({ subject: 'arabic', href: '/caravanserai?open=koch', quiet: true }),
    ]);
  });

  it('leads with the guild practiced last', async () => {
    const states = { morse: { at: 3 }, arabic: { at: 2 } };
    const lines = await loadCompass(guilds, sources(states, ['arabic', 'morse']), day);
    expect(lines.map((l) => [l.subject, l.progress, l.quiet])).toEqual([
      ['arabic', 'Step 3 of 10', false],
      ['morse', 'Step 4 of 10', false],
    ]);
  });

  it('when that guild is waiting, the other guild’s step leads and the wait is said', async () => {
    const states = { morse: { at: 3 }, arabic: { at: 'waiting' } };
    const lines = await loadCompass(guilds, sources(states, ['arabic', 'morse']), day);
    expect(lines.map((l) => l.subject)).toEqual(['morse', 'arabic']);
    expect(lines[1]).toMatchObject({
      text: 'The fountain',
      href: '/caravanserai?open=listen',
      waiting: 'The road goes on tomorrow: Step 5.',
    });
  });

  it('asks for the reviews due only when a road has no step, and tells the road', async () => {
    const asked: string[] = [];
    const s = sources({ morse: { at: 3 }, arabic: { at: 'done' } }, ['arabic'], { arabic: 7 });
    const lines = await loadCompass(
      guilds,
      { ...s, due: (id) => (asked.push(id), s.due(id)) },
      { today: day.today, contracts: ['arabic'] },
    );
    expect(asked).toEqual(['arabic']);
    expect(lines[1]).toMatchObject({ text: '7 due', progress: 'The Tale: the road is walked' });
  });

  it('a step done in the hall itself links to the hall, and a road that fails is left out', async () => {
    const broken: SubjectInfo = {
      ...guild('arabic', 'caravanserai'),
      road: async () => {
        throw new Error('no');
      },
    };
    const lines = await loadCompass(
      [tower, broken],
      sources({ morse: { at: 2, door: 'hall' } }),
      day,
    );
    expect(lines.map((l) => l.href)).toEqual(['/signal-tower']);
  });
});
