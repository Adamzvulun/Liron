import { describe, expect, it } from 'vitest';
import type { Item } from '../../core/content/schema.ts';
import type { SubjectApi } from '../../core/subject.ts';
import {
  formsOf,
  inHebrew,
  LESSONS,
  LETTERS,
  lettersOf,
  lettersUpTo,
  lookalikes,
} from './letters.ts';
import { applySession, NEW_PROGRESS, parseProgress } from './progress.ts';
import { readableWith, wordsFrom } from './words.ts';
import { listenQuestions, readQuestions, seeded } from './lesson/questions.ts';
import { reportSession, scoreOf, xpFor, type Answer } from './lesson/report.ts';

// Everyday words (not the deck's rows), shaped like deck items.
const vocab = (id: string, arabic: string, english = '', type = 'vocab'): Item => ({
  id,
  subject: 'arabic',
  type,
  data: { arabic, pronunciation: '', english },
  media: [{ kind: 'audio', store: 'private', path: `deck/${id}.mp3` }],
  tags: [],
});
const ITEMS = [
  vocab('w:1', 'بَيْت', 'house'),
  vocab('w:2', 'تين', 'figs'),
  vocab('w:3', 'أنا', 'I'),
  vocab('w:4', 'بِنْت', 'girl'),
  vocab('w:5', 'نَبي', 'prophet'),
  vocab('w:6', 'يابا', 'dad'),
  vocab('w:7', 'بنّ', 'coffee beans'),
  vocab('w:8', 'تِبِن', 'hay'),
  vocab('w:9', 'باب', 'door'),
  vocab('w:10', 'سوق', 'market'),
  vocab('w:11', 'حمار', 'donkey'),
  vocab('w:12', 'كبير جدا', 'very big'),
  vocab('w:13', 'بِـ', 'in'),
  vocab('w:14', 'بيت', 'house again', 'vocab'),
  vocab('w:15', 'X', 'not arabic'),
];

describe('the letters (#38, #39)', () => {
  it('reads a written word into letters, ignoring vowel marks; alif with hamza is alif', () => {
    expect(lettersOf('بَيْت')?.map((l) => l.id)).toEqual([
      'letter:beh',
      'letter:yeh',
      'letter:teh',
    ]);
    expect(lettersOf('أنا')?.[0]?.id).toBe('letter:alef');
    expect(lettersOf('سؤال')?.[1]?.id).toBe('letter:hamza');
    expect(lettersOf('hello')).toBeNull();
  });

  it('writes words in Hebrew letters, with final forms', () => {
    const he = (w: string) => inHebrew(lettersOf(w) ?? []);
    expect(he('بيت')).toBe('בית');
    expect(he('تين')).toBe('תין');
    expect(he('جبنة')).toBe('ג׳בנה');
    expect(he('خبز')).toBe('ח׳בז');
    expect(he('أرض')).toBe('ארץ׳');
  });

  it('shapes each letter in its four positions', () => {
    const beh = LETTERS.find((l) => l.letter === 'ب');
    const dal = LETTERS.find((l) => l.letter === 'د');
    expect(beh && formsOf(beh)).toEqual({
      isolated: 'ب',
      initial: 'ب‍',
      medial: '‍ب‍',
      final: '‍ب',
    });
    expect(dal && formsOf(dal).medial).toBe('‍د');
    const tehMarbuta = LETTERS.find((l) => l.letter === 'ة');
    expect(tehMarbuta && formsOf(tehMarbuta).initial).toBeNull();
  });

  it('knows which letters are easily confused', () => {
    const hah = LETTERS.find((l) => l.letter === 'ح');
    expect(
      hah &&
        lookalikes(hah)
          .map((l) => l.letter)
          .slice(0, 2),
    ).toEqual(['ه', 'خ']);
  });

  it('knows the letters up to a lesson', () => {
    expect(
      lettersUpTo(1)
        .map((l) => l.letter)
        .join(''),
    ).toBe('ابتني');
    expect(lettersUpTo(8)).toHaveLength(LETTERS.length);
    expect(LESSONS).toHaveLength(8);
  });
});

describe('words from the deck', () => {
  const words = wordsFrom(ITEMS);

  it('keeps single words we can spell, once each, with their audio and Hebrew', () => {
    expect(words.map((w) => w.id)).toEqual([
      'w:1',
      'w:2',
      'w:3',
      'w:4',
      'w:5',
      'w:6',
      'w:7',
      'w:8',
      'w:9',
      'w:10',
      'w:11',
    ]);
    expect(words[0]).toMatchObject({
      arabic: 'بَيْت',
      hebrew: 'בית',
      audio: 'deck/w:1.mp3',
      meaning: 'house',
    });
  });

  it('finds the words you can read', () => {
    const known = new Set(lettersUpTo(1).map((l) => l.id));
    expect(readableWith(words, known).map((w) => w.id)).toEqual([
      'w:1',
      'w:2',
      'w:3',
      'w:4',
      'w:5',
      'w:6',
      'w:7',
      'w:8',
      'w:9',
    ]);
  });
});

describe('a session’s questions', () => {
  const words = wordsFrom(ITEMS);

  it('asks Listen about known first letters, never alif, with the answer among 4 choices', () => {
    const qs = listenQuestions(words, 1, seeded(1));
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.choices).toContain(q.answer);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      expect(q.choices.length).toBeLessThanOrEqual(4);
      expect(q.answer.letter).not.toBe('ا');
      expect(q.answer.lesson).toBe(1);
    }
  });

  it('puts a lookalike among the Listen choices when you know one', () => {
    const qs = listenQuestions(words, 5, seeded(3));
    const hah = qs.find((q) => q.answer.letter === 'ح');
    expect(hah?.choices.map((c) => c.letter)).toContain('ه');
  });

  it('asks Read only about readable words, with distinct Hebrew choices', () => {
    const qs = readQuestions(words, 1, seeded(2));
    expect(qs.length).toBe(8);
    for (const q of qs) {
      expect(q.choices).toContain(q.word.hebrew);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      expect(q.word.letters.every((l) => l.lesson === 1)).toBe(true);
    }
  });

  it('is the same session for the same seed', () => {
    expect(readQuestions(words, 1, seeded(9))).toEqual(readQuestions(words, 1, seeded(9)));
  });
});

describe('progress: 90% twice in a row passes a lesson', () => {
  it('reads odd saved state as a fresh start', () => {
    expect(parseProgress(null)).toEqual(NEW_PROGRESS);
    expect(parseProgress({ lesson: 99, streak: 'x' })).toMatchObject({ lesson: 1, streak: 0 });
  });

  it('counts passes in a row and moves on after two', () => {
    let p = NEW_PROGRESS;
    p = applySession(p, 0.95, ['letter:beh']).next;
    expect(p).toMatchObject({ lesson: 1, streak: 1, met: ['letter:beh'], sessions: 1 });
    p = applySession(p, 0.8, []).next;
    expect(p.streak).toBe(0);
    p = applySession(p, 0.9, []).next;
    const last = applySession(p, 1, ['letter:teh']);
    expect(last.passed).toBe(true);
    expect(last.next).toMatchObject({ lesson: 2, streak: 0, met: ['letter:beh', 'letter:teh'] });
  });

  it('finishes the script after the last lesson', () => {
    const p = { ...NEW_PROGRESS, lesson: 8, streak: 1 };
    expect(applySession(p, 1, []).next).toMatchObject({ lesson: 8, done: true });
  });
});

describe('reporting a session', () => {
  const answers: Answer[] = [
    { kind: 'listen', wordId: 'w:1', letters: ['letter:beh'], right: true },
    {
      kind: 'read',
      wordId: 'w:2',
      letters: ['letter:teh', 'letter:yeh', 'letter:noon'],
      right: false,
    },
    {
      kind: 'read',
      wordId: 'w:1',
      letters: ['letter:beh', 'letter:yeh', 'letter:teh'],
      right: true,
    },
  ];

  it('scores and pays about 10 XP a minute, plus 30 for passing a lesson', () => {
    expect(scoreOf(answers)).toBeCloseTo(2 / 3);
    expect(scoreOf([])).toBe(0);
    expect(xpFor(answers, 0)).toBe(2);
    expect(xpFor(answers, 30)).toBe(32);
  });

  it('saves, reviews each letter, rates listen by letter and read by word, then XP and minutes', async () => {
    const calls: unknown[][] = [];
    const api = new Proxy(
      {},
      {
        get:
          (_, name) =>
          async (...args: unknown[]) =>
            void calls.push([name, ...args.slice(0, 3)]),
      },
    ) as SubjectApi;
    await reportSession(api, NEW_PROGRESS, answers, 0, 120);
    expect(calls).toEqual([
      ['saveState', NEW_PROGRESS],
      ['recordReview', 'letter:beh', 'good', expect.any(Date)],
      ['recordReview', 'letter:teh', 'again', expect.any(Date)],
      ['recordReview', 'letter:yeh', 'again', expect.any(Date)],
      ['recordReview', 'letter:noon', 'again', expect.any(Date)],
      ['recordResult', 'listen', 'letter:beh', 1],
      ['recordResult', 'read', 'w:2', 0],
      ['recordResult', 'read', 'w:1', 1],
      ['awardXP', 2],
      ['recordPractice', 2],
    ]);
  });
});
