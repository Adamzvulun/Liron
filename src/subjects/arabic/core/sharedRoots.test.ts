import { describe, expect, it } from 'vitest';
import pack from '../../../../content/arabic/shared-roots.json' with { type: 'json' };
import { SHARED_ROOTS } from './sharedRoots.ts';
import { WORD_CHAPTERS } from './wordChapters.ts';

describe('shared roots (ADR 0002)', () => {
  const taught = new Set(WORD_CHAPTERS.flatMap((c) => c.words.map((w) => w.deck)));

  it('names, once each, a taught word and its Hebrew kin in Hebrew letters', () => {
    expect(SHARED_ROOTS.size).toBe(pack.items.length);
    for (const [deck, kin] of SHARED_ROOTS) {
      expect(taught.has(deck)).toBe(true);
      expect(kin.hebrew).toMatch(/^[א-ת]+$/);
    }
  });

  it('pairs the classic cognates', () => {
    expect(SHARED_ROOTS.get('pcav:0686')?.hebrew).toBe('בית');
    expect(SHARED_ROOTS.get('pcav:2997')?.hebrew).toBe('שלום');
    // Where the Hebrew word means something else, the card says what.
    expect(SHARED_ROOTS.get('pcav:0012')).toEqual({
      deck: 'pcav:0012',
      hebrew: 'בת',
      note: 'daughter',
    });
  });
});
