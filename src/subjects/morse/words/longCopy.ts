// The Long Copy (#509, E12/Phase 12): a QSO-like line of 6 to 12 words, from the Radio Room's
// operators, heard at your speed with nothing shown until it ends; then three questions (head
// copy). From 28 wpm it plays once and you type it a word behind (copy behind), graded on the
// words. Pure rules here; the screen is LongCopy.tsx. Design: docs/game/morse-speed.md §3.

import { z } from 'zod';
import pack from '../../../../content/morse/longcopy.json' with { type: 'json' };
import type { SubjectApi } from '../../../core/subject.ts';
import type { FinaleQuestion } from '../qso/fortyWinters.ts';
import type { Operator } from '../qso/onAir.ts';
import { OPERATORS } from '../qso/onAir.ts';
import { shuffle } from './drill.ts';

/** From this character speed the line plays once and takes typed copy. */
export const COPY_BEHIND_WPM = 28;
export const copyBehind = (charWpm: number) => charWpm >= COPY_BEHIND_WPM;
export const QUESTIONS = 3;

type Fact = 'name' | 'qth' | 'call' | 'wx' | 'rig';
const FACTS: readonly Fact[] = ['name', 'qth', 'call', 'wx', 'rig'];

const Lines = z.object({
  templates: z.array(z.string().min(1)).min(1),
  weather: z.array(z.string().min(1)).min(4),
  rigs: z.array(z.string().min(1)).min(4),
  asks: z.record(z.enum(['name', 'qth', 'call', 'wx', 'rig']), z.string().min(1)),
});
const LINES = Lines.parse(pack.items[0]?.data);

export interface LongLine {
  text: string;
  questions: FinaleQuestion[];
}

const pick = <T>(from: readonly T[], random: () => number) =>
  from[Math.floor(random() * from.length)] as T;

/** A line from one of the open operators, and three questions about it, each with 3 wrong choices. */
export function buildLine(open: readonly Operator[], random: () => number = Math.random): LongLine {
  const op = pick(open, random);
  const facts: Record<Fact, string> = {
    name: op.name,
    qth: op.qth,
    call: op.call,
    wx: pick(LINES.weather, random),
    rig: pick(LINES.rigs, random),
  };
  const pools: Record<Fact, readonly string[]> = {
    name: OPERATORS.map((o) => o.name),
    qth: OPERATORS.map((o) => o.qth),
    call: OPERATORS.map((o) => o.call),
    wx: LINES.weather,
    rig: LINES.rigs,
  };
  const text = pick(LINES.templates, random).replace(/\{(\w+)\}/g, (_, k: Fact) => facts[k] ?? '');
  const questions = shuffle(FACTS, random)
    .slice(0, QUESTIONS)
    .map((f) => ({
      ask: LINES.asks[f],
      answer: facts[f],
      wrong: shuffle(
        pools[f].filter((v) => v !== facts[f]),
        random,
      ).slice(0, 3),
    }));
  return { text, questions };
}

/** Head copy: the share of the questions answered right. */
export const answersScore = (questions: readonly FinaleQuestion[], answers: readonly string[]) =>
  questions.filter((q, i) => answers[i] === q.answer).length / questions.length;

const wordsOf = (s: string) =>
  s
    .toUpperCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Z0-9/]/g, ''))
    .filter(Boolean);

/**
 * Copy behind: the words you got down, in order, over the longer of your copy and the line. A
 * skipped word doesn't spoil the ones after it (the longest run of words in common, not a
 * position-by-position match), and extra words cost, so typing every candidate scores low.
 */
export function copyScore(line: string, typed: string): number {
  const a = wordsOf(line);
  const b = wordsOf(typed);
  const row = new Array<number>(b.length + 1).fill(0);
  for (const x of a) {
    let diag = 0;
    for (let j = 1; j <= b.length; j++) {
      const up = row[j] ?? 0;
      row[j] = x === b[j - 1] ? diag + 1 : Math.max(up, row[j - 1] ?? 0);
      diag = up;
    }
  }
  return (row[b.length] ?? 0) / Math.max(a.length, b.length);
}

/** XP: about 10 a minute (docs/game/economy.md); a line and its questions take about a minute. */
export const xpForLong = (score: number) => Math.round(score * 8);

/**
 * Saves a round: a `long-copy` head-copy result (rated per speed), XP, minutes and the event
 * `long-copy-round` for the daily contract. The saved progress is unchanged.
 */
export async function reportLong(
  api: SubjectApi,
  score: number,
  charWpm: number,
  seconds: number,
  at = new Date(),
): Promise<void> {
  await api.saveSession({
    results: [{ skill: 'head-copy', itemId: `long-copy:${charWpm}`, score, itemSeed: 1000 }],
    xp: xpForLong(score),
    minutes: seconds / 60,
    events: [{ kind: 'long-copy-round' }],
    at,
  });
}
