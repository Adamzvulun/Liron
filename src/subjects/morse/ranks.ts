// The Signal Tower's ranks (E13, #174; docs/game/ranks-and-achievements.md §2).
import pack from '../../../content/morse/ranks.json' with { type: 'json' };
import { ranksFrom, standing, type Rank } from '../../core/ranks/ranks.ts';
import { MORSE_CHARS } from './code.ts';
import type { MorseProgress } from './lesson/progress.ts';
import { CHAPTERS } from './questline.ts';
import { PROSIGNS } from './words.ts';
import { OVERSPEED_WPM } from './words/rush.ts';

export const MORSE_RANKS = ranksFrom(pack);

/** Keyer asks for 15 wpm: a dit of 1200 / 15 = 80 ms or shorter. */
export const KEYER_DIT_MS = 1200 / 15;
export const KEYER_DRILLS = 20;
/**
 * Ghost of the Ether: head copy and sending at 30 wpm (Adam, 2026-11-15: open it now the Radio
 * Room has live operators). Head copy is a call copied right at 30 wpm in the callsign rush (its
 * `topWpm`, as its rush-30 event); sending is a drill keyed with a dit of 1200 / 30 = 40 ms or less.
 */
export const GHOST_WPM = OVERSPEED_WPM;
export const GHOST_DIT_MS = 1200 / GHOST_WPM;
/** Your fastest sending: the shortest dit of any drill (the last one's, in older progress). */
const fastest = (p: MorseProgress) => p.sending.fastest ?? p.sending.ditMs;
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
        (fastest(p) ?? Infinity) <= KEYER_DIT_MS,
        p.rankTrials.includes('lamp-signal'),
      ];
    case 'telegraphist':
      return [p.rankTrials.includes('night-watch')];
    case 'operator':
      return [
        PROSIGNS.every((s) => p.prosigns.includes(s.id)),
        p.rankTrials.includes('far-station'),
      ];
    case 'signal-master':
      return [p.radio.cleanFast];
    case 'ghost':
      return [p.rush.topWpm >= GHOST_WPM, (fastest(p) ?? Infinity) <= GHOST_DIT_MS];
    default:
      return rank.conditions.map(() => false);
  }
}

/** Where you stand in the guild: a rank you've taken stays yours. */
export const morseStanding = (p: MorseProgress) =>
  standing(MORSE_RANKS, (r) => morseMet(r, p), p.ranks);
