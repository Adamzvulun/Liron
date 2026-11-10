import { describe, expect, it, vi } from 'vitest';
import type { SubjectApi } from '../../../core/subject.ts';
import { NEW_PROGRESS, parseProgress } from '../lesson/progress.ts';
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
  radioDay,
  reportRadio,
  roomOpen,
  setUpStation,
  slower,
  stationOf,
  workedWith,
  type Operator,
  type Radio,
} from './onAir.ts';

const fresh: Radio = NEW_PROGRESS.radio;
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
    expect(steps.map((s) => s.kind)).toEqual(['hear', 'key', 'hear', 'key', 'hear', 'key', 'hear']);
    expect(steps[0]).toMatchObject({ text: 'CQ CQ CQ DE QM2RTA QM2RTA K', fields: ['call'] });
    expect(steps[1]).toMatchObject({ text: 'QM2RTA DE MI2RK K' });
    expect(steps[2]?.text).toContain('GM DR OM TNX FER CALL');
    expect(steps[2]?.text).toContain('UR RST 579 579');
    expect(steps[2]?.text).toContain('NAME MARTA MARTA');
    expect(steps[3]?.text).toBe('R TU MARTA UR RST 599 <BT> NAME ADAM <BT> QTH HAIFA K');
    expect(steps[4]?.text).toContain('R TNX ADAM');
    expect(steps[4]?.text).toContain('TEMP 18C');
    expect(steps[6]?.text).toBe('TNX FER QSO ADAM 73 <SK> MI2RK DE QM2RTA');
  });

  it('greets an old friend', () => {
    const again = makeContact(op('marta'), me, true, () => 0);
    expect(contactSteps(again)[2]?.text).toContain('GM ADAM GLAD TO CU AGN');
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
    expect(saveSession.mock.calls.map(([a]) => a.xp)).toEqual([25, 5, 0]);
    expect(saveSession.mock.calls[0]?.[0]).toMatchObject({ minutes: 2, events: [] });
  });

  it('slows down 5 wpm a time, to no slower than 10', () => {
    expect(slower(18)).toBe(13);
    expect(slower(15)).toBe(10);
    expect(slower(12)).toBeNull();
  });

  it('dates the log in local time', () => {
    expect(radioDay(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
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
