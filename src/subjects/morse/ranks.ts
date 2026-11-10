// The Signal Tower's ranks (E13, #174; docs/game/ranks-and-achievements.md §2).
import pack from '../../../content/morse/ranks.json' with { type: 'json' };
import { ranksFrom, standing, type Rank } from '../../core/ranks/ranks.ts';
import { MORSE_CHARS } from './code.ts';
import type { MorseProgress } from './lesson/progress.ts';
import { CHAPTERS } from './questline.ts';

export const MORSE_RANKS = ranksFrom(pack);

/** Keyer asks for 15 wpm: a dit of 1200 / 15 = 80 ms or shorter. */
export const KEYER_DIT_MS = 1200 / 15;
export const KEYER_DRILLS = 20;
const LAST_CHAPTER = CHAPTERS[CHAPTERS.length - 1]?.number ?? 5;

/** Which of a rank's conditions you've met, in the order ranks.json lists them. */
export function morseMet(rank: Rank, p: MorseProgress): boolean[] {
  switch (rank.id) {
    case 'initiate':
      return [true];
    case 'listener':
      return [p.unlocked >= MORSE_CHARS.length, p.trials.includes(LAST_CHAPTER)];
    case 'keyer':
      return [
        p.sending.drills >= KEYER_DRILLS,
        p.sending.ditMs !== null && p.sending.ditMs <= KEYER_DIT_MS,
        p.rankTrials.includes('lamp-signal'),
      ];
    default:
      return rank.conditions.map(() => false);
  }
}

export const morseStanding = (p: MorseProgress) => standing(MORSE_RANKS, (r) => morseMet(r, p));
