import { describe, expect, it } from 'vitest';
import { subjects } from '../../subjects/index.ts';
import { ROOM } from '../home/layout.ts';
import { fill, NUMBERS } from './numbers.ts';
import { GUIDEBOOK } from './words.ts';

// The Guidebook (the-guide.md §3.5, R14–R17; #412).
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).length;
const page = (id: string) => {
  const found = GUIDEBOOK.chapters.find((c) => c.id === id);
  if (!found) throw new Error(`No page ${id}`);
  return found;
};

describe('the Guidebook', () => {
  it('has a page for every place on the square and the Arena', () => {
    for (const place of ['board', 'market', 'house', 'arena'] as const) {
      expect(GUIDEBOOK.chapters.some((c) => c.place === place)).toBe(true);
    }
  });

  it('explains every number in the top bar', () => {
    expect(page('xp').text).toMatch(/XP/);
    expect(page('gold').text).toMatch(/Gold/);
    expect(page('gold').text).toMatch(/[Gg]ems/);
    expect(page('streak').text).toMatch(/streak/);
    expect(page('goal').text).toMatch(/daily goal|each day/);
  });

  it('gives every guild with a hall a chapter of its own', () => {
    for (const s of subjects.filter((s) => s.building)) expect(s.guidebook).toBeDefined();
  });

  it('fills every page’s numbers from the code, and keeps each to two to five sentences', () => {
    for (const c of GUIDEBOOK.chapters) {
      const text = fill(c.text);
      expect(text).not.toMatch(/[{}]/);
      expect(sentences(text)).toBeGreaterThanOrEqual(2);
      expect(sentences(text)).toBeLessThanOrEqual(5);
    }
  });

  it('quotes the numbers as the code sets them', () => {
    expect(fill(page('streak').text)).toContain(`costs ${NUMBERS.shieldPrice} gold`);
    expect(NUMBERS.shieldPrice).toBeGreaterThan(0);
    expect(fill(page('market').text)).toContain(`from ${NUMBERS.cheapestWare} gold`);
  });

  it('covers the home: walking, its four pieces, decorating, the caps and visits (#445)', () => {
    const text = fill(page('house').text);
    for (const said of [/tap the floor/, /cupboard/, /desk/, /shelf/, /letterbox/, /Decorate/])
      expect(text).toMatch(said);
    expect(text).toContain(`up to ${ROOM.caps.floor} pieces on the floor and ${ROOM.caps.wall}`);
    expect(text).toMatch(/Friends can visit/);
  });

  it('refuses a number it doesn’t know', () => {
    expect(() => fill('It costs {nothing} gold.')).toThrow(/\{nothing\}/);
  });

  it('opens each guild’s chapter with its hall and lists its stations', async () => {
    for (const s of subjects) {
      if (!s.guidebook) continue;
      const chapter = await s.guidebook();
      expect(chapter.title).not.toBe('');
      expect(chapter.stations.length).toBeGreaterThan(0);
      for (const st of chapter.stations) expect(st.text).not.toBe('');
    }
  });
});
