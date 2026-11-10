// The house's ranks (E13, #174; docs/game/ranks-and-achievements.md §3).
import pack from '../../../content/arabic/ranks.json' with { type: 'json' };
import { ranksFrom, standing, type Rank } from '../../core/ranks/ranks.ts';
import { LETTERS } from './letters.ts';
import { PHRASE_SETS } from './phrases/sets.ts';
import type { ArabicProgress } from './progress.ts';
import { REGULARS } from './questline.ts';

export const ARABIC_RANKS = ranksFrom(pack);

/** Traveler's words: the first 10 chapters, which the ten regulars sit with. */
export const TRAVELER_CHAPTERS = 10;
/** The letters the slate teaches: every single-character letter (not the لا ligature). */
export const SLATE_IDS = LETTERS.filter((l) => l.letter.length === 1).map((l) => l.id);
const POETS_EVENING = REGULARS[REGULARS.length - 1]?.number ?? 11;

export function arabicMet(rank: Rank, p: ArabicProgress): boolean[] {
  switch (rank.id) {
    case 'stranger':
      return [true];
    case 'guest':
      return [p.done || p.guest, p.guest];
    case 'traveler':
      return [
        p.words.chapter > TRAVELER_CHAPTERS || p.words.done,
        p.phraseSet > PHRASE_SETS.length,
        SLATE_IDS.every((id) => p.written.includes(id)),
        p.words.trials.includes(POETS_EVENING),
      ];
    default:
      return rank.conditions.map(() => false);
  }
}

export const arabicStanding = (p: ArabicProgress) => standing(ARABIC_RANKS, (r) => arabicMet(r, p));
