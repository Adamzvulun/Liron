// The Signal Tower's block of the ledger (docs/game/ledger.md). Loaded lazily by index.ts.
import {
  outOf,
  trendLine,
  weekOf,
  type LedgerAnswer,
  type LedgerLook,
} from '../../core/player/ledger.ts';
import { MORSE_CHARS } from './code.ts';
import { parseProgress } from './lesson/progress.ts';

/** Words a minute from the dot's length (PARIS: 1200 ms ÷ the dot). */
const wpmOf = (ditMs: number) => Math.round(1200 / ditMs);

export function morseLedger(state: unknown, look: LedgerLook): LedgerAnswer {
  const p = parseProgress(state);
  const dit = p.sending.fastest ?? p.sending.ditMs;
  return {
    rows: [
      { label: 'Characters learned', value: outOf(p.unlocked, MORSE_CHARS.length) },
      { label: 'Copy speed', value: `${Math.round(p.effWpm)} wpm` },
      { label: 'Sending speed', value: dit ? `${wpmOf(dit)} wpm` : 'No drill yet' },
      { label: 'Recognition best', value: String(p.recognition.best) },
      { label: 'Contacts logged', value: String(p.radio.contacts) },
      { label: 'Reviews due', value: String(look.due) },
    ],
    trend: trendLine(weekOf(look, 'char:'), { one: 'character', many: 'characters' }),
  };
}
