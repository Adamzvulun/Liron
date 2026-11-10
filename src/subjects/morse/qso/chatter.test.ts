import { describe, expect, it } from 'vitest';
import { NEW_PROGRESS, parseProgress } from '../lesson/progress.ts';
import { cleanNews, newsAsk, newsOf, NOTES_KEEP, withNews } from './chatter.ts';
import {
  airResult,
  applyContact,
  contactSteps,
  makeContact,
  NEWS_STEP,
  notesOf,
  OPERATORS,
  type Operator,
} from './onAir.ts';

const op = (id: string) => OPERATORS.find((o) => o.id === id) as Operator;
const me = { call: 'MI2RK', name: 'ADAM', qth: 'HAIFA' };

describe('an operator’s news, written live (E15)', () => {
  it('asks with the operator’s story, your station and their last lines', () => {
    const c = makeContact(op('ruth'), me, true, () => 0);
    expect(newsAsk(c, 2, ['A', 'B', 'C', 'D'])).toEqual({
      kind: 'radio-news',
      persona: { who: op('ruth').who, about: op('ruth').about },
      learner: { name: 'ADAM', place: 'HAIFA', contacts: 2 },
      past: ['B', 'C', 'D'],
    });
  });

  it('keeps only what Morse can send, short, without other turns’ words', () => {
    expect(cleanNews('Cat caught a mouse — today!')).toBe('CAT CAUGHT A MOUSE TODAY');
    expect(cleanNews('TNX ADAM FB, UR 599. SHIP’S RADIO QUIET 73 CUL', 'ADAM')).toBe(
      'FB, SHIPS RADIO QUIET',
    );
    expect(cleanNews('ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE TEN')).toBe(
      'ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT',
    );
    expect(cleanNews('A'.repeat(30) + ' ' + 'B'.repeat(30))).toBeNull();
    expect(cleanNews('73')).toBeNull();
    expect(cleanNews('I AM AN AI MODEL')).toBeNull();
  });

  it('puts the news after the weather, in place of the script’s last line', () => {
    expect(withNews('R FB {my} <BT> WX RAIN TEMP {temp}C <BT> MY CAT SAYS HI', 'NEW KEY')).toBe(
      'R FB {my} <BT> WX RAIN TEMP {temp}C <BT> NEW KEY',
    );
    const c = { ...makeContact(op('ruth'), me, false, () => 0), news: 'CAT CAUGHT A MOUSE' };
    const step = contactSteps(c)[NEWS_STEP];
    expect(step).toMatchObject({ kind: 'hear', fields: ['temp'] });
    expect(step?.text).toContain('<BT> CAT CAUGHT A MOUSE <BT> MI2RK DE');
    expect(step?.text).not.toContain('MY CAT SAYS HI');
    expect(newsOf(c)).toBe('CAT CAUGHT A MOUSE');
    expect(newsOf({ ...c, news: undefined })).toBe('MY CAT SAYS HI');
    expect(newsOf(makeContact(op('dex'), me, false, () => 0))).toBeNull();
  });

  it('is remembered with the station, the last few lines per operator', () => {
    const c = makeContact(op('ruth'), me, false, () => 0);
    const res = airResult(c, {}, []);
    let r = NEW_PROGRESS.radio;
    expect(notesOf(r, 'ruth')).toEqual([]);
    for (const n of ['ONE', 'TWO', 'THREE', 'FOUR'])
      r = applyContact(r, 'ruth', res, 'd', false, n);
    r = applyContact(r, 'ruth', res, 'd');
    expect(notesOf(r, 'ruth')).toEqual(['TWO', 'THREE', 'FOUR']);
    expect(notesOf(r, 'ruth')).toHaveLength(NOTES_KEEP);
    const saved = parseProgress(JSON.parse(JSON.stringify({ ...NEW_PROGRESS, radio: r })));
    expect(notesOf(saved.radio, 'ruth')).toEqual(['TWO', 'THREE', 'FOUR']);
  });
});
