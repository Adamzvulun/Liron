// An operator's news, written live (E15, ADR 0036): in a ragchew, the last part of the operator's
// chat turn (after the weather) can come from the AI partner instead of the script. The operator
// remembers their own last lines with you, so a story carries on from one contact to the next.
// Anything that can't be sent in Morse is dropped; anything odd falls back to the script.
// Since ADR 0037 you key your own news in a free turn too, and the operator answers it live
// before they sign; they remember what you told them.

import type { RadioNewsAsk, RadioReplyAsk } from '../../../core/partner.ts';
import { codeFor } from '../code.ts';
import type { Contact } from './onAir.ts';

/** Lines an operator remembers per station. */
export const NOTES_KEEP = 3;
const MAX_WORDS = 8;
const MAX_CHARS = 50;

/** The most you can key as your news, and the fewest letters worth answering. */
export const HEARD_MAX = 60;
const HEARD_MIN = 3;

/** What an operator remembers of you: their own lines and what you told them. */
export interface Memory {
  past: readonly string[];
  told: readonly string[];
}

const about = (c: Contact, contacts: number, m: Memory) => ({
  operator: c.op.id,
  learner: { name: c.me.name, place: c.me.qth, contacts },
  past: m.past.slice(-NOTES_KEEP),
  told: m.told.slice(-NOTES_KEEP),
});

/** What the partner is asked for an operator's news. */
export function newsAsk(c: Contact, contacts: number, m: Memory): RadioNewsAsk {
  return { kind: 'radio-news', ...about(c, contacts, m) };
}

/** What the partner is asked to answer the news you keyed (ADR 0037). */
export function replyAsk(c: Contact, contacts: number, m: Memory, heard: string): RadioReplyAsk {
  return {
    kind: 'radio-reply',
    ...about(c, contacts, m),
    ...(c.news ? { news: c.news } : {}),
    heard,
  };
}

/**
 * What the operator read of your free turn: capitals and Morse characters, one space between
 * words, cut to HEARD_MAX at a word. Null when there's too little to answer.
 */
export function cleanHeard(read: string): string | null {
  const words = read
    .toUpperCase()
    .split('')
    .map((ch) => (ch === ' ' || codeFor(ch) ? ch : ' '))
    .join('')
    .split(/\s+/)
    .filter(Boolean);
  const kept: string[] = [];
  for (const w of words) {
    if ([...kept, w].join(' ').length > HEARD_MAX) break;
    kept.push(w);
  }
  const line = kept.join(' ');
  return line.replace(/[^A-Z0-9]/g, '').length >= HEARD_MIN ? line : null;
}

/** Words that belong to other turns (sign-offs, reports): the script already sends them. */
const NOT_NEWS: ReadonlySet<string> = new Set([
  'TNX',
  'TU',
  '73',
  '88',
  'CUL',
  'QRT',
  'GB',
  'GL',
  'SK',
  'KN',
  'BK',
  'K',
]);

/** How long a line may be, and which sign-off words it may keep. */
interface Shape {
  words: number;
  chars: number;
  /** Words from NOT_NEWS that this line may keep (an answer can wish you GL). */
  keep?: readonly string[];
  /** Whether it may say your name (an answer can; news shouldn't, it's the chat's own turn). */
  name?: boolean;
}

const NEWS_SHAPE: Shape = { words: MAX_WORDS, chars: MAX_CHARS };
/** An answer to your news is shorter, and comes just before their sign-off. */
const REPLY_SHAPE: Shape = { words: 7, chars: 44, keep: ['GL', 'TNX', 'TU'], name: true };

/**
 * A reply as an operator can send it: capitals, only characters Morse has, at most 8 words and
 * 50 characters, without the sign-off words, signal reports or your name that belong to other
 * turns. Null when too little is left or it breaks character.
 */
export function cleanNews(said: string, yourName = '', shape: Shape = NEWS_SHAPE): string | null {
  const words = said
    .toUpperCase()
    .replace(/['’]/g, '')
    .split('')
    .map((ch) => (ch === ' ' || codeFor(ch) ? ch : ' '))
    .join('')
    .split(/\s+/)
    .filter((w) => /[A-Z0-9]/.test(w))
    .filter((w, i, all) => {
      const core = (x = '') => x.replace(/[^A-Z0-9]/g, '');
      const report = (x = '') => /^[1-5][1-9N]{1,2}$/.test(core(x));
      // A signal report, and the UR or RST that leads into one, belong to the exchange turn.
      if (report(w) || (/^(UR|RST)$/.test(core(w)) && report(all[i + 1]))) return false;
      const signOff = NOT_NEWS.has(core(w)) && !shape.keep?.includes(core(w));
      return !signOff && (shape.name || core(w) !== yourName.toUpperCase());
    });
  while (words[0] === 'R' || words[0] === 'UR' || words[0] === 'SIGN') words.shift();
  const kept: string[] = [];
  for (const w of words.slice(0, shape.words)) {
    if ([...kept, w].join(' ').length > shape.chars) break;
    kept.push(w);
  }
  while (
    kept.length &&
    /^(ES|ON|THE|A|MY|UR|SIGN|WITH|AND|TO|OF|IS)$/.test(kept[kept.length - 1] ?? '')
  ) {
    kept.pop();
  }
  const line = kept.join(' ').replace(/[,/=]+$/, '');
  if (kept.length < 2 || /\b(AI|BOT|CHATBOT|MODEL|ASSISTANT)\b/.test(line)) return null;
  return line;
}

/** An operator's answer to your news, as they can send it: 7 words and 44 characters at most. */
export const cleanReply = (said: string, yourName = '') => cleanNews(said, yourName, REPLY_SHAPE);

/** What a ragchewer told you, live or from the script: their chat's last part. */
export function newsOf(c: Contact): string | null {
  if (c.news) return c.news;
  const at = c.op.chat.lastIndexOf('<BT>');
  const line = at < 0 ? '' : c.op.chat.slice(at + 4).trim();
  return line && !line.includes('{') ? line : null;
}

/** The operator's chat with their news in place of the script's last part. */
export function withNews(chat: string, news: string): string {
  const at = chat.lastIndexOf('<BT>');
  return at < 0 ? `${chat} <BT> ${news}` : `${chat.slice(0, at)}<BT> ${news}`;
}
