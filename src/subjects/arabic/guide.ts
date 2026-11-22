// The Caravanserai's first-visit cards (the-guide.md §3.4, #411): words in
// content/arabic/guide.json, said by the innkeeper, one for the courtyard and one for each
// station a newcomer opens. Trials and the regulars' chats explain themselves.
import pack from '../../../content/arabic/guide.json' with { type: 'json' };
import { cardsFrom } from '../../core/guide/cards.ts';
import { cardId } from '../../core/guide/seen.ts';

const CARDS = cardsFrom(pack);

/** Which card a view of the courtyard shows. */
const KEY: Partial<Record<string, string>> = {
  hall: 'hall',
  lesson: 'scribe',
  write: 'slate',
  words: 'innkeeper',
  listen: 'fountain',
  echo: 'well',
  read: 'storyteller',
  phrases: 'coffee',
};

export function cardFor(view: string) {
  const key = KEY[view];
  const words = key ? CARDS.get(key) : undefined;
  return key && words ? { id: cardId('arabic', key), ...words } : null;
}

/** Every card key, for the test that each has words. */
export const CARD_KEYS = Object.values(KEY) as string[];
export const CARD_WORDS = CARDS;
