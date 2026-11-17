import { describe, expect, it, vi } from 'vitest';
import type { SubjectApi } from '../../../core/subject.ts';
import { NEW_PROGRESS } from '../lesson/progress.ts';
import { PROSIGNS } from '../words.ts';
import {
  applyFar,
  farOpen,
  fieldRight,
  keyedRight,
  knowsProsigns,
  makeQso,
  PROSIGN_CHOICES,
  qsoResult,
  qsoSteps,
  reportFar,
  type Qso,
} from './farStation.ts';

const q: Qso = { far: 'K5AT', me: 'MI2RK', rst: '579', name: 'ANN', town: 'OSLO' };
const allRight = { call: 'K5AT', rst: '579', name: 'ann', town: 'Oslo', prosign: 'SK' };
const keyedAll = ['K5AT DE MI2RK K', 'TU ANN 73'];

describe('the Far Station (#178)', () => {
  it('makes a contact with two different callsigns', () => {
    let n = 0;
    // A random that repeats its first values would give the same call twice.
    const seq = [0, 0, 0, 0, 0, 0, 0, 0, 0.9, 0.5, 0.5, 0.5, 0.5];
    const c = makeQso(() => seq[n++ % seq.length] ?? 0);
    expect(c.far).not.toBe(c.me);
    expect(c.far).toMatch(/^[A-Z0-9]+[0-9][A-Z]{1,3}$/);
  });

  it('runs the contact as hams do: CQ, answer, report, thanks, SK', () => {
    const steps = qsoSteps(q);
    expect(steps.map((s) => s.kind)).toEqual(['hear', 'key', 'hear', 'key', 'hear']);
    expect(steps[0]).toMatchObject({ text: 'CQ CQ DE K5AT K5AT K', fields: ['call'] });
    expect(steps[1]).toMatchObject({ text: 'K5AT DE MI2RK K' });
    expect(steps[2]?.text).toContain('UR RST 579 579');
    expect(steps[2]?.text).toContain('NAME ANN ANN');
    expect(steps[2]?.text).toContain('QTH OSLO OSLO');
    expect(steps[4]?.text).toBe('TU 73 DE K5AT <SK>');
    expect(PROSIGN_CHOICES).toEqual(PROSIGNS.map((p) => p.text));
  });

  it('passes only with every field copied and every turn read', () => {
    expect(fieldRight(q, 'prosign', '<sk>')).toBe(true);
    expect(qsoResult(q, allRight, keyedAll)).toEqual({
      copied: 5,
      copyTotal: 5,
      keyed: 2,
      keyTotal: 2,
      passed: true,
    });
    expect(qsoResult(q, { ...allRight, town: 'ROME' }, keyedAll).passed).toBe(false);
    expect(qsoResult(q, allRight, ['K5AT DE MI2RK K', 'TU ANN']).keyed).toBe(1);
    // An extra stray letter in the reading doesn't cost the turn.
    expect(keyedRight('TU ANN 73', 'E TU ANN 73')).toBe(true);
  });

  it('opens after the Lamp Signal and is passed once', async () => {
    expect(farOpen(NEW_PROGRESS)).toBe(false);
    const keyer = { ...NEW_PROGRESS, rankTrials: ['lamp-signal'] };
    expect(farOpen(keyer)).toBe(true);
    const pass = qsoResult(q, allRight, keyedAll);
    const next = applyFar(keyer, pass);
    expect(next.rankTrials).toEqual(['lamp-signal', 'far-station']);
    expect(applyFar(next, pass)).toBe(next);

    const saveSession = vi.fn().mockResolvedValue(undefined);
    const api = { saveSession } as unknown as SubjectApi;
    await reportFar(api, keyer, next, pass, 120);
    await reportFar(api, next, next, pass, 120);
    expect(saveSession.mock.calls[0]?.[0]).toMatchObject({
      xp: 60,
      minutes: 2,
      events: [{ kind: 'trial-far-station' }],
    });
    expect(saveSession.mock.calls[1]?.[0]).toMatchObject({ xp: 10, events: [] });
  });

  it('knows the prosigns once all four are copied', () => {
    expect(knowsProsigns(NEW_PROGRESS)).toBe(false);
    expect(knowsProsigns({ ...NEW_PROGRESS, prosigns: PROSIGNS.map((p) => p.id) })).toBe(true);
  });
});
