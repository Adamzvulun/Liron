// Forty Winters (task 4.2 and 4.3, #334, #335; ADR 0047): the Silent Beacon's finale, and the
// Morse capstone. The far voice sends a message once, in plain words at 20 wpm; you copy it in
// your head, answer three questions about it, then key a reply the tower must read cleanly at
// 15 wpm or faster. The story and the six messages are content (content/morse/finale.json); the
// rules are here, the screen in FortyWinters.tsx. Design: docs/game/the-road.md §4, step 75.

import { z } from 'zod';
import pack from '../../../../content/morse/finale.json' with { type: 'json' };
import type { SubjectApi } from '../../../core/subject.ts';
import type { MorseProgress } from '../lesson/progress.ts';
import { wpmFor, type Decoded } from '../send/decoder.ts';
import { KEYER_DIT_MS } from '../ranks.ts';
import { keyedRight } from './farStation.ts';

export const FINALE_ID = 'forty-winters';
/** Head copy of plain text at 20 wpm (4.3): sent once, at full speed, with standard spacing. */
export const FINALE_WPM = 20;
/** The reply must be read at 15 wpm or faster (4.3). */
export const REPLY_DIT_MS = KEYER_DIT_MS;
export const FINALE_XP = { pass: 120, try: 10 };

const Question = z.object({
  ask: z.string().min(1),
  answer: z.string().min(1),
  wrong: z.array(z.string().min(1)).min(2),
});
const Message = z.object({
  text: z.string().min(1),
  questions: z.array(Question).length(3),
  reply: z.string().min(1),
});
const Story = z.object({
  title: z.string().min(1),
  intro: z.string().min(1),
  rules: z.string().min(1),
  screen: z.string().min(1),
  epilogue: z.string().min(1),
  missed: z.string().min(1),
});

export type FinaleQuestion = z.infer<typeof Question>;
export type FinaleMessage = z.infer<typeof Message> & { id: string };

export const FINALE_STORY = Story.parse(pack.items.find((i) => i.type === 'finale')?.data);
export const FINALE_MESSAGES: readonly FinaleMessage[] = pack.items
  .filter((i) => i.type === 'finale-message')
  .map((i) => ({ id: i.id, ...Message.parse(i.data) }));

/** A message, never the one heard last, so a retry is never a memory test. */
export function pickMessage(lastId: string | null, random: () => number = Math.random) {
  const pool = FINALE_MESSAGES.filter((m) => m.id !== lastId);
  return pool[Math.floor(random() * pool.length)] ?? (FINALE_MESSAGES[0] as FinaleMessage);
}

/** A question's choices, shuffled: the answer and the wrong ones. */
export function choicesFor(q: FinaleQuestion, random: () => number = Math.random): string[] {
  const all = [q.answer, ...q.wrong];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [all[i], all[j]] = [all[j] as string, all[i] as string];
  }
  return all;
}

export interface FinaleResult {
  /** Questions answered right, of 3. */
  understood: number;
  /** Every word of the reply was read, in order. */
  read: boolean;
  wpm: number;
  /** Keyed at 15 wpm or faster. */
  fast: boolean;
  passed: boolean;
}

export function finaleResult(
  m: FinaleMessage,
  answers: readonly string[],
  decoded: Pick<Decoded, 'text' | 'ditMs'>,
): FinaleResult {
  const understood = m.questions.filter((q, i) => answers[i] === q.answer).length;
  const read = keyedRight(m.reply, decoded.text);
  const fast = decoded.ditMs <= REPLY_DIT_MS;
  return {
    understood,
    read,
    wpm: Math.round(wpmFor(decoded.ditMs)),
    fast,
    passed: understood === m.questions.length && read && fast,
  };
}

/** The finale opens once you are a Ghost of the Ether, the tower's last rank. */
export const finaleOpen = (p: MorseProgress) => p.ranks.includes('ghost');
export const finalePassed = (p: MorseProgress) => p.rankTrials.includes(FINALE_ID);

export function applyFinale(p: MorseProgress, r: FinaleResult): MorseProgress {
  return r.passed && !finalePassed(p) ? { ...p, rankTrials: [...p.rankTrials, FINALE_ID] } : p;
}

/**
 * Saves an attempt. A first pass sends `trial-forty-winters`: the database gives the beacon lens
 * and the title Keeper of the Hour for it, and the party feed tells your friends (ADR 0047).
 */
export async function reportFinale(
  api: SubjectApi,
  before: MorseProgress,
  next: MorseProgress,
  r: FinaleResult,
  seconds: number,
  at = new Date(),
): Promise<void> {
  const first = r.passed && !finalePassed(before);
  await api.saveSession({
    state: next,
    xp: first ? FINALE_XP.pass : FINALE_XP.try,
    minutes: seconds / 60,
    events: first ? [{ kind: `trial-${FINALE_ID}` }] : [],
    at,
  });
}
