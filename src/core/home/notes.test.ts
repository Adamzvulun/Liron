import { describe, expect, it } from 'vitest';
import morseWords from '../../../content/morse/words.json' with { type: 'json' };
import sentences from '../../../content/arabic/own-sentences.json' with { type: 'json' };
import { NOTES, noteLine } from './notes.ts';

// The letterbox's notes (task 8.1): each Arabic note is one of our own sentences, word for word,
// and each Morse note is an abbreviation the Codebook teaches, with its meaning.
describe('the notes at the letterbox', () => {
  it('have plain, unique ids the database accepts', () => {
    const ids = NOTES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,32}$/);
    expect(NOTES.length).toBeGreaterThanOrEqual(6);
  });

  it('take their Arabic from our own sentences, and their Morse from the Codebook', () => {
    const own = new Map(sentences.items.map((i) => [i.id, i.data]));
    const abbr = new Map(morseWords.items.map((i) => [i.id, i.data as Record<string, unknown>]));
    for (const n of NOTES) {
      if (n.kind === 'arabic') {
        const s = own.get(n.from ?? '');
        expect(s, n.id).toBeDefined();
        expect({ text: n.text, latin: n.latin, english: n.english }).toEqual({
          text: s?.arabic,
          latin: s?.latin,
          english: s?.english,
        });
      } else if (n.kind === 'morse') {
        const a = abbr.get(n.from ?? '');
        expect(a, n.id).toBeDefined();
        expect({ text: n.text, english: n.english }).toEqual({
          text: a?.text,
          english: a?.meaning,
        });
      } else {
        expect(n.text).toBeUndefined();
      }
    }
  });

  it('read as one line', () => {
    expect(noteLine({ id: 'x', kind: 'morse', text: '73', english: 'Best regards' })).toBe(
      '73 (Best regards)',
    );
    expect(noteLine({ id: 'y', kind: 'plain', english: 'I liked your room.' })).toBe(
      'I liked your room.',
    );
  });
});
