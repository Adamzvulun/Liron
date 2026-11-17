// The Caravanserai's block of the ledger (docs/game/ledger.md). Loaded lazily by index.ts.
import {
  knownCount,
  outOf,
  trendLine,
  weekOf,
  type LedgerAnswer,
  type LedgerLook,
} from '../../core/player/ledger.ts';
import { WORD_CHAPTERS } from './core/wordChapters.ts';
import { LESSON_COUNT, LETTERS } from './letters.ts';
import { parseProgress, type ArabicProgress } from './progress.ts';
import { MAX_LINES } from './chat/limits.ts';
import { SLATE_IDS } from './ranks.ts';
import { finaleOpen, finalePassed } from './finale/stranger.ts';

/**
 * The distance to the Arabic capstone, The Stranger at the Gate (task 4.3), in its three parts:
 * reading (words met), writing (slate letters written from memory) and talking (your longest
 * evening at the inn, of the most it holds). It opens at Storyteller.
 */
export function capstoneLine(p: ArabicProgress): string {
  if (finalePassed(p)) return 'Passed: Keeper of the Table';
  if (finaleOpen(p)) return 'Open: a stranger is at the gate';
  const written = p.written.filter((id) => SLATE_IDS.includes(id)).length;
  const words = new Set(p.words.met).size;
  return `Read ${words} words · write ${written} of ${SLATE_IDS.length} letters · talk ${Math.min(p.chat.best, MAX_LINES)} of ${MAX_LINES} lines · opens at Storyteller`;
}

export function arabicLedger(state: unknown, look: LedgerLook): LedgerAnswer {
  const p = parseProgress(state);
  const letters = new Set(LETTERS.map((l) => l.id));
  const met = p.met.filter((id) => letters.has(id)).length;
  return {
    rows: [
      { label: 'Letters met', value: outOf(met, LETTERS.length) },
      {
        label: 'Script lessons passed',
        value: outOf(p.done ? LESSON_COUNT : p.lesson - 1, LESSON_COUNT),
      },
      { label: 'Words met', value: String(new Set(p.words.met).size) },
      { label: 'Words known', value: String(knownCount(look.cards, 'word:')) },
      {
        label: 'Word chapters passed',
        value: outOf(
          p.words.done ? WORD_CHAPTERS.length : p.words.chapter - 1,
          WORD_CHAPTERS.length,
        ),
      },
      { label: 'Chats held', value: String(p.chat.chats) },
      { label: 'Reviews due', value: String(look.due) },
      { label: 'Capstone: The Stranger at the Gate', value: capstoneLine(p) },
    ],
    trend: trendLine(weekOf(look, 'word:'), { one: 'word', many: 'words' }),
  };
}
