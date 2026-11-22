// The Signal Tower's first-visit cards (the-guide.md §3.4, #411): words in content/morse/guide.json,
// one for the hall and one for each station a newcomer opens. Trials explain themselves.
import pack from '../../../content/morse/guide.json' with { type: 'json' };
import { cardsFrom } from '../../core/guide/cards.ts';
import { cardId } from '../../core/guide/seen.ts';

const CARDS = cardsFrom(pack);

/** Which card a view of the tower shows. */
const KEY: Partial<Record<string, string>> = {
  hall: 'hall',
  koch: 'lessons',
  recognition: 'recognition',
  sending: 'sending',
  words: 'codebook',
  radio: 'radio',
};

export function cardFor(view: string) {
  const key = KEY[view];
  const words = key ? CARDS.get(key) : undefined;
  return key && words ? { id: cardId('morse', key), ...words } : null;
}

/** Every card key, for the test that each has words. */
export const CARD_KEYS = Object.values(KEY) as string[];
export const CARD_WORDS = CARDS;
