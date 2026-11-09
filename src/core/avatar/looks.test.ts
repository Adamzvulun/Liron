import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, DYES, GEAR, parseLook, SLOTS } from './looks.ts';
import { paintAvatar, PAINTED_GEAR } from './paint.ts';
import catalogue from '../../../content/core/items.json' with { type: 'json' };

describe('avatar looks', () => {
  it('gives new players the default look', () => {
    expect(parseLook({})).toEqual(DEFAULT_LOOK);
    expect(parseLook(null)).toEqual(DEFAULT_LOOK);
  });

  it('keeps known choices and replaces unknown ones with the default', () => {
    const look = parseLook({ skin: 'umber', hair: 'mohawk', face: 'bold', gear: 'nope' });
    expect(look.skin).toBe('umber');
    expect(look.hair).toBe(DEFAULT_LOOK.hair);
    expect(look.face).toBe('bold');
    expect(look.gear).toEqual({});
  });

  it('takes off locked gear and gear worn in the wrong slot', () => {
    const look = parseLook({
      ...DEFAULT_LOOK,
      gear: { head: 'headset', back: 'staff', hand: 'staff' },
    });
    expect(look.gear).toEqual({ hand: 'staff' });
  });

  it('keeps gear the player owns (ADR 0033)', () => {
    const raw = { ...DEFAULT_LOOK, gear: { head: 'headset', back: 'cloak' } };
    expect(parseLook(raw, new Set(['headset'])).gear).toEqual({ head: 'headset' });
  });

  it("lists every earnable item in the catalogue, in the item's slot", () => {
    const pack = catalogue as {
      items: { id: string; data: { kind: string; slot?: string; milestone?: object } }[];
    };
    const gear = pack.items.filter((i) => i.data.kind === 'gear');
    expect(gear.map((i) => [i.id, i.data.slot]).sort()).toEqual(
      GEAR.filter((g) => !g.starter)
        .map((g) => [g.id, g.slot])
        .sort(),
    );
    // Each milestone item says how it's earned.
    for (const i of gear)
      if (i.data.milestone) expect(GEAR.find((g) => g.id === i.id)?.earn).toBeTruthy();
  });

  it('lists every dye in the catalogue as a color item (#49)', () => {
    const pack = catalogue as { items: { id: string; data: { kind: string; slot?: string } }[] };
    const colors = pack.items.filter((i) => i.data.kind === 'color');
    expect(colors.map((i) => i.id).sort()).toEqual(DYES.map((d) => d.id).sort());
    for (const c of colors) expect(c.data.slot).toBeUndefined();
  });

  it('keeps a tunic dye only if the player owns it (#49)', () => {
    const raw = { ...DEFAULT_LOOK, dye: 'indigo-dye' };
    expect(parseLook(raw).dye).toBeUndefined();
    expect(parseLook(raw, new Set(['indigo-dye'])).dye).toBe('indigo-dye');
    expect(
      parseLook({ ...DEFAULT_LOOK, dye: 'glitter' }, new Set(['glitter'])).dye,
    ).toBeUndefined();
  });

  it('paints the tunic in its dye', () => {
    const indigo = DYES.find((d) => d.id === 'indigo-dye')?.mid ?? '';
    const paint = (look: typeof DEFAULT_LOOK) => paintAvatar(look, { idPrefix: 'a' });
    expect(paint({ ...DEFAULT_LOOK, dye: 'indigo-dye' })).toContain(indigo);
    expect(paint(DEFAULT_LOOK)).not.toContain(indigo);
  });

  it('has 3–4 starter items, and art for every item', () => {
    const starters = GEAR.filter((g) => g.starter);
    expect(starters.length).toBeGreaterThanOrEqual(3);
    expect(starters.length).toBeLessThanOrEqual(4);
    for (const item of GEAR) {
      expect(PAINTED_GEAR).toContain(item.id);
      expect(SLOTS.map((s) => s.id)).toContain(item.slot);
      if (!item.starter) expect(item.earn).toBeTruthy();
    }
  });

  it('paints with gradient ids unique to each avatar', () => {
    const a = paintAvatar(DEFAULT_LOOK, { idPrefix: ':r1:' });
    const b = paintAvatar(DEFAULT_LOOK, { idPrefix: ':r2:' });
    const ids = (svg: string) => [...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids(a).length).toBeGreaterThan(0);
    expect(ids(a).some((id) => ids(b).includes(id))).toBe(false);
  });
});
