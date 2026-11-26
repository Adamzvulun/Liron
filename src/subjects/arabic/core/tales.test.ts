import { describe, expect, it } from 'vitest';
import { REGULARS } from '../questline.ts';
import { TALES, taleOf, talesEarned } from './tales.ts';

describe('the regulars’ tales (#491)', () => {
  it('each is told by a regular, in that regular’s chapter, with Hebrew letters for each line', () => {
    for (const t of TALES) {
      const regular = REGULARS.find((r) => r.number === t.road);
      expect(regular?.wordChapter).toBe(t.chapter);
      for (const l of t.lines) expect(l.hebrew).toMatch(/[א-ת]/);
    }
  });

  it('every regular has one', () => {
    for (const r of REGULARS) expect(taleOf(r.number)?.title).toBeTruthy();
  });

  it('are earned by passing the regular’s trial, in road order', () => {
    expect(talesEarned([])).toEqual([]);
    expect(talesEarned([4, 2]).map((t) => t.road)).toEqual([2, 4]);
  });

  it('keeps two corrected lines in step with their Latin', () => {
    const lines = TALES.flatMap((t) => t.lines);
    // قبض ends in ض, so the Latin takes ɖ, not ʂ
    expect(lines.find((l) => l.latin.startsWith('irrātib'))?.latin).toBe(
      'irrātib mnīɧ, w btúgbuɖ kull šáhir.',
    );
    // the b- prefix is voiced with a fatha, so the first ب is بَ, not بْ
    expect(lines.find((l) => l.latin.startsWith('issūr?'))?.arabic).toBe(
      'السّور؟ بَبْنيه مِن خشب.',
    );
  });
});
