import { describe, expect, it } from 'vitest';
import { codeFor, sendable, units } from './code.ts';

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
