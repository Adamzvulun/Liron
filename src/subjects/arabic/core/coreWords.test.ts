import { describe, expect, it } from 'vitest';
import type { Item } from '../../../core/content/schema.ts';
import { seeded } from '../lesson/questions.ts';
import { applyWordSession, NEW_PROGRESS, parseProgress, wordsOpen } from '../progress.ts';
import {
  coreWordsFrom,
  NEW_PER_SESSION,
  OWN_SENTENCES,
  pickSession,
  SESSION_WORDS,
  WORD_CHAPTERS,
  wordQuestions,
  type CoreWord,
} from './coreWords.ts';

const item = (id: string, arabic: string, pronunciation: string, english = 'x'): Item => ({
  id,
  subject: 'arabic',
  type: 'vocab',
  data: { arabic, pronunciation, english },
  media: [{ kind: 'audio', store: 'private', path: `deck/${id}.mp3` }],
  tags: [],
});

/** A stand-in deck: every listed word, plus the sentences the list points at. */
const deck = (): Item[] =>
  WORD_CHAPTERS.flatMap((c) =>
    c.words.flatMap((w, i) => [
      item(w.deck, `كلمة${c.chapter}x${i}`, `kilma${i}`),
      ...(w.sentence ? [item(w.sentence, 'جملة طويلة هون.', 'jumla', 'A sentence.')] : []),
    ]),
  );

describe('the word path (#160)', () => {
  it('builds every chapter from the deck, with our gloss and the sentence when there is one', () => {
    const chapters = coreWordsFrom(deck());
    expect(chapters.map((c) => c.length)).toEqual(WORD_CHAPTERS.map(() => 30));
    const first = chapters[0]?.[0];
    expect(first).toMatchObject({ deck: 'pcav:4751', itemId: 'word:pcav:4751', meaning: 'yes' });
    expect(first?.sentence).toMatchObject({ english: 'A sentence.' });
    expect(chapters.flat().filter((w) => w.sentence).length).toBe(
      WORD_CHAPTERS.flatMap((c) => c.words).filter((w) => w.sentence).length,
    );
  });

  it('leaves out words the deck lacks', () => {
    const chapters = coreWordsFrom(deck().filter((i) => i.id !== 'pcav:4751'));
    expect(chapters[0]).toHaveLength(29);
  });

  it('cleans the deck’s blanks and tags', () => {
    const chapters = coreWordsFrom([item('pcav:3970', '__ واحد [m.]', '__ wāɧad [m.]')]);
    expect(chapters[2]?.[0]).toMatchObject({ arabic: 'واحد', latin: 'wāɧad' });
  });
});

describe('our own sentences (#164)', () => {
  const words = WORD_CHAPTERS.flatMap((c) => c.words);

  it('only for path words the deck has no sentence for', () => {
    const lacking = new Set(words.filter((w) => !w.sentence).map((w) => w.deck));
    expect(OWN_SENTENCES.size).toBeGreaterThan(0);
    for (const word of OWN_SENTENCES.keys()) expect(lacking.has(word), word).toBe(true);
  });

  it('cover every path word that lacks a deck sentence', () => {
    for (const w of words.filter((x) => !x.sentence)) {
      expect(OWN_SENTENCES.has(w.deck), w.deck).toBe(true);
    }
  });

  it('give the word its sentence, text only, and leave deck sentences alone', () => {
    const all = coreWordsFrom(deck()).flat();
    const yes = all.find((w) => w.deck === 'pcav:4751');
    expect(yes?.written).toBeUndefined();
    const welcome = all.find((w) => w.deck === 'pcav:4758');
    expect(welcome?.sentence).toBeUndefined();
    expect(welcome?.written).toMatchObject({ latin: 'šúkran! — 3áfwan.' });
    expect(welcome?.written?.hebrew).toMatch(/[א-ת]/);
    expect(all.filter((w) => w.written)).toHaveLength(OWN_SENTENCES.size);
  });
});

describe('a word session', () => {
  const chapters = coreWordsFrom(deck());
  const ids = (ws: readonly CoreWord[]) => ws.map((w) => w.deck);

  it('starts with the chapter’s first 5 words, in teaching order', () => {
    const s = pickSession(chapters, 1, new Set(), new Set(), seeded(1));
    expect(ids(s.fresh)).toEqual(ids(chapters[0]?.slice(0, NEW_PER_SESSION) ?? []));
    expect(s.words).toHaveLength(NEW_PER_SESSION);
  });

  it('puts due words first, then new ones, then fills with words you know', () => {
    const ch1 = chapters[0] ?? [];
    const met = new Set(ids(ch1.slice(0, 20)));
    const due = new Set(ch1.slice(0, 3).map((w) => w.itemId));
    const s = pickSession(chapters, 2, met, due, seeded(2));
    expect(s.words).toHaveLength(SESSION_WORDS);
    expect(ids(s.fresh)).toEqual(ids(chapters[1]?.slice(0, 5) ?? []));
    for (const w of ch1.slice(0, 3)) expect(ids(s.words)).toContain(w.deck);
    // Words from chapters you haven't reached never come.
    expect(s.words.every((w) => w.chapter <= 2)).toBe(true);
    expect(new Set(ids(s.words)).size).toBe(s.words.length);
  });

  it('asks each word once, taking turns, with 4 different choices including the answer', () => {
    const words = chapters[0]?.slice(0, 9) ?? [];
    const qs = wordQuestions(words, chapters.flat(), seeded(3));
    expect(qs.map((q) => q.kind)).toEqual([
      'listen',
      'read',
      'recall',
      'listen',
      'read',
      'recall',
      'listen',
      'read',
      'recall',
    ]);
    for (const q of qs) {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices).toContain(q.answer);
      expect(q.answer).toBe(q.kind === 'recall' ? q.word.arabic : q.word.meaning);
    }
  });

  it('never offers a second word for the same thing as a wrong choice', () => {
    const [a, b, c, d, e] = chapters[0] ?? [];
    if (!a || !b || !c || !d || !e) throw new Error('chapter 1 is short');
    // Two words for one thing, in a pool so small the twin would surely be picked.
    const twin = { ...b, meaning: a.meaning };
    const pool = [a, twin, c, d, e];
    for (let s = 0; s < 10; s++) {
      // The third word is asked as recall: pick the Arabic.
      for (const q of wordQuestions([c, twin, a], pool, seeded(s))) {
        expect(q.choices).toHaveLength(4);
        const other = q.word === a ? twin : q.word === twin ? a : null;
        if (!other) continue;
        const wrong = q.choices.filter((x) => x !== q.answer);
        expect(wrong).not.toContain(other.arabic);
        expect(wrong).not.toContain(other.meaning);
      }
    }
  });
});

describe('the word path’s gate', () => {
  const guest = { ...NEW_PROGRESS, guest: true };

  it('opens once you are a guest of the house', () => {
    expect(wordsOpen(NEW_PROGRESS)).toBe(false);
    expect(wordsOpen(guest)).toBe(true);
  });

  it('passes a chapter at 90% in two sessions, the second on a later day', () => {
    const a = applyWordSession(guest, 0.95, ['pcav:4751'], 10, '2026-11-10');
    expect(a.passed).toBe(false);
    const same = applyWordSession(a.next, 0.95, [], 10, '2026-11-10');
    expect(same).toMatchObject({ passed: false, sameDay: true });
    const b = applyWordSession(a.next, 0.92, ['pcav:4753'], 10, '2026-11-11');
    expect(b.passed).toBe(true);
    expect(b.next.words).toMatchObject({ chapter: 2, streak: 0, met: ['pcav:4751', 'pcav:4753'] });
    expect(applyWordSession(a.next, 0.5, [], 10, '2026-11-11').next.words.streak).toBe(0);
  });

  it('ends after the last chapter, and reads old saves without a word path', () => {
    const last = { ...guest, words: { ...guest.words, chapter: 10, streak: 1, passDay: 'x' } };
    const r = applyWordSession(last, 1, [], 10, '2026-11-12');
    expect(r.next.words).toMatchObject({ chapter: 10, done: true });
    expect(parseProgress({ lesson: 3 }).words).toEqual(NEW_PROGRESS.words);
  });
});
