import { describe, expect, it, vi } from 'vitest';
import type { SubjectApi } from '../../../core/subject.ts';
import { NEW_PROGRESS, parseProgress } from '../progress.ts';
import {
  gradeHear,
  hearIdOf,
  hearOpen,
  markPlaced,
  meaningChoices,
  pickSentences,
  wordBank,
  type HearSentence,
} from './hear.ts';
import { reportHear } from './report.ts';

const s = (n: number, chapter: number): HearSentence => ({
  deck: `pcav:${n}`,
  itemId: hearIdOf(`pcav:${n}`),
  chapter,
});
const POOL = [s(1, 1), s(2, 1), s(3, 2), s(4, 2), s(5, 3), s(6, 2)];
const at = (chapter: number) => ({ ...NEW_PROGRESS, words: { ...NEW_PROGRESS.words, chapter } });
const first = () => 0;

describe('Hear it (#503): choosing', () => {
  it('only takes sentences your chapter has taught: due, then new, then known', () => {
    const picked = pickSentences(
      at(2),
      new Set(['hear:pcav:3']),
      new Set(['hear:pcav:3', 'hear:pcav:1']),
      first,
      POOL,
      8,
    );
    const decks = picked.map((p) => p.deck);
    expect(decks[0]).toBe('pcav:3');
    expect(decks.slice(1, 4).sort()).toEqual(['pcav:2', 'pcav:4', 'pcav:6']);
    expect(decks[4]).toBe('pcav:1');
  });

  it('stops at the round size, and takes what qualifies when it is short', () => {
    expect(pickSentences(at(3), new Set(), new Set(), first, POOL, 2)).toHaveLength(2);
    expect(pickSentences(at(1), new Set(), new Set(), first, POOL, 8)).toHaveLength(2);
  });

  it('treats an old save with no hear: items as all new', () => {
    const old = parseProgress({ lesson: 3 });
    const picked = pickSentences(old, new Set(), new Set(), first, POOL, 8);
    expect(picked.map((p) => p.deck).sort()).toEqual(['pcav:1', 'pcav:2']);
  });

  it('opens after chapter 1 and with at least 4 sentences', () => {
    expect(hearOpen(at(1), POOL)).toBe(false);
    expect(hearOpen(at(2), POOL)).toBe(true);
    expect(hearOpen(at(2), POOL.slice(0, 3))).toBe(false);
  });
});

describe('Hear it (#503): the question', () => {
  it('offers the right meaning with three different wrong ones', () => {
    const c = meaningChoices(
      'I am hungry',
      ['I am hungry', 'Go home', 'go home ', 'Sit', 'Eat', 'Run'],
      first,
    );
    expect(c).toHaveLength(4);
    expect(c).toContain('I am hungry');
    expect(new Set(c.map((x) => x.trim().toLowerCase())).size).toBe(4);
  });

  it('offers 3 choices when only 2 other meanings differ', () => {
    expect(meaningChoices('Yes', ['No', 'no', 'Yes'], first)).toHaveLength(2);
    expect(meaningChoices('Yes', ['No', 'Maybe'], first)).toHaveLength(3);
  });

  it('builds a bank of the sentence’s words (each copy) plus 2 spares it does not use', () => {
    const bank = wordBank(['a', 'b', 'a'], ['a', 'x', 'y', 'z'], first);
    const texts = bank.map((w) => w.text);
    expect(texts.filter((t) => t === 'a' || t === 'b').sort()).toEqual(['a', 'a', 'b']);
    expect(texts.filter((t) => 'xyz'.includes(t))).toHaveLength(2);
    expect(texts).toHaveLength(5);
    expect(new Set(bank.map((w) => w.id)).size).toBe(5);
  });

  it('marks words in or out of place; a repeated word fits either of its places', () => {
    expect(markPlaced(['a', 'c', 'a'], ['a', 'b', 'a'])).toEqual([true, false, true]);
    expect(markPlaced(['b', 'a'], ['a', 'a'])).toEqual([false, true]);
  });
});

describe('Hear it (#503): grading and saving', () => {
  it('grades both right Good, one Hard, neither Again', () => {
    expect(gradeHear(true, true)).toBe('good');
    expect(gradeHear(true, false)).toBe('hard');
    expect(gradeHear(false, true)).toBe('hard');
    expect(gradeHear(false, false)).toBe('again');
  });

  it('saves a review and two listen results per sentence answered', async () => {
    const saveSession = vi.fn(async (report: unknown) => void report);
    const api = { saveSession } as unknown as SubjectApi;
    await reportHear(api, [{ sentence: s(1, 1), meaning: true, order: false }], 30);
    expect(saveSession.mock.calls[0]?.[0]).toMatchObject({
      reviews: [{ itemId: 'hear:pcav:1', grade: 'hard' }],
      results: [
        { skill: 'listen', itemId: 'hear:pcav:1', score: 1 },
        { skill: 'listen', itemId: 'hear:pcav:1', score: 0 },
      ],
    });
  });

  it('saves an all-wrong sentence as Again with two zero scores', async () => {
    const saveSession = vi.fn(async (report: unknown) => void report);
    const api = { saveSession } as unknown as SubjectApi;
    await reportHear(api, [{ sentence: s(2, 1), meaning: false, order: false }], 30);
    expect(saveSession.mock.calls[0]?.[0]).toMatchObject({
      reviews: [{ itemId: 'hear:pcav:2', grade: 'again' }],
      results: [{ score: 0 }, { score: 0 }],
    });
  });
});
