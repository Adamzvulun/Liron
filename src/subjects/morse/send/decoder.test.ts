import { describe, expect, it } from 'vitest';
import { codeFor } from '../code.ts';
import { seededRandom } from '../lesson/build.ts';
import { decode, sortElements, type Mark } from './decoder.ts';
import { analyseFist } from './fist.ts';

/** Keys `text` like a person would: in units of `dit` ms, with a given dah and gap shape. */
function key(
  text: string,
  dit: number,
  shape: { dah?: number; element?: number; letter?: number; word?: number; jitter?: number } = {},
): Mark[] {
  const { dah = 3, element = 1, letter = 3, word = 7, jitter = 0 } = shape;
  const random = seededRandom(7);
  const wobble = (ms: number) => ms * (1 + (random() * 2 - 1) * jitter);
  const marks: Mark[] = [];
  let t = 0;
  let first = true;
  text.split(' ').forEach((w, wi) => {
    [...w].forEach((c, ci) => {
      const code = codeFor(c) ?? '';
      [...code].forEach((e, ei) => {
        if (!first) t += wobble((ei ? element : ci ? letter : wi ? word : 0) * dit);
        first = false;
        const len = wobble((e === '-' ? dah : 1) * dit);
        marks.push({ down: t, up: t + len });
        t += len;
      });
    });
  });
  return marks;
}

describe('the straight-key decoder (#36)', () => {
  it('reads clean keying at any speed', () => {
    for (const dit of [240, 120, 60, 40]) {
      expect(decode(key('KMR SEN', dit)).text).toBe('KMR SEN');
    }
  });

  it('finds the sender’s speed', () => {
    expect(decode(key('PARIS PARIS', 100)).ditMs).toBeCloseTo(100, 0);
    expect(decode(key('PARIS PARIS', 60)).ditMs).toBeCloseTo(60, 0);
  });

  it('reads a slow sender’s first dits as dits once a dah has shown the speed', () => {
    // 5 wpm: a 240 ms dit is longer than the 12-wpm guess's dah cut-off.
    expect(decode(key('EEM', 240)).text).toBe('EEM');
  });

  it('copes with sloppy timing: short dahs, wobbly gaps', () => {
    const sloppy = key('KMURES ANSWER', 90, { dah: 2.2, letter: 2.6, word: 6, jitter: 0.2 });
    expect(decode(sloppy).text).toBe('KMURES ANSWER');
  });

  it('only finishes the last letter once the key has been up for a letter gap', () => {
    const marks = key('K', 100);
    const end = marks[marks.length - 1]?.up ?? 0;
    expect(decode(marks, { now: end + 50 })).toMatchObject({ text: '', keying: true });
    expect(decode(marks, { now: end + 250 })).toMatchObject({ text: 'K', keying: false });
  });

  it('reads a code we don’t teach as "?"', () => {
    // ..-- is not a character.
    const marks: Mark[] = [
      { down: 0, up: 100 },
      { down: 200, up: 300 },
      { down: 400, up: 700 },
      { down: 800, up: 1100 },
    ];
    expect(decode(marks).text).toBe('?');
  });

  it('uses the last known dit until both kinds have been keyed', () => {
    expect(sortElements([300, 310], 100).dah).toEqual([true, true]);
    expect(sortElements([300, 310], 250).dah).toEqual([false, false]);
    expect(decode([]).text).toBe('');
  });
});

describe('fist analysis (#37)', () => {
  it('calls clean keying clean', () => {
    const fist = analyseFist(decode(key('KMURES ANSWER', 100)));
    expect(fist.wpm).toBe(12);
    expect(fist.ratio?.value).toBeCloseTo(3);
    expect(fist.letter?.value).toBeCloseTo(3);
    expect(fist.word?.value).toBeCloseTo(7);
    expect(fist.steadiness).toBeCloseTo(1);
    expect(fist.tip).toMatch(/clean fist/i);
  });

  it('names the worst habit', () => {
    expect(analyseFist(decode(key('KMURES ANSWER', 100, { dah: 2 }))).tip).toMatch(
      /dahs are short/,
    );
    expect(analyseFist(decode(key('KMURES ANSWER', 100, { letter: 2.1 }))).tip).toMatch(
      /letters run together/,
    );
    expect(analyseFist(decode(key('KMR SEN', 100, { word: 12 }))).tip).toMatch(
      /word gaps are long/,
    );
    expect(analyseFist(decode(key('KMURES ANSWER', 100, { jitter: 0.3 }))).steadiness).toBeLessThan(
      0.75,
    );
  });
});
