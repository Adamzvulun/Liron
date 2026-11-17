import { describe, expect, it } from 'vitest';
import { MORSE_CHARS } from '../code.ts';
import { parseProgress } from '../lesson/progress.ts';
import {
  applyFinale,
  choicesFor,
  FINALE_MESSAGES,
  FINALE_STORY,
  finaleOpen,
  finalePassed,
  finaleResult,
  pickMessage,
  REPLY_DIT_MS,
} from './fortyWinters.ts';

const KEYABLE = new Set([...MORSE_CHARS.map((c) => c.char), ' ']);
const first = FINALE_MESSAGES[0]!;
const right = first.questions.map((q) => q.answer);

describe('Forty Winters, the Morse capstone', () => {
  it('has at least six messages, so a retry is not a memory test', () => {
    expect(FINALE_MESSAGES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(FINALE_MESSAGES.map((m) => m.text)).size).toBe(FINALE_MESSAGES.length);
    expect(FINALE_STORY.title).toBe('Forty Winters');
  });

  it('sends and asks only what Morse can carry, with a reply of about 25 characters', () => {
    for (const m of FINALE_MESSAGES) {
      for (const c of m.text + m.reply) expect(KEYABLE.has(c), `${m.id}: ${c}`).toBe(true);
      expect(m.reply.length).toBeGreaterThanOrEqual(20);
      expect(m.reply.length).toBeLessThanOrEqual(30);
      for (const q of m.questions) expect(q.wrong).not.toContain(q.answer);
    }
  });

  it('never picks the message heard last', () => {
    for (let i = 0; i < 50; i++) expect(pickMessage(first.id).id).not.toBe(first.id);
    expect(pickMessage(null, () => 0).id).toBe(first.id);
  });

  it('offers every choice once', () => {
    const q = first.questions[0]!;
    expect(choicesFor(q, () => 0.5).sort()).toEqual([q.answer, ...q.wrong].sort());
  });

  it('passes only with all three understood, the reply read, at 15 wpm or faster', () => {
    const clean = { text: first.reply, ditMs: REPLY_DIT_MS };
    expect(finaleResult(first, right, clean)).toMatchObject({
      understood: 3,
      read: true,
      passed: true,
    });
    expect(finaleResult(first, right, clean).wpm).toBe(15);
    expect(finaleResult(first, ['x', ...right.slice(1)], clean).passed).toBe(false);
    expect(finaleResult(first, right, { text: 'SHE IS HERE', ditMs: 60 }).read).toBe(false);
    const slow = finaleResult(first, right, { text: first.reply, ditMs: REPLY_DIT_MS + 1 });
    expect(slow).toMatchObject({ read: true, fast: false, passed: false });
  });

  it('opens for a Ghost of the Ether, and is passed once', () => {
    const p = parseProgress({});
    expect(finaleOpen(p)).toBe(false);
    expect(finaleOpen({ ...p, ranks: ['ghost'] })).toBe(true);
    const pass = finaleResult(first, right, { text: first.reply, ditMs: 60 });
    const after = applyFinale(p, pass);
    expect(finalePassed(after)).toBe(true);
    expect(applyFinale(after, pass)).toBe(after);
  });
});
