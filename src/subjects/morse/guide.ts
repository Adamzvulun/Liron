// The Signal Tower's first-visit cards (the-guide.md §3.4, #411): words in content/morse/guide.json,
// one for the hall and one for each station a newcomer opens. Trials explain themselves.
import pack from '../../../content/morse/guide.json' with { type: 'json' };
import { cardsFrom } from '../../core/guide/cards.ts';
import { cardId } from '../../core/guide/seen.ts';
import type { GuideChapter } from '../../core/subject.ts';

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

/** The guild's Guidebook chapter: the hall's card, then a line per station. */
export function chapter(): GuideChapter {
  const hall = CARDS.get('hall');
  if (!hall) throw new Error('No card for the hall');
  return {
    title: hall.title,
    text: hall.text,
    stations: [...CARDS]
      .filter(([key]) => key !== 'hall')
      .map(([, c]) => ({ title: c.title, text: c.text })),
  };
}

/** Every card key, for the test that each has words. */
export const CARD_KEYS = Object.values(KEY) as string[];
export const CARD_WORDS = CARDS;
