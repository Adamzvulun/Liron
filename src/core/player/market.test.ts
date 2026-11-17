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
});
