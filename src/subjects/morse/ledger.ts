// The Signal Tower's block of the ledger (docs/game/ledger.md). Loaded lazily by index.ts.
import {
  outOf,
  trendLine,
  weekOf,
  type LedgerAnswer,
  type LedgerLook,
} from '../../core/player/ledger.ts';
import { MORSE_CHARS } from './code.ts';
import { wpmFor } from './send/decoder.ts';
import { fastestDit, parseProgress, type MorseProgress } from './lesson/progress.ts';
import { FINALE_WPM, finalePassed, REPLY_DIT_MS } from './qso/fortyWinters.ts';
import { WATCH_WPM, watchPassed } from './words/nightWatch.ts';

/** Words a minute from the dot's length (PARIS: 1200 ms ÷ the dot). */
const wpmOf = (ditMs: number) => Math.round(wpmFor(ditMs));

/**
 * The distance to the Morse capstone, Forty Winters (task 4.3): head copy at 20 wpm and a reply
 * keyed at 15 wpm. Copy speed is the lessons' speed, or 20 once the Night Watch (words at 20 wpm,
 * heard once) is passed.
 */
export function capstoneLine(p: MorseProgress): string {
  if (finalePassed(p)) return 'Passed: Keeper of the Hour';
  const copy = Math.round(watchPassed(p) ? Math.max(WATCH_WPM, p.effWpm) : p.effWpm);
  const dit = fastestDit(p);
  const send = dit ? wpmOf(dit) : 0;
  const need = wpmOf(REPLY_DIT_MS);
  return `Hear ${Math.min(copy, FINALE_WPM)} of ${FINALE_WPM} wpm · key ${Math.min(send, need)} of ${need} wpm`;
}

export function morseLedger(state: unknown, look: LedgerLook): LedgerAnswer {
  const p = parseProgress(state);
  const dit = fastestDit(p);
  return {
    rows: [
      { label: 'Characters learned', value: outOf(p.unlocked, MORSE_CHARS.length) },
      { label: 'Copy speed', value: `${Math.round(p.effWpm)} wpm` },
      { label: 'Sending speed', value: dit ? `${wpmOf(dit)} wpm` : 'No drill yet' },
      { label: 'Recognition best', value: String(p.recognition.best) },
      { label: 'Contacts logged', value: String(p.radio.contacts) },
      { label: 'Reviews due', value: String(look.due) },
      { label: 'Capstone: Forty Winters', value: capstoneLine(p) },
    ],
    trend: trendLine(weekOf(look, 'char:'), { one: 'character', many: 'characters' }),
  };
}
