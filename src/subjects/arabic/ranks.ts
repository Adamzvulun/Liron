// The house's ranks (E13, #174; docs/game/ranks-and-achievements.md §3).
import pack from '../../../content/arabic/ranks.json' with { type: 'json' };
import { ranksFrom, standing, type Rank } from '../../core/ranks/ranks.ts';
import { LINES_FOR_XP, MAX_LINES, OLD_FRIEND_CHATS } from './chat/limits.ts';
import { LETTERS } from './letters.ts';
import { PHRASE_SETS } from './phrases/sets.ts';
import type { ArabicProgress } from './progress.ts';

export const ARABIC_RANKS = ranksFrom(pack);

/** Traveler's words: the first 10 chapters, which the first ten regulars sit with. */
export const TRAVELER_CHAPTERS = 10;
/** The letters the slate teaches: every single-character letter (not the لا ligature). */
export const SLATE_IDS = LETTERS.filter((l) => l.letter.length === 1).map((l) => l.id);
/** Traveler's trial: Jamil's, the tenth regular's (chapter 11). Later regulars come after. */
const POETS_EVENING = 11;

// The ranks after Traveler are earned at the inn's table (E17), since 2026-11-15 (Adam), with the
// inn's own numbers (chat/limits.ts).
/** Neighbor: a first real chat, as many of your lines as earn a chat its XP. */
export const NEIGHBOR_LINES = LINES_FOR_XP;
/** Friend: words met, and chats at the inn. */
export const FRIEND_WORDS = 1000;
export const FRIEND_CHATS = 20;
/** Local: words met, and a whole chat, every line you may say. */
export const LOCAL_WORDS = 2000;
export const LOCAL_LINES = MAX_LINES;
/** Storyteller: regulars who call you an old friend. */
export const STORY_FRIENDS = 5;

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
    case 'neighbor':
      return [p.chat.best >= NEIGHBOR_LINES];
    case 'friend':
      return [p.words.met.length >= FRIEND_WORDS, p.chat.chats >= FRIEND_CHATS];
    case 'local':
      return [p.words.met.length >= LOCAL_WORDS, p.chat.best >= LOCAL_LINES];
    case 'storyteller':
      return [
        Object.values(p.chat.met).filter((n) => n >= OLD_FRIEND_CHATS).length >= STORY_FRIENDS,
      ];
    default:
      return rank.conditions.map(() => false);
  }
}

/** Where you stand in the house: a rank you've taken stays yours. */
export const arabicStanding = (p: ArabicProgress) =>
  standing(ARABIC_RANKS, (r) => arabicMet(r, p), p.ranks);
