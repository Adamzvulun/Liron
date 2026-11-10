// An operator's news, written live (E15, ADR 0036): in a ragchew, the last part of the operator's
// chat turn (after the weather) can come from the AI partner instead of the script. The operator
// remembers their own last lines with you, so a story carries on from one contact to the next.
// Anything that can't be sent in Morse is dropped; anything odd falls back to the script.

import type { PartnerAsk } from '../../../core/partner.ts';
import { codeFor } from '../code.ts';
import type { Contact } from './onAir.ts';

/** Lines an operator remembers per station. */
export const NOTES_KEEP = 3;
const MAX_WORDS = 8;
const MAX_CHARS = 50;

/** What the partner is asked for an operator's news. */
export function newsAsk(c: Contact, contacts: number, past: readonly string[]): PartnerAsk {
  return {
    kind: 'radio-news',
    persona: { who: c.op.who, about: c.op.about },
    learner: { name: c.me.name, place: c.me.qth, contacts },
    past: past.slice(-NOTES_KEEP),
  };
}

/** Words that belong to other turns (sign-offs, reports): the script already sends them. */
const NOT_NEWS = new Set([
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

/**
 * A reply as an operator can send it: capitals, only characters Morse has, at most 8 words and
 * 50 characters, without the sign-off words, signal reports or your name that belong to other
 * turns. Null when too little is left or it breaks character.
 */
export function cleanNews(said: string, yourName = ''): string | null {
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
      return !NOT_NEWS.has(core(w)) && core(w) !== yourName.toUpperCase();
    });
  while (words[0] === 'R' || words[0] === 'UR' || words[0] === 'SIGN') words.shift();
  const kept: string[] = [];
  for (const w of words.slice(0, MAX_WORDS)) {
    if ([...kept, w].join(' ').length > MAX_CHARS) break;
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
