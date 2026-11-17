import { describe, expect, it } from 'vitest';
import { NEW_PROGRESS, parseProgress } from '../lesson/progress.ts';
import {
  cleanHeard,
  cleanNews,
  cleanReply,
  HEARD_MAX,
  newsAsk,
  newsOf,
  NOTES_KEEP,
  replyAsk,
  withNews,
} from './chatter.ts';
import {
  airResult,
  applyContact,
  contactSteps,
  makeContact,
  memoryOf,
  NEWS_STEP,
  notesOf,
  toldOf,
  OPERATORS,
  type AirStep,
  type Operator,
} from './onAir.ts';

const textOf = (s?: AirStep) => (s && 'text' in s ? s.text : undefined);
const op = (id: string) => OPERATORS.find((o) => o.id === id) as Operator;
const me = { call: 'MI2RK', name: 'ADAM', qth: 'HAIFA' };

describe('an operator’s news, written live (E15)', () => {
  it('asks with the operator’s story, your station and their last lines', () => {
    const c = makeContact(op('ruth'), me, true, () => 0);
    expect(newsAsk(c, 2, { past: ['A', 'B', 'C', 'D'], told: ['NEW JOB'] })).toEqual({
      kind: 'radio-news',
      operator: 'ruth',
      learner: { name: 'ADAM', place: 'HAIFA', contacts: 2 },
      past: ['B', 'C', 'D'],
      told: ['NEW JOB'],
    });
  });

  it('asks for an answer to the news you keyed, with their own news (ADR 0037)', () => {
    const c = { ...makeContact(op('ruth'), me, true, () => 0), news: 'CAT IS FINE' };
    expect(replyAsk(c, 1, { past: [], told: [] }, 'NEW JOB')).toMatchObject({
      kind: 'radio-reply',
      news: 'CAT IS FINE',
      heard: 'NEW JOB',
      past: [],
      told: [],
    });
    expect(replyAsk({ ...c, news: undefined }, 1, { past: [], told: [] }, 'X')).not.toHaveProperty(
      'news',
    );
  });

  it('reads your free turn as Morse, and answers only when there’s enough of it', () => {
    expect(cleanHeard('  new   job hr ')).toBe('NEW JOB HR');
    expect(cleanHeard('E T')).toBeNull();
    expect(cleanHeard('')).toBeNull();
    expect(cleanHeard('ABCDEFGHIJ '.repeat(10))?.length).toBeLessThanOrEqual(HEARD_MAX);
  });

  it('keeps an answer short, and lets it wish you GL', () => {
    expect(cleanReply('FB on ur new job, GL 73', 'ADAM')).toBe('FB ON UR NEW JOB, GL');
    expect(cleanReply('FB ADAM, GL AT PORT', 'ADAM')).toBe('FB ADAM, GL AT PORT');
    expect(cleanReply('CONGRATS ON UR NEW JOB OM GL 73')).toBe('CONGRATS ON UR NEW JOB OM GL');
    expect(cleanReply('ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT')).toBe(
      'ONE TWO THREE FOUR FIVE SIX SEVEN',
    );
    expect(cleanReply('As an AI I cannot')).toBeNull();
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
    expect(textOf(step)).toContain('<BT> CAT CAUGHT A MOUSE <BT> MI2RK DE');
    expect(textOf(step)).not.toContain('MY CAT SAYS HI');
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

  it('remembers what you told each operator, the last few lines (ADR 0037)', () => {
    const c = makeContact(op('ruth'), me, false, () => 0);
    const res = airResult(c, {}, []);
    let r = NEW_PROGRESS.radio;
    for (const n of ['A', 'B', 'C', 'D'])
      r = applyContact(r, 'ruth', res, 'd', false, undefined, n);
    expect(toldOf(r, 'ruth')).toEqual(['B', 'C', 'D']);
    expect(memoryOf(r, 'ruth')).toEqual({ past: [], told: ['B', 'C', 'D'] });
    const saved = parseProgress(JSON.parse(JSON.stringify({ ...NEW_PROGRESS, radio: r })));
    expect(toldOf(saved.radio, 'ruth')).toEqual(['B', 'C', 'D']);
  });
});
