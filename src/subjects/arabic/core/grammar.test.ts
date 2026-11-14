import { describe, expect, it } from 'vitest';
import type { Item } from '../../../core/content/schema.ts';
import { applyWordSession, NEW_PROGRESS, parseProgress } from '../progress.ts';
import { cardDue, cardsRead, GRAMMAR_CARDS, grammarFrom, withCardRead } from './grammar.ts';

const sentence = (id: string): Item => ({
  id,
  subject: 'arabic',
  type: 'vocab',
  data: { arabic: 'أنا جاهِز!', pronunciation: 'ána jāhiz!', english: 'I’m ready!' },
  media: [{ kind: 'audio', store: 'private', path: `deck/${id}.mp3` }],
  tags: [],
});

describe('grammar cards (#162)', () => {
  const guest = { ...NEW_PROGRESS, guest: true };

  it('has a card for each of chapters 1 to 36, then cards for later chapters', () => {
    expect(GRAMMAR_CARDS.map((c) => [c.id, c.chapter])).toEqual([
      ['grammar:no-is', 1],
      ['grammar:endings', 2],
      ['grammar:counting', 3],
      ['grammar:article', 4],
      ['grammar:there-is', 5],
      ['grammar:want', 6],
      ['grammar:present', 7],
      ['grammar:feminine-pairs', 7],
      ['grammar:have', 8],
      ['grammar:not', 9],
      ['grammar:past', 10],
      ['grammar:feminine', 11],
      ['grammar:future', 12],
      ['grammar:may-must', 13],
      ['grammar:object-endings', 14],
      ['grammar:was', 15],
      ['grammar:illi', 16],
      ['grammar:more', 17],
      ['grammar:commands', 18],
      ['grammar:right-now', 19],
      ['grammar:verb-forms', 20],
      ['grammar:plurals', 21],
      ['grammar:if', 22],
      ['grammar:when-because', 23],
      ['grammar:kull', 24],
      ['grammar:self', 25],
      ['grammar:questions', 26],
      ['grammar:one-of', 26],
      ['grammar:time', 27],
      ['grammar:joining', 28],
      ['grammar:still-already', 29],
      ['grammar:before-after', 30],
      ['grammar:done-to', 30],
      ['grammar:where', 31],
      ['grammar:the-big-house', 32],
      ['grammar:of', 33],
      ['grammar:since-until', 34],
      ['grammar:age', 35],
      ['grammar:state-words', 36],
      ['grammar:colors-and-looks', 37],
      ['grammar:hungry', 38],
      ['grammar:places', 40],
      ['grammar:old-verbs-new-jobs', 42],
      ['grammar:ways-to-play', 43],
      ['grammar:a-plurals', 44],
      ['grammar:lets', 45],
      ['grammar:someone', 45],
      ['grammar:jobs', 46],
      ['grammar:i-ending', 47],
      ['grammar:parts-and-sums', 48],
      ['grammar:hope-and-wish', 49],
      ['grammar:long-plurals', 50],
      ['grammar:three-words', 52],
      ['grammar:doer-and-done-to', 53],
      ['grammar:being-ill', 54],
      ['grammar:while', 57],
      ['grammar:people-plurals', 58],
      ['grammar:verb-and-little-word', 59],
      ['grammar:verb-pairs', 60],
      ['grammar:going-up', 62],
      ['grammar:doing-words', 64],
      ['grammar:mit-words', 65],
      ['grammar:sunrise', 68],
      ['grammar:hidden-t', 69],
      ['grammar:his-blood-is-light', 70],
      ['grammar:undoing', 71],
      ['grammar:can-be', 76],
      ['grammar:iyya-words', 77],
      ['grammar:machines', 79],
      ['grammar:make-it-go', 80],
      ['grammar:muta-words', 82],
      ['grammar:take-and-give', 84],
      ['grammar:second-words', 86],
      ['grammar:same-letters', 88],
      ['grammar:chessboard', 89],
      ['grammar:ordinals', 90],
      ['grammar:how-much', 91],
      ['grammar:nothing', 92],
      ['grammar:wishes', 92],
      ['grammar:the-world-rains', 93],
      ['grammar:cousins', 94],
      ['grammar:last-and-never', 96],
    ]);
    for (const c of GRAMMAR_CARDS) expect(c.examples.length).toBeGreaterThanOrEqual(2);
  });

  it('reads its examples from the deck, leaving out any the deck lacks', () => {
    const cards = grammarFrom([sentence('pcav:4703')]);
    expect(cards[0]?.lines).toEqual([
      {
        arabic: 'أنا جاهِز!',
        latin: 'ána jāhiz!',
        english: 'I’m ready!',
        audio: 'deck/pcav:4703.mp3',
      },
    ]);
    expect(cards[1]?.lines).toEqual([]);
  });

  it('comes once, before the first session of its chapter', () => {
    expect(cardDue(GRAMMAR_CARDS, guest)?.id).toBe('grammar:no-is');
    const read = withCardRead(guest, 'grammar:no-is');
    expect(cardDue(GRAMMAR_CARDS, read)).toBeUndefined();
    expect(withCardRead(read, 'grammar:no-is')).toBe(read);
    const ch2 = { ...read, words: { ...read.words, chapter: 2 } };
    expect(cardDue(GRAMMAR_CARDS, ch2)?.id).toBe('grammar:endings');
    expect(cardsRead(GRAMMAR_CARDS, ch2).map((c) => c.id)).toEqual(['grammar:no-is']);
  });

  it('is kept through sessions, and old saves start with none read', () => {
    const read = withCardRead(guest, 'grammar:no-is');
    expect(applyWordSession(read, 1, [], 10, '2026-11-10').next.words.cards).toEqual([
      'grammar:no-is',
    ]);
    expect(parseProgress({ words: { chapter: 3 } }).words.cards).toEqual([]);
  });
});
