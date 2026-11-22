import { describe, expect, it } from 'vitest';
import type { Ware } from '../progress/store.ts';
import { wareName, wareNote } from './market.ts';

const ware = (over: Partial<Ware>): Ware =>
  ({
    id: 'tarboosh',
    kind: 'gear',
    slot: 'head',
    rarity: 'common',
    price: 60,
    owned: false,
    affordable: true,
    ...over,
  }) as Ware;

describe('the Market’s labels', () => {
  it('names gear, dyes and the shield', () => {
    expect(wareName({ id: 'tarboosh' })).toBe('Red tarboosh');
    expect(wareName({ id: 'rose-dye' })).toBe('Rose dye');
    expect(wareName({ id: 'streak-shield' })).toBe('Streak shield');
  });

  it('says what a piece of gear is, and calls a pet a companion', () => {
    expect(wareNote(ware({}))).toBe('Common · head');
    expect(wareNote(ware({ id: 'fennec', slot: 'pet', rarity: 'rare' }))).toBe('Rare · companion');
  });

  it('names furniture, and says whether it stands in the room or hangs on the wall (#443)', () => {
    expect(wareName({ id: 'home-chair' })).toBe('Chair');
    expect(wareName({ id: 'home-desert' })).toBe('Desert picture');
    expect(wareNote(ware({ id: 'home-chair', kind: 'furniture', slot: null }))).toBe(
      'Common · for your room',
    );
    expect(
      wareNote(ware({ id: 'home-clock', kind: 'furniture', slot: null, rarity: 'rare' })),
    ).toBe('Rare · for your wall');
  });
});
