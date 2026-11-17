import { describe, expect, it } from 'vitest';
import { paintAvatar } from '../avatar/paint.ts';
import { DEFAULT_LOOK } from '../avatar/looks.ts';
import { rankName, readCard, readRequest, showCode, tidyCode } from './fellowship.ts';

const ID = '00000000-0000-0000-0000-0000000000a1';

describe('reading a friend’s card (fellowship-build.md §1 traps 3 and 4)', () => {
  it('keeps the fields it knows, with sane numbers', () => {
    expect(
      readCard({
        id: ID,
        me: false,
        name: 'Basma',
        look: {},
        title: 'Keyer',
        level: 4,
        streak: 3,
        ranks: ['morse:rank-listener'],
        achievements: ['first-light'],
        gold: 999,
      }),
    ).toEqual({
      id: ID,
      me: false,
      name: 'Basma',
      look: DEFAULT_LOOK,
      title: 'Keyer',
      level: 4,
      streak: 3,
      ranks: ['morse:rank-listener'],
      achievements: ['first-light'],
    });
  });

  it('turns away what isn’t a card, and fills a missing name kindly', () => {
    expect(readCard(null)).toBeNull();
    expect(readCard({ id: 'x' })).toBeNull();
    expect(readCard({ id: ID, level: -3, streak: 'many' })).toMatchObject({
      name: 'A traveler',
      level: 1,
      streak: 0,
    });
    expect(readRequest({ id: ID, name: '' })?.name).toBe('A traveler');
  });

  it('a hostile look paints nothing of what was typed', () => {
    const evil = '<script>alert(1)</script>';
    const look = Object.fromEntries(
      ['build', 'skin', 'face', 'hair', 'hairColour', 'beard', 'scarf', 'dye'].map((k) => [
        k,
        evil,
      ]),
    );
    const card = readCard({
      id: ID,
      name: evil,
      look: { ...look, gear: { torso: evil, head: '"><img onerror=x>', pet: 'tunic' } },
    });
    expect(card?.look).toEqual({ ...DEFAULT_LOOK, gear: {} });
    const svg = paintAvatar(card?.look ?? DEFAULT_LOOK, { idPrefix: 'f', shadow: false });
    expect(svg).not.toMatch(/script|onerror|<img/);
  });

  it('keeps a friend’s real gear and dye, which they may own and you may not', () => {
    const card = readCard({
      id: ID,
      look: { ...DEFAULT_LOOK, dye: 'crimson-dye', gear: { torso: 'tunic', pet: 'sand-cat' } },
    });
    expect(card?.look.dye).toBe('crimson-dye');
    expect(card?.look.gear).toEqual({ torso: 'tunic', pet: 'sand-cat' });
  });
});

describe('codes and ranks, as people read them', () => {
  it('a code reads in two halves and is typed any way', () => {
    expect(showCode('ABCDEFGH')).toBe('ABCD-EFGH');
    expect(tidyCode(' abcd-efgh ')).toBe('ABCDEFGH');
  });

  it('a rank’s name comes from its id', () => {
    expect(rankName('morse:rank-listener')).toBe('Listener');
    expect(rankName('arabic:rank-master-storyteller')).toBe('Master storyteller');
  });
});
