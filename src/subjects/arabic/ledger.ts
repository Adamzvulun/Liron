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
import { parseProgress } from './progress.ts';

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
    ],
    trend: trendLine(weekOf(look, 'word:'), { one: 'word', many: 'words' }),
  };
}
