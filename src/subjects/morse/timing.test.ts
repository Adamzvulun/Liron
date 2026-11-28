import { describe, expect, it } from 'vitest';
import { codeFor, MORSE_CHARS, sendable } from './code.ts';
import { ditSeconds, gapSeconds, schedule } from './timing.ts';

/** Item i, failing the test if it's missing. */
function nth<T>(list: readonly T[], i: number): T {
  const item = list[i];
  if (item === undefined) throw new Error(`no item ${i}`);
  return item;
}

/** Total length of "PARIS " (with its word gap): exactly one minute ÷ wpm. */
function parisSeconds(speed: { charWpm: number; effWpm?: number }) {
  const s = schedule('PARIS PARIS', speed);
  // The second word starts exactly one PARIS word after the first.
  return nth(s.chars, 5).at - nth(s.chars, 0).at;
}

describe('Morse code table', () => {
  it('has 41 characters in Koch order, starting K, M', () => {
    expect(MORSE_CHARS).toHaveLength(41);
    expect(MORSE_CHARS.slice(0, 2).map((c) => c.char)).toEqual(['K', 'M']);
  });

  it('looks characters up in any case', () => {
    expect(codeFor('k')).toBe('-.-');
    expect(codeFor('#')).toBeUndefined();
  });

  it('knows prosigns, written in angle brackets (#155)', () => {
    expect(codeFor('<ar>')).toBe('.-.-.');
    expect(codeFor('<SK>')).toBe('...-.-');
    expect(sendable('cq<ar> 5<')).toEqual(['C', 'Q', '<AR>', ' ', '5', '<']);
  });
});

describe('prosigns in the sound (#155)', () => {
  it('plays a prosign as one character, with no letter gap inside', () => {
    const speed = { charWpm: 20 };
    const s = schedule('<AR>', speed);
    expect(s.chars.map((c) => c.char)).toEqual(['<AR>']);
    // .-.-. is 1+1+3+1+1+1+3+1+1 = 13 units, the same as one character with five elements.
    expect(s.duration).toBeCloseTo(13 * ditSeconds(20));
    // A+R as two letters is longer: the letter gap is 3 units, not 1.
    expect(schedule('AR', speed).duration).toBeCloseTo(15 * ditSeconds(20));
  });
});

describe('Morse timing', () => {
  it('uses PARIS timing: one dit is 1.2 / wpm seconds', () => {
    expect(ditSeconds(20)).toBeCloseTo(0.06);
    expect(() => ditSeconds(0)).toThrow(RangeError);
  });

  it('plays one PARIS word per minute ÷ wpm at standard spacing', () => {
    expect(parisSeconds({ charWpm: 20 })).toBeCloseTo(60 / 20);
    expect(parisSeconds({ charWpm: 25 })).toBeCloseTo(60 / 25);
    expect(parisSeconds({ charWpm: 30 })).toBeCloseTo(60 / 30);
    expect(parisSeconds({ charWpm: 35 })).toBeCloseTo(60 / 35);
    expect(parisSeconds({ charWpm: 30, effWpm: 10 })).toBeCloseTo(60 / 10);
    expect(parisSeconds({ charWpm: 18, effWpm: 18 })).toBeCloseTo(60 / 18);
  });

  it('stretches only the gaps for Farnsworth, keeping 20 wpm characters', () => {
    const speed = { charWpm: 20, effWpm: 10 };
    expect(parisSeconds(speed)).toBeCloseTo(60 / 10);
    const k = schedule('K', speed).tones;
    expect(k.map((t) => t.dur)).toEqual([0.18, 0.06, 0.18].map((d) => expect.closeTo(d)));
  });

  it('keeps the 3:7 ratio between character and word gaps', () => {
    const g = gapSeconds({ charWpm: 20, effWpm: 8 });
    expect(g.word / g.char).toBeCloseTo(7 / 3);
  });

  it('uses standard gaps when the effective speed is not slower', () => {
    expect(gapSeconds({ charWpm: 20, effWpm: 30 })).toEqual(gapSeconds({ charWpm: 20 }));
  });

  it('times the elements inside a character', () => {
    const { tones, chars, duration } = schedule('K', { charWpm: 20 });
    // dah, gap, dit, gap, dah = 3 + 1 + 1 + 1 + 3 units
    expect(tones.map((t) => t.at)).toEqual([0, 0.24, 0.36].map((d) => expect.closeTo(d)));
    expect(duration).toBeCloseTo(9 * 0.06);
    expect(chars).toEqual([{ char: 'K', at: 0, end: expect.closeTo(0.54) }]);
  });

  it('puts a character gap between characters and a word gap between words', () => {
    const { chars } = schedule('E E  E', { charWpm: 20 });
    expect(nth(chars, 1).at - nth(chars, 0).end).toBeCloseTo(7 * 0.06);
    expect(nth(chars, 2).at - nth(chars, 1).end).toBeCloseTo(7 * 0.06);
    const pair = schedule('EE', { charWpm: 20 }).chars;
    expect(nth(pair, 1).at - nth(pair, 0).end).toBeCloseTo(3 * 0.06);
  });

  it('skips characters it does not teach and leaves no trailing gap', () => {
    const { chars, duration } = schedule('  k#m  ', { charWpm: 20 });
    expect(chars.map((c) => c.char)).toEqual(['K', 'M']);
    expect(duration).toBe(nth(chars, 1).end);
    expect(schedule('', { charWpm: 20 })).toEqual({ tones: [], chars: [], duration: 0 });
  });
});

describe('a human fist (E16)', () => {
  it('weighs dahs, swings letter gaps and keeps the default machine-perfect', () => {
    const plain = schedule('TE', { charWpm: 20 });
    expect(schedule('TE', { charWpm: 20 }, {})).toEqual(plain);
    const dit = ditSeconds(20);
    const heavy = schedule('TE', { charWpm: 20 }, { weight: 4, swing: 2 });
    expect(nth(heavy.tones, 0).dur).toBeCloseTo(4 * dit);
    // T's dah, then a doubled letter gap, then E.
    expect(nth(heavy.tones, 1).at).toBeCloseTo(4 * dit + 6 * dit);
  });

  it('wanders by at most the jitter', () => {
    const dit = ditSeconds(20);
    let n = 0;
    const random = () => [0, 1][n++ % 2] as number;
    const s = schedule('EEEE', { charWpm: 20 }, { jitter: 0.2, random });
    for (const t of s.tones) {
      expect(t.dur).toBeGreaterThanOrEqual(0.8 * dit - 1e-9);
      expect(t.dur).toBeLessThanOrEqual(1.2 * dit + 1e-9);
    }
  });
});
