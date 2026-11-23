import { describe, expect, it } from 'vitest';
import { coziness, heldOf, TIERS, withHeld } from './cozy.ts';
import { FURNITURE_PIECES, ROOF_STARTER, STARTER, STYLES } from './layout.ts';

describe('coziness (task 8.2)', () => {
  it('counts nothing in the starter room', () => {
    expect(heldOf(STARTER)).toEqual([]);
    expect(coziness(0).tier.name).toBe('Just moved in');
  });

  it('counts each piece of furniture once, and a wallpaper and floor that aren’t the room’s own', () => {
    const chair = FURNITURE_PIECES.find((p) => p.place === 'floor');
    const wall = STYLES.find((s) => s.part === 'wallpaper');
    if (!chair || !wall) throw new Error('no furniture');
    const l = {
      ...STARTER,
      wallpaper: wall.style,
      pieces: [
        ...STARTER.pieces,
        { id: chair.id, at: [6, 1] as [number, number], facing: 'left' as const },
      ],
    };
    expect(heldOf(l)).toEqual([chair.id, `wallpaper:${wall.style}`].sort());
  });

  it('counts the roof the same way, its own lime and slabs as nothing new (task 8.4)', () => {
    expect(heldOf(ROOF_STARTER)).toEqual([]);
    const roof = {
      ...ROOF_STARTER,
      pieces: [{ id: 'home-chair', at: [6, 2] as [number, number], facing: 'away' as const }],
    };
    expect(withHeld(['home-plant'], roof)).toEqual(['home-chair', 'home-plant']);
  });

  it('never loses what was held, even when the room is emptied', () => {
    const held = ['home-chair', 'wallpaper:zellige'];
    expect(withHeld(held, STARTER)).toEqual(held);
  });

  it('climbs its tiers in order, and says how far the next one is', () => {
    const ats = TIERS.map((t) => t.at);
    expect(ats[0]).toBe(0);
    expect([...ats].sort((a, b) => a - b)).toEqual(ats);
    expect(new Set(ats).size).toBe(ats.length);
    expect(coziness(2)).toEqual({
      tier: { at: 1, name: 'Settling in' },
      next: { tier: { at: 3, name: 'Lived in' }, more: 1 },
    });
    const top = TIERS[TIERS.length - 1];
    if (!top) throw new Error('no tiers');
    expect(coziness(top.at + 5)).toEqual({ tier: top });
    // The top can be reached with what there is to own.
    expect(FURNITURE_PIECES.length + STYLES.length).toBeGreaterThanOrEqual(top.at);
  });
});
