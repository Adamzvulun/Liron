import { describe, expect, it, vi } from 'vitest';
import type { SubjectApi } from '../../../core/subject.ts';
import { NEW_PROGRESS, parseProgress } from '../lesson/progress.ts';
import { MORSE_RANKS, morseMet } from '../ranks.ts';
import type { Route } from '../player.ts';
import { bandRoute, qsbDepth } from './band.ts';
import {
  airResult,
  airRight,
  applyContact,
  contactSteps,
  LOG_KEEP,
  makeContact,
  nextToOpen,
  ON_AIR,
  onAirToday,
  openOperators,
  OPERATORS,
  isCleanFast,
  radioDay,
  radioEvents,
  reportRadio,
  roomOpen,
  setUpStation,
  slower,
  opWpm,
  stationOf,
  workedWith,
  type AirStep,
  type Operator,
  type Radio,
} from './onAir.ts';

const fresh: Radio = NEW_PROGRESS.radio;
const textOf = (s?: AirStep) => (s && 'text' in s ? s.text : undefined);
const op = (id: string) => OPERATORS.find((o) => o.id === id) as Operator;
const me = { call: 'MI2RK', name: 'ADAM', qth: 'HAIFA' };

describe('the cast (E16)', () => {
  it('has six operators with made-up calls, three open at once', () => {
    expect(OPERATORS.map((o) => o.id)).toEqual(['nils', 'marta', 'ivo', 'kai', 'ruth', 'dex']);
    // Q is never a real country prefix, so the calls can't belong to anyone.
    for (const o of OPERATORS) expect(o.call).toMatch(/^Q/);
    expect(openOperators(fresh).map((o) => o.id)).toEqual(['nils', 'marta', 'ivo']);
    expect(nextToOpen(fresh)).toMatchObject({ op: { id: 'kai' }, more: 3 });
    expect(nextToOpen({ ...fresh, contacts: 10 })).toBeNull();
  });

  it('opens after the Far Station', () => {
    expect(roomOpen(NEW_PROGRESS)).toBe(false);
    expect(roomOpen({ ...NEW_PROGRESS, rankTrials: ['lamp-signal', 'far-station'] })).toBe(true);
  });

  it('picks the same operators all day, always with the newest door', () => {
    const r = { ...fresh, contacts: 10 };
    const a = onAirToday(r, '2026-11-10');
    expect(a).toHaveLength(ON_AIR);
    expect(onAirToday(r, '2026-11-10')).toEqual(a);
    expect(a.map((o) => o.id)).toContain('dex');
    const days = Array.from({ length: 30 }, (_, i) => `2026-12-${String(i + 1).padStart(2, '0')}`);
    const seen = new Set(days.flatMap((d) => onAirToday(r, d).map((o) => o.id)));
    expect(seen.size).toBe(OPERATORS.length);
  });
});

describe('your station', () => {
  it('gets a callsign once and keeps it; name and town are letters only', () => {
    expect(stationOf(fresh)).toBeNull();
    const r = setUpStation(fresh, 'ad-am 1', 'Haifa!');
    expect(r).toMatchObject({ name: 'ADAM', qth: 'HAIFA' });
    expect(r.call).toMatch(/^[A-Z0-9]+$/);
    expect(OPERATORS.map((o) => o.call)).not.toContain(r.call);
    const again = setUpStation(r, 'Liron', '');
    expect(again).toMatchObject({ call: r.call, name: 'LIRON', qth: 'HOME' });
    expect(stationOf(again)).toEqual({ call: r.call, name: 'LIRON', qth: 'HOME' });
  });

  it('is saved with the Morse progress, and broken saves start fresh', () => {
    const saved = parseProgress({ radio: { call: 'MI2RK', name: 'ADAM', qth: 'HAIFA' } });
    expect(saved.radio).toMatchObject({ call: 'MI2RK', contacts: 0, log: [] });
    expect(parseProgress({ radio: 'junk' }).radio).toEqual(fresh);
    expect(parseProgress({ radio: { name: 'not ok!' } }).radio.name).toBeNull();
  });
});

describe('a contact', () => {
  const c = makeContact(op('marta'), me, false, () => 0);

  it('runs as real operators send it, in their own words', () => {
    const steps = contactSteps(c);
    expect(steps.map((s) => s.kind)).toEqual([
      'hear',
      'key',
      'hear',
      'key',
      'hear',
      'free',
      'key',
      'hear',
    ]);
    expect(steps[0]).toMatchObject({ text: 'CQ CQ CQ DE QM2RTA QM2RTA K', fields: ['call'] });
    expect(steps[1]).toMatchObject({ text: 'QM2RTA DE MI2RK K' });
    expect(textOf(steps[2])).toContain('GM DR OM TNX FER CALL');
    expect(textOf(steps[2])).toContain('UR RST 579 579');
    expect(textOf(steps[2])).toContain('NAME MARTA MARTA');
    expect(textOf(steps[3])).toBe('R TU MARTA UR RST 599 <BT> NAME ADAM <BT> QTH HAIFA K');
    expect(textOf(steps[4])).toContain('R TNX ADAM');
    expect(textOf(steps[4])).toContain('TEMP 18C');
    expect(textOf(steps[7])).toBe('TNX FER QSO ADAM 73 <SK> MI2RK DE QM2RTA');
  });

  it('answers the news you keyed before signing, live or with a plain FB (ADR 0037)', () => {
    const sign = (x: typeof c) => textOf(contactSteps(x)[7]);
    expect(sign({ ...c, yours: 'NEW JOB' })).toBe(
      'R R FB <BT> TNX FER QSO ADAM 73 <SK> MI2RK DE QM2RTA',
    );
    expect(sign({ ...c, yours: 'NEW JOB', reply: 'FB ON UR NEW JOB, GL' })).toBe(
      'FB ON UR NEW JOB, GL <BT> TNX FER QSO ADAM 73 <SK> MI2RK DE QM2RTA',
    );
    // The free turn isn't scored: the log needs the same copies and keys as before.
    const res = airResult({ ...c, yours: 'NEW JOB' }, {}, []);
    expect(res.keyTotal).toBe(3);
  });

  it('greets an old friend', () => {
    const again = makeContact(op('marta'), me, true, () => 0);
    expect(textOf(contactSteps(again)[2])).toContain('GM ADAM GLAD TO CU AGN');
  });

  it('keeps a contest contact short, with 5NN', () => {
    const d = makeContact(op('dex'), me, false, () => 0);
    const steps = contactSteps(d);
    expect(steps).toHaveLength(5);
    expect(steps[2]).toMatchObject({ text: 'MI2RK 5NN OHIO', fields: ['rst', 'qth'] });
    expect(airRight(d, 'rst', '599')).toBe(true);
    expect(airRight(d, 'rst', '5nn')).toBe(true);
    expect(airRight(d, 'rst', '589')).toBe(false);
  });

  it('copies forgivingly: case, spaces and a temperature’s C', () => {
    expect(airRight(c, 'name', 'mar ta')).toBe(true);
    expect(airRight(c, 'temp', '18c')).toBe(true);
    expect(airRight(c, 'temp', '18')).toBe(true);
    expect(airRight(c, 'temp', '81')).toBe(false);
  });

  it('is logged only when every part is copied and every turn read', () => {
    const copies = { call: 'QM2RTA', rst: '579', name: 'MARTA', qth: 'PORTO', temp: '18' };
    const keys = contactSteps(c).flatMap((s) => (s.kind === 'key' ? [s.text] : []));
    expect(airResult(c, copies, keys)).toEqual({
      copied: 5,
      copyTotal: 5,
      keyed: 3,
      keyTotal: 3,
      logged: true,
    });
    const missed = airResult(c, { ...copies, temp: '20' }, keys);
    expect(missed).toMatchObject({ copied: 4, logged: false });
    const garbled = airResult(c, copies, [keys[0] ?? '', 'EEE', keys[2] ?? '']);
    expect(garbled).toMatchObject({ keyed: 2, logged: false });
  });

  it('goes in the log; logged ones count toward the next door', () => {
    const res = { copied: 5, copyTotal: 5, keyed: 3, keyTotal: 3, logged: true };
    let r = applyContact(fresh, 'marta', res, '2026-11-10');
    r = applyContact(r, 'marta', { ...res, logged: false }, '2026-11-10');
    expect(r.contacts).toBe(1);
    expect(r.log).toEqual([
      { op: 'marta', day: '2026-11-10', ok: true },
      { op: 'marta', day: '2026-11-10', ok: false },
    ]);
    expect(workedWith(r, 'marta')).toBe(1);
    for (let i = 0; i < LOG_KEEP + 5; i++) r = applyContact(r, 'nils', res, '2026-11-11');
    expect(r.log).toHaveLength(LOG_KEEP);
    expect(r.contacts).toBe(LOG_KEEP + 6);
  });

  it('pays XP for a contact and none for setting up', async () => {
    const saveSession = vi.fn().mockResolvedValue(undefined);
    const api = { saveSession } as unknown as SubjectApi;
    const res = { copied: 5, copyTotal: 5, keyed: 3, keyTotal: 3, logged: true };
    await reportRadio(api, NEW_PROGRESS, res, 120);
    await reportRadio(api, NEW_PROGRESS, { ...res, logged: false }, 60);
    await reportRadio(api, NEW_PROGRESS, null, 0);
    await reportRadio(api, NEW_PROGRESS, res, 60, [{ kind: 'qso' }]);
    expect(saveSession.mock.calls.map(([a]) => a.xp)).toEqual([25, 5, 0, 25]);
    expect(saveSession.mock.calls[3]?.[0].events).toEqual([{ kind: 'qso' }]);
    expect(saveSession.mock.calls[0]?.[0]).toMatchObject({ minutes: 2, events: [] });
  });

  it('slows down 5 wpm a time, to no slower than 10', () => {
    expect(slower(18)).toBe(13);
    expect(slower(15)).toBe(10);
    expect(slower(12)).toBe(10);
    expect(slower(13)).toBe(10);
    expect(slower(10)).toBeNull();
  });

  it('dates the log in local time', () => {
    expect(radioDay(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('operators follow your speed (#510)', () => {
  it('plays at 25 for a 25 wpm player, keeping each operator’s own offset', () => {
    expect(opWpm(op('dex'), 25)).toBe(op('dex').wpm + 5);
    expect(opWpm(op('dex'), 20)).toBe(op('dex').wpm);
    expect(opWpm(op('dex'), 18)).toBe(op('dex').wpm);
    expect(opWpm(op('dex'), 35)).toBeLessThanOrEqual(35);
  });

  it('counts a clean contact at the speed it was played', () => {
    const res = { copied: 5, copyTotal: 5, keyed: 3, keyTotal: 3, logged: true };
    const c = makeContact(op('ivo'), me, false, () => 0);
    expect(isCleanFast(c, res, 0)).toBe(false);
    expect(isCleanFast(c, res, 0, 25)).toBe(true);
  });
});

describe('the Signal Master’s QSO and what a contact sends', () => {
  const res = { copied: 5, copyTotal: 5, keyed: 3, keyTotal: 3, logged: true };
  const dex = makeContact(op('dex'), me, false, () => 0);
  const ivo = makeContact(op('ivo'), me, false, () => 0);

  it('is logged at 25 wpm with no repeats', () => {
    expect(isCleanFast(dex, res, 0)).toBe(true);
    expect(isCleanFast(dex, res, 1)).toBe(false);
    expect(isCleanFast(dex, { ...res, logged: false }, 0)).toBe(false);
    expect(isCleanFast(ivo, res, 0)).toBe(false);
  });

  it('is kept once made, and opens the Signal Master rank', () => {
    const r = applyContact(fresh, 'dex', res, '2026-11-10', true);
    expect(applyContact(r, 'dex', res, '2026-11-11').cleanFast).toBe(true);
    const master = MORSE_RANKS.find((k) => k.id === 'signal-master');
    expect(master?.later).toBeUndefined();
    if (!master) throw new Error('no Signal Master');
    expect(morseMet(master, NEW_PROGRESS)).toEqual([false]);
    expect(morseMet(master, { ...NEW_PROGRESS, radio: r })).toEqual([true]);
  });

  it('tells the contracts and achievements what happened', () => {
    expect(radioEvents(ivo, { ...res, logged: false }, false)).toEqual([{ kind: 'qso' }]);
    expect(radioEvents(dex, res, true)).toEqual([
      { kind: 'qso' },
      { kind: 'qso-logged' },
      { kind: 'worked-dex' },
      { kind: 'qso-clean-fast' },
    ]);
  });
});

describe('the band', () => {
  it('leaves a clear band alone', () => {
    expect(bandRoute({ noise: 0, qsb: 0, qrm: 0 })).toBeUndefined();
    expect(qsbDepth(0)).toBe(0);
    expect(qsbDepth(2)).toBeLessThanOrEqual(1);
  });

  it('adds noise, fading and another station, and stops them with the sound', () => {
    const nodes: Record<string, unknown>[] = [];
    const node = (kind: string, extra: object = {}) => {
      const n: Record<string, unknown> = {
        kind,
        connect: vi.fn((to: unknown) => to),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        ...extra,
      };
      nodes.push(n);
      return n;
    };
    const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() });
    const ctx = {
      sampleRate: 8000,
      createGain: () => node('gain', { gain: param() }),
      createOscillator: () => node('osc', { frequency: param() }),
      createBufferSource: () => node('noise', { buffer: null, loop: false }),
      createBiquadFilter: () => node('filter', { type: '', frequency: param(), Q: param() }),
      createBuffer: (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) }),
    } as unknown as BaseAudioContext;
    const ends: (() => void)[] = [];
    const life = { startsAt: 1, endsAt: 9, onEnd: (f: () => void) => ends.push(f) };
    const keyed = node('keyed') as unknown as AudioNode;
    const route = bandRoute(op('ruth').band, 600, () => 0.5) as Route;
    route(keyed, ctx, life);
    const sources = nodes.filter((n) => n.kind === 'osc' || n.kind === 'noise');
    expect(sources.map((n) => n.kind).sort()).toEqual(['noise', 'osc', 'osc']);
    for (const s of sources) expect(s.start).toHaveBeenCalled();
    ends.forEach((f) => f());
    for (const s of sources) expect(s.stop).toHaveBeenCalled();
  });
});
