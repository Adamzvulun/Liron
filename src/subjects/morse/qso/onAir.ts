// On the air (E16): after the Far Station, operators call CQ in the Radio Room every day, each
// with their own speed, fist and band. Pure rules here: the cast, the day's pick, a contact's
// turns, its result and the logbook. The screen is RadioRoom.tsx; the sound is band.ts.
// Design: docs/game/radio-qso.md.

import { z } from 'zod';
import pack from '../../../../content/morse/operators.json' with { type: 'json' };
import type { SubjectApi } from '../../../core/subject.ts';
import { MORSE_CHARS } from '../code.ts';
import type { MorseProgress } from '../lesson/progress.ts';
import { makeCallsign } from '../words/rush.ts';
import { farPassed, keyedRight } from './farStation.ts';
import { LOG_KEEP, type Radio } from './radio.ts';

export { LOG_KEEP, type Radio };

const Operator = z.object({
  name: z.string().regex(/^[A-Z]+$/),
  who: z.string(),
  about: z.string(),
  call: z.string().regex(/^Q[A-Z0-9]+$/),
  qth: z.string().regex(/^[A-Z]+$/),
  wpm: z.number().int().min(10).max(30),
  opensAt: z.number().int().min(0),
  terse: z.boolean().optional(),
  fist: z.object({ weight: z.number(), swing: z.number(), jitter: z.number().min(0).max(0.3) }),
  band: z.object({
    noise: z.number().min(0).max(1),
    qsb: z.number().min(0).max(1),
    qrm: z.number().min(0).max(1),
  }),
  rst: z.array(z.string().regex(/^[1-5][1-9N][1-9N]$/)).min(1),
  temps: z.array(z.string().regex(/^\d+$/)).min(1),
  greet: z.string(),
  greetAgain: z.string(),
  chat: z.string(),
  agn: z.string().min(1),
  sign: z.string().min(1),
});

export type Operator = z.infer<typeof Operator> & { id: string };

/** The cast, in the order they open. */
export const OPERATORS: readonly Operator[] = pack.items
  .map((i) => ({ id: i.id.replace('operator:', ''), ...Operator.parse(i.data) }))
  .sort((a, b) => a.opensAt - b.opensAt);

/** How many operators call each day. */
export const ON_AIR = 3;
export const RADIO_XP = { logged: 25, try: 5 };
/** QRS takes a station down this many wpm a time, to no slower than SLOWEST_WPM. */
export const QRS_STEP = 5;
export const SLOWEST_WPM = 10;

/** You on the air: your callsign, name and town, kept between contacts. */
export interface Station {
  call: string;
  name: string;
  qth: string;
}

/** The room opens once the Far Station (the Operator's trial) is passed. */
export const roomOpen = (p: MorseProgress) => farPassed(p);

/** Your station, once you've set it up. */
export function stationOf(r: Radio): Station | null {
  return r.call && r.name && r.qth ? { call: r.call, name: r.name, qth: r.qth } : null;
}

/** Letters only, in capitals, cut to `max`. */
export const lettersOnly = (s: string, max: number) =>
  s
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, max);

/** Sets your name and town; makes your callsign the first time, and keeps it after. */
export function setUpStation(
  r: Radio,
  name: string,
  qth: string,
  random: () => number = Math.random,
): Radio {
  const koch = MORSE_CHARS.map((c) => c.char);
  let call = r.call;
  while (!call || OPERATORS.some((o) => o.call === call)) call = makeCallsign(koch, random);
  return { ...r, call, name: lettersOnly(name, 8) || 'OP', qth: lettersOnly(qth, 10) || 'HOME' };
}

/** Operators whose door is open: each opens after enough logged contacts. */
export const openOperators = (r: Radio) => OPERATORS.filter((o) => o.opensAt <= r.contacts);

/** The next operator to open, and how many more contacts it takes. */
export function nextToOpen(r: Radio): { op: Operator; more: number } | null {
  const op = OPERATORS.find((o) => o.opensAt > r.contacts);
  return op ? { op, more: op.opensAt - r.contacts } : null;
}

/** A small, stable hash of a string (FNV-1a), for the day's pick. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return h;
}

/**
 * Who's calling today: ON_AIR of the open operators, the same all day. The newest one to open
 * is always among them, so a new door is felt at once.
 */
export function onAirToday(r: Radio, day: string): Operator[] {
  const open = openOperators(r);
  if (open.length <= ON_AIR) return open;
  const newest = open[open.length - 1] as Operator;
  const rest = open
    .slice(0, -1)
    .map((o) => ({ o, k: hash(`${day}:${o.id}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, ON_AIR - 1)
    .map((x) => x.o);
  return [...rest, newest].sort((a, b) => a.opensAt - b.opensAt || a.id.localeCompare(b.id));
}

/** How many contacts you've logged with an operator. */
export const workedWith = (r: Radio, op: string) => r.log.filter((l) => l.op === op && l.ok).length;

/** What you copy from a hearing. */
export type AirField = 'call' | 'rst' | 'name' | 'qth' | 'temp';

export type AirStep =
  { kind: 'hear'; text: string; fields: readonly AirField[] } | { kind: 'key'; text: string };

export interface Contact {
  op: Operator;
  me: Station;
  /** The report they give you, and the temperature they mention. */
  rst: string;
  temp: string;
  /** You've logged a contact with them before. */
  again: boolean;
}

const pick = <T>(from: readonly T[], random: () => number) =>
  from[Math.floor(random() * from.length)] as T;

export function makeContact(
  op: Operator,
  me: Station,
  again: boolean,
  random: () => number = Math.random,
): Contact {
  return { op, me, rst: pick(op.rst, random), temp: pick(op.temps, random), again };
}

const fill = (text: string, c: Contact) =>
  text
    .replaceAll('{my}', c.me.name)
    .replaceAll('{me}', c.me.call)
    .replaceAll('{temp}', c.temp)
    .replace(/\s+/g, ' ')
    .trim();

/** A contact turn by turn, as real operators send it. A contest station keeps it short. */
export function contactSteps(c: Contact): AirStep[] {
  const { op, me } = c;
  if (op.terse) {
    return [
      { kind: 'hear', text: `CQ TEST ${op.call} ${op.call} TEST`, fields: ['call'] },
      { kind: 'key', text: me.call },
      { kind: 'hear', text: `${me.call} ${c.rst} ${op.qth}`, fields: ['rst', 'qth'] },
      { kind: 'key', text: `TU 5NN ${me.qth}` },
      { kind: 'hear', text: fill(`${op.sign} ${op.call} TEST`, c), fields: [] },
    ];
  }
  const greet = fill(c.again ? op.greetAgain : op.greet, c);
  return [
    { kind: 'hear', text: `CQ CQ CQ DE ${op.call} ${op.call} K`, fields: ['call'] },
    { kind: 'key', text: `${op.call} DE ${me.call} K` },
    {
      kind: 'hear',
      text: fill(
        `${me.call} DE ${op.call} ${greet} TNX FER CALL <BT> UR RST ${c.rst} ${c.rst} ` +
          `<BT> NAME ${op.name} ${op.name} <BT> QTH ${op.qth} ${op.qth} <BT> HW? ` +
          `${me.call} DE ${op.call} KN`,
        c,
      ),
      fields: ['rst', 'name', 'qth'],
    },
    {
      kind: 'key',
      text: `R TU ${op.name} UR RST 599 <BT> NAME ${me.name} <BT> QTH ${me.qth} K`,
    },
    {
      kind: 'hear',
      text: fill(`${me.call} DE ${op.call} ${op.chat} <BT> ${me.call} DE ${op.call} KN`, c),
      fields: ['temp'],
    },
    { kind: 'key', text: `TU ${op.name} 73 <SK>` },
    { kind: 'hear', text: fill(`${op.sign} ${me.call} DE ${op.call}`, c), fields: [] },
  ];
}

export function airAnswer(c: Contact, f: AirField): string {
  switch (f) {
    case 'call':
      return c.op.call;
    case 'rst':
      return c.rst;
    case 'name':
      return c.op.name;
    case 'qth':
      return c.op.qth;
    case 'temp':
      return c.temp;
  }
}

/** N is the contesters' short 9 (5NN is 599); a temperature may come with its C. */
const clean = (s: string) =>
  s
    .toUpperCase()
    .replace(/[\s<>]/g, '')
    .replace(/N/g, '9')
    .replace(/^(\d+)C$/, '$1');

export function airRight(c: Contact, f: AirField, typed: string): boolean {
  const want = airAnswer(c, f);
  if (f === 'rst' || f === 'temp') return clean(typed) === clean(want);
  return typed.toUpperCase().replace(/\s/g, '') === want;
}

export interface AirResult {
  copied: number;
  copyTotal: number;
  keyed: number;
  keyTotal: number;
  logged: boolean;
}

export function airResult(
  c: Contact,
  copies: Partial<Record<AirField, string>>,
  reads: readonly string[],
): AirResult {
  const steps = contactSteps(c);
  const fields = steps.flatMap((s) => (s.kind === 'hear' ? s.fields : []));
  const keys = steps.flatMap((s) => (s.kind === 'key' ? [s.text] : []));
  const copied = fields.filter((f) => airRight(c, f, copies[f] ?? '')).length;
  const keyed = keys.filter((t, i) => keyedRight(t, reads[i] ?? '')).length;
  return {
    copied,
    copyTotal: fields.length,
    keyed,
    keyTotal: keys.length,
    logged: copied === fields.length && keyed === keys.length,
  };
}

/** The Signal Master's QSO: logged at 25 wpm or faster, with no AGN, no QRS and no resend. */
export const SIGNAL_MASTER_WPM = 25;
export const isCleanFast = (c: Contact, res: AirResult, repeats: number) =>
  res.logged && repeats === 0 && c.op.wpm >= SIGNAL_MASTER_WPM;

/** The contact goes in the log; a logged one counts toward the next door. */
export function applyContact(
  r: Radio,
  op: string,
  res: AirResult,
  day: string,
  cleanFast = false,
): Radio {
  return {
    ...r,
    contacts: r.contacts + (res.logged ? 1 : 0),
    cleanFast: r.cleanFast || cleanFast,
    log: [...r.log, { op, day, ok: res.logged }].slice(-LOG_KEEP),
  };
}

/**
 * What a contact tells the daily contracts and achievements: `qso` for every try, `qso-logged`
 * and `worked-<operator>` for a logged one, and `qso-clean-fast` for the Signal Master's QSO.
 */
export function radioEvents(c: Contact, res: AirResult, cleanFast: boolean): { kind: string }[] {
  return [
    { kind: 'qso' },
    ...(res.logged ? [{ kind: 'qso-logged' }, { kind: `worked-${c.op.id}` }] : []),
    ...(cleanFast ? [{ kind: 'qso-clean-fast' }] : []),
  ];
}

/** Saves the room: a contact pays XP (none for setting up your station). */
export async function reportRadio(
  api: SubjectApi,
  next: MorseProgress,
  res: AirResult | null,
  seconds: number,
  events: readonly { kind: string }[] = [],
  at = new Date(),
): Promise<void> {
  await api.saveSession({
    state: next,
    xp: res ? (res.logged ? RADIO_XP.logged : RADIO_XP.try) : 0,
    minutes: seconds / 60,
    events: [...events],
    at,
  });
}

/** QRS: this many wpm slower, or null at the slowest. */
export const slower = (wpm: number) => (wpm - QRS_STEP >= SLOWEST_WPM ? wpm - QRS_STEP : null);

/** Today in the browser's time zone, as YYYY-MM-DD: the day's pick and the log use it. */
export function radioDay(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
