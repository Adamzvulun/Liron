import { describe, expect, it } from 'vitest';
import type { RoadAnswer, RoadContext, RoadStep } from '../road/road.ts';
import type { SubjectInfo } from '../subject.ts';
import catalogue from '../../../content/core/items.json' with { type: 'json' };
import { CHEAPEST_WARE, cityErrands, loadCompass, type CompassSources } from './compass.ts';

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
  const s = (state ?? { at: 0 }) as {
    at: number | 'waiting' | 'closed' | 'done';
    door?: string;
  };
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
    position: s.at === 'done' ? null : position(s.at === 'closed' ? 0 : 4),
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
        started: false,
        done: 0,
      },
      expect.objectContaining({ subject: 'arabic', href: '/caravanserai?open=koch', quiet: true }),
    ]);
  });

  it('leads with the guild practiced last', async () => {
    const states = { morse: { at: 3 }, arabic: { at: 2 } };
    const lines = await loadCompass(guilds, sources(states, ['arabic', 'morse']), day);
    expect(lines.map((l) => [l.subject, l.progress, l.quiet, l.done])).toEqual([
      ['arabic', 'Step 3 of 10', false, 2],
      ['morse', 'Step 4 of 10', false, 3],
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

  it('hands every road what the site knows: the deck and the partner (task 2.1, #316)', async () => {
    const seen: RoadContext[] = [];
    const watching = guilds.map((g) => ({
      ...g,
      road: async (state: unknown, ctx: RoadContext) => (seen.push(ctx), road(state, ctx)),
    }));
    await loadCompass(
      watching,
      { ...sources({}), facts: async () => ({ licensee: false, partner: 'off' }) },
      day,
    );
    expect(seen.map((c) => [c.licensee, c.partner])).toEqual([
      [false, 'off'],
      [false, 'off'],
    ]);
    // When the site can't say, the common case is assumed rather than a guild going missing.
    seen.length = 0;
    await loadCompass(
      watching,
      { ...sources({}), facts: () => Promise.reject(new Error('offline')) },
      day,
    );
    expect(seen.map((c) => [c.licensee, c.partner])).toEqual([
      [true, 'ready'],
      [true, 'ready'],
    ]);
  });

  it('a new player whose first guild can’t offer a step starts with one that can', async () => {
    const lines = await loadCompass(
      [guild('arabic', 'caravanserai'), tower],
      sources({ arabic: { at: 'closed' } }),
      day,
    );
    expect(lines.map((l) => [l.subject, l.quiet])).toEqual([
      ['morse', false],
      ['arabic', true],
    ]);
  });
});

describe('the city errand (the-road.md §7)', () => {
  const errands = (chests: number) => cityErrands({ chests }).map((e) => [e.href, e.text]);

  it('has nothing to say without a chest', () => {
    expect(errands(0)).toEqual([]);
  });

  it('points at a waiting chest until it is opened', () => {
    expect(errands(1)).toEqual([['/notice-board', 'A chest is waiting at the Notice Board.']]);
    expect(errands(3)[0]?.[1]).toBe('3 chests are waiting at the Notice Board.');
  });

  it('knows the price of the cheapest ware', () => {
    const prices = catalogue.items.flatMap((i) => {
      const price = (i.data as { price?: number }).price;
      return typeof price === 'number' ? [price] : [];
    });
    expect(CHEAPEST_WARE).toBe(Math.min(...prices));
  });
});
