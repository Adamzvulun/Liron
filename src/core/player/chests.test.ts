import { describe, expect, it } from 'vitest';
import type { Chest, TodaysContracts } from '../progress/store.ts';
import type { SubjectInfo } from '../subject.ts';
import { chestName, chestShelf, lootOf } from './chests.ts';

const tower: SubjectInfo = {
  id: 'morse',
  place: 'Signal Tower',
  tagline: 't',
  guildColor: 'red',
  building: 'tower',
};

const chest = (source: Chest['source'], sourceKey: string, kind = 'brass'): Chest => ({
  id: `${source}-${sourceKey}`,
  kind,
  source,
  sourceKey,
});

const board = (paid: boolean[]): TodaysContracts => ({
  day: '2026-11-09',
  gold: 0,
  paidNow: [],
  contracts: paid.map((p, i) => ({
    id: `c${i}`,
    subject: null,
    text: 't',
    target: 1,
    progress: p ? 1 : 0,
    gold: 10,
    paid: p,
  })),
});

describe('reward chests (ADR 0033)', () => {
  it('names each kind from content/core/chests.json', () => {
    expect(chestName('wooden')).toBe('Wooden chest');
    expect(chestName('jeweled')).toBe('Jeweled chest');
    expect(chestName('nope')).toBe('Chest');
  });

  it('says what earned each chest, then shows today’s contract chest while it’s locked', () => {
    const shelf = chestShelf(
      [
        chest('contracts', '2026-11-08', 'wooden'),
        chest('trial', 'morse:1'),
        chest('streak', '2026-11-09:30', 'jeweled'),
      ],
      board([true, false, true]),
      [tower],
    );
    expect(shelf.map((c) => [c.name, c.reason])).toEqual([
      ['Wooden chest', 'For finishing a day’s three contracts'],
      ['Brass chest', 'Signal Tower: chapter 1 trial passed'],
      ['Jeweled chest', 'For a 30-day streak'],
      ['Wooden chest', 'Finish all three of today’s contracts to open it'],
    ]);
    expect(shelf[3]).toMatchObject({ id: null, kind: 'wooden', seals: { done: 2, of: 3 } });
  });

  it('drops the locked chest once all three are done, and shows none without contracts', () => {
    expect(chestShelf([], board([true, true, true]), [])).toEqual([]);
    expect(chestShelf([], null, [])).toEqual([]);
  });

  it('lists what came out, with gear already owned and a third shield paid as gold', () => {
    const base = { kind: 'brass', gold: 50, gems: 0, item: null, itemGold: 0 };
    expect(lootOf({ ...base, shield: false, shieldGold: 0 }).map((l) => l.text)).toEqual([
      '+50 gold',
    ]);
    expect(
      lootOf({ ...base, gems: 2, item: 'cloak', shield: true, shieldGold: 0 }).map((l) => l.text),
    ).toEqual(['+50 gold', '+2 gems', 'Merchant cloak, new to wear', 'A streak shield']);
    expect(
      lootOf({ ...base, item: 'boots', itemGold: 60, shield: true, shieldGold: 120 }).map(
        (l) => l.text,
      ),
    ).toEqual([
      '+50 gold',
      'Copper-toe boots, already yours: +60 gold',
      'Streak shield, you hold 2: +120 gold',
    ]);
  });
});
