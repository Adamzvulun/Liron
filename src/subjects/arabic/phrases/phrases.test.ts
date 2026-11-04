import { describe, expect, it } from 'vitest';
import type { Item } from '../../../core/content/schema.ts';
import { seeded } from '../lesson/questions.ts';
import { NEW_PROGRESS, parseProgress } from '../progress.ts';
import { latinToHebrew } from './hebrew.ts';
import { PHRASE_SETS, phrasesOf, understandQuestions } from './sets.ts';

const he = (s: string) => s.normalize('NFC');

describe('the Hebrew bridge for phrases (#45)', () => {
  it('writes the deck’s Latin in Hebrew letters with niqqud', () => {
    expect(latinToHebrew('tamām')).toBe(he('תַמַאם'));
    expect(latinToHebrew('kēf ɧālak?')).toBe(he('כֵּיף חַאלַךּ?'));
    expect(latinToHebrew('ʂabāɧ ilxēr!')).toBe(he('צַבַּאח אִלח׳ֵיר!'));
  });

  it('doubles with a dagesh and writes final vowels with a letter', () => {
    expect(latinToHebrew('gaddēš ɧággu?')).toBe(he('גַדֵּיש חַגּוּ?'));
    expect(latinToHebrew('márɧaba!')).toBe(he('מַרחַבַּא!'));
    expect(latinToHebrew('hādi')).toBe(he('הַאדִי'));
  });

  it('drops the deck’s notes, blanks and hyphens', () => {
    expect(latinToHebrew('__ wāɧad [m.]')).toBe(he('וַאחַד'));
    expect(latinToHebrew('b-xēr')).toBe(he('בּח׳ֵיר'));
    expect(latinToHebrew('laʔ/lā')).toBe(he('לַא / לַא'));
  });
});

const deckItem = (id: string, arabic: string, pronunciation: string, english: string): Item => ({
  id,
  subject: 'arabic',
  type: 'vocab',
  data: { arabic, pronunciation, english },
  media: [{ kind: 'audio', store: 'private', path: `deck/${id}.mp3` }],
  tags: [],
});

describe('the coffee corner’s sets (#45)', () => {
  it('has nine sets of deck phrases, in order, and no phrase in two sets', () => {
    expect(PHRASE_SETS.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const s of PHRASE_SETS) expect(s.items.every((id) => /^pcav:\d{4}$/.test(id))).toBe(true);
    const all = PHRASE_SETS.flatMap((s) => s.items);
    expect(new Set(all).size).toBe(all.length);
  });

  it('builds a set’s phrases from the deck, in order, skipping missing ones', () => {
    const [first] = PHRASE_SETS;
    if (!first) throw new Error('no sets');
    const items = [
      deckItem(first.items[1] ?? '', 'هلا!', 'hála!', 'Hi!; Hello!'),
      deckItem(first.items[0] ?? '', 'مرْحبا!', 'márɧaba!', 'Hi!; Hello!'),
    ];
    const phrases = phrasesOf(first, items);
    expect(phrases.map((p) => p.id)).toEqual(first.items.slice(0, 2));
    expect(phrases[0]).toMatchObject({ latin: 'márɧaba!', hebrew: he('מַרחַבַּא!') });
  });

  it('asks the meaning of each phrase, never offering the same meaning twice', () => {
    const items = PHRASE_SETS[1]?.items.map((id, i) =>
      deckItem(
        id,
        'شُكْراً',
        'šúkran',
        ['Thank you.', 'Please.', 'yes', 'no', 'Sorry!'][i % 5] ?? '',
      ),
    );
    const set = PHRASE_SETS[1];
    if (!set || !items) throw new Error('no set');
    const phrases = phrasesOf(set, items);
    const qs = understandQuestions(phrases, phrases, seeded(3));
    expect(qs).toHaveLength(phrases.length);
    for (const q of qs) {
      expect(q.choices).toContain(q.phrase.meaning);
      expect(new Set(q.choices).size).toBe(q.choices.length);
    }
  });

  it('starts on the first set, and old saved states read that way too', () => {
    expect(NEW_PROGRESS).toMatchObject({ phraseSet: 1, phrasesMet: [] });
    expect(parseProgress({ lesson: 3 })).toMatchObject({ lesson: 3, phraseSet: 1 });
  });
});
