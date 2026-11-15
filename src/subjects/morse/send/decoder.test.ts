import { describe, expect, it } from 'vitest';
import { codeFor, sendable } from '../code.ts';
import { keyedRight } from '../qso/farStation.ts';
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
    sendable(w).forEach((c, ci) => {
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

  it('reads prosigns as one character, but -...- stays "=" (#155)', () => {
    expect(decode(key('CQ <AR>', 60)).text).toBe('CQ <AR>');
    expect(decode(key('TU <SK> <KN>', 60)).text).toBe('TU <SK> <KN>');
    expect(decode(key('<BT>', 60)).text).toBe('=');
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

  it('doesn’t judge a press or three', () => {
    const fist = analyseFist(decode(key('T', 100)));
    expect(fist.tip).toMatch(/too little keying/i);
    expect(analyseFist(decode(key('KM', 100))).tip).toMatch(/clean fist/i);
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

describe('keying past the learner’s slips (review, 2026-11-15)', () => {
  it('a held key (testing the tone) is a dah, and leaves the speed alone', () => {
    const clean = key('KMR KMR', 100);
    const held = [{ down: -4000, up: -1000 }, ...clean];
    const after = [...clean, { down: 9000, up: 12000 }];
    expect(decode(clean).ditMs).toBeCloseTo(100, -1);
    expect(decode(held).text).toBe('T KMR KMR');
    expect(decode(after).text).toBe('KMR KMR T');
    for (const marks of [held, after]) expect(decode(marks).ditMs).toBeCloseTo(100, -1);
  });

  it('a bounce or a brush of the key is not a dit', () => {
    const clean = key('KMR KMR', 100);
    const first = clean[0] ?? { down: 0, up: 100 };
    const bounce = [first, { down: first.up + 2, up: first.up + 3 }, ...clean.slice(1)];
    const brush = [...clean, { down: 5000, up: 5012 }];
    expect(decode(bounce).text).toBe('KMR KMR');
    expect(decode(brush).text).toBe('KMR KMR');
  });

  it('a BT keyed on the air is read as "=", and counts as keyed right', () => {
    const line = 'R TU NILS UR RST 599 <BT> NAME ADAM <BT> QTH HAIFA K';
    const read = decode(key(line, 60)).text;
    expect(read).toBe('R TU NILS UR RST 599 = NAME ADAM = QTH HAIFA K');
    expect(keyedRight(line, read)).toBe(true);
  });
});
