// The Far Station (#178, E13): the Operator's trial, your first QSO (a radio contact). A far
// station calls CQ; you copy its call, answer it with the key, copy its report (signal report,
// name and town), send your thanks, and say which prosign closed the contact. Pure rules here;
// the screen is FarStation.tsx. Design: docs/game/ranks-and-achievements.md §2.

import type { SubjectApi } from '../../../core/subject.ts';
import { MORSE_CHARS } from '../code.ts';
import type { MorseProgress } from '../lesson/progress.ts';
import { wordsRight } from '../send/lampSignal.ts';
import { makeCallsign } from '../words/rush.ts';
import { PROSIGNS } from '../words.ts';

export const FAR_ID = 'far-station';
/** The far station keys at 20 wpm with standard spacing, like a real operator on the air. */
export const FAR_WPM = 20;
export const FAR_XP = { pass: 60, try: 10 };

const RSTS = ['599', '589', '579', '569'] as const;
export const NAMES = ['TOM', 'ANN', 'JIM', 'SUE', 'BOB', 'MAX', 'LEE', 'KAY', 'DAN', 'EVA'];
export const TOWNS = ['OSLO', 'ROME', 'LIMA', 'BERN', 'RIGA', 'NICE', 'BONN', 'PERTH', 'DOVER'];

export interface Qso {
  /** The far station's call. */
  far: string;
  /** Yours, for this contact. */
  me: string;
  rst: string;
  name: string;
  town: string;
}

const KOCH = MORSE_CHARS.map((c) => c.char);
const pick = <T>(from: readonly T[], random: () => number) =>
  from[Math.floor(random() * from.length)] as T;

/** A contact: two different made-up calls, a signal report, a name and a town. */
export function makeQso(random: () => number = Math.random): Qso {
  const far = makeCallsign(KOCH, random);
  let me = makeCallsign(KOCH, random);
  while (me === far) me = makeCallsign(KOCH, random);
  return { far, me, rst: pick(RSTS, random), name: pick(NAMES, random), town: pick(TOWNS, random) };
}

/** What you copy from one hearing. */
export type CopyField = 'call' | 'rst' | 'name' | 'town' | 'prosign';

export type QsoStep =
  { kind: 'hear'; text: string; fields: readonly CopyField[] } | { kind: 'key'; text: string };

/**
 * The contact, turn by turn, as hams send it: the far station calls, you answer, it reports,
 * you thank it, it signs off with SK (end of contact).
 */
export function qsoSteps(q: Qso): QsoStep[] {
  return [
    { kind: 'hear', text: `CQ CQ DE ${q.far} ${q.far} K`, fields: ['call'] },
    { kind: 'key', text: `${q.far} DE ${q.me} K` },
    {
      kind: 'hear',
      text:
        `${q.me} DE ${q.far} <BT> UR RST ${q.rst} ${q.rst} <BT> NAME ${q.name} ${q.name} ` +
        `<BT> QTH ${q.town} ${q.town} <AR> ${q.me} DE ${q.far} <KN>`,
      fields: ['rst', 'name', 'town'],
    },
    { kind: 'key', text: `TU ${q.name} 73` },
    { kind: 'hear', text: `TU 73 DE ${q.far} <SK>`, fields: ['prosign'] },
  ];
}

/** The right answer for each field. */
export function answerFor(q: Qso, f: CopyField): string {
  switch (f) {
    case 'call':
      return q.far;
    case 'rst':
      return q.rst;
    case 'name':
      return q.name;
    case 'town':
      return q.town;
    case 'prosign':
      return 'SK';
  }
}

/** The prosigns to choose from when asked which one closed the contact. */
export const PROSIGN_CHOICES = PROSIGNS.map((p) => p.text);

const clean = (s: string) => s.toUpperCase().replace(/[\s<>]/g, '');

export const fieldRight = (q: Qso, f: CopyField, typed: string) =>
  clean(typed) === clean(answerFor(q, f));

/** A keyed turn is read right when every word of it is in the tower's reading, in order. */
export function keyedRight(text: string, read: string): boolean {
  const sent = text.split(' ');
  return wordsRight(sent, read.split(' ').filter(Boolean)) === sent.length;
}

export interface QsoResult {
  /** Fields copied right, of all of them. */
  copied: number;
  copyTotal: number;
  /** Keyed turns the far station could read. */
  keyed: number;
  keyTotal: number;
  passed: boolean;
}

export function qsoResult(
  q: Qso,
  copies: Partial<Record<CopyField, string>>,
  reads: readonly string[],
): QsoResult {
  const steps = qsoSteps(q);
  const fields = steps.flatMap((s) => (s.kind === 'hear' ? s.fields : []));
  const keys = steps.flatMap((s) => (s.kind === 'key' ? [s.text] : []));
  const copied = fields.filter((f) => fieldRight(q, f, copies[f] ?? '')).length;
  const keyed = keys.filter((t, i) => keyedRight(t, reads[i] ?? '')).length;
  return {
    copied,
    copyTotal: fields.length,
    keyed,
    keyTotal: keys.length,
    passed: copied === fields.length && keyed === keys.length,
  };
}

/** The trial opens once the Lamp Signal is passed (you're a Keyer, and can send). */
export const farOpen = (p: MorseProgress) => p.rankTrials.includes('lamp-signal');

export const farPassed = (p: MorseProgress) => p.rankTrials.includes(FAR_ID);

export function applyFar(p: MorseProgress, r: QsoResult): MorseProgress {
  return r.passed && !farPassed(p) ? { ...p, rankTrials: [...p.rankTrials, FAR_ID] } : p;
}

/** Saves a contact; a first pass sends `trial-far-station` (ADR 0035). */
export async function reportFar(
  api: SubjectApi,
  before: MorseProgress,
  next: MorseProgress,
  r: QsoResult,
  seconds: number,
  at = new Date(),
): Promise<void> {
  const first = r.passed && !farPassed(before);
  await api.saveSession({
    state: next,
    xp: first ? FAR_XP.pass : FAR_XP.try,
    minutes: seconds / 60,
    events: first ? [{ kind: `trial-${FAR_ID}` }] : [],
    at,
  });
}

/** The Operator's other condition: every prosign copied right at least once in the Codebook. */
export const knowsProsigns = (p: MorseProgress) => PROSIGNS.every((s) => p.prosigns.includes(s.id));
