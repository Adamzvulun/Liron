import { describe, expect, it } from 'vitest';
import { charLabel, codeFor, MORSE_CHARS, sendable, units } from './code.ts';

describe('what a line sends', () => {
  it('counts a prosign as one character', () => {
    expect(sendable('cq<ar>')).toEqual(['C', 'Q', '<AR>']);
    expect(codeFor('<ar>')).toBe('.-.-.');
  });

  it('compares keying unit by unit: spaces dropped, BT the same as "="', () => {
    expect(units('UR 599 <BT> NAME')).toEqual([...'UR599', '=', ...'NAME']);
    expect(units('UR 599 = NAME')).toEqual(units('UR 599 <BT> NAME'));
    expect(units('RN<AR>')).toEqual(['R', 'N', '<AR>']);
  });
});

describe('what a sign calls a character', () => {
  it('names a lone mark, so "Add ." is never missed', () => {
    expect(charLabel('.')).toBe('the period (.)');
    expect(charLabel('=')).toBe('the equals sign (=)');
    expect(charLabel('Q')).toBe('Q');
    expect(charLabel('5')).toBe('5');
  });

  it('names every mark Koch teaches', () => {
    const marks = MORSE_CHARS.filter((c) => c.kind === 'punctuation');
    expect(marks.length).toBeGreaterThan(0);
    for (const { char } of marks) expect(charLabel(char)).toMatch(/^the .+ \(.\)$/);
  });
});
