import { describe, expect, it, vi } from 'vitest';
import type { SubjectApi } from '../../../core/subject.ts';
import { MORSE_CHARS } from '../code.ts';
import { seededRandom } from '../lesson/build.ts';
import { NEW_PROGRESS } from '../lesson/progress.ts';
import { MORSE_WORDS, openWords, type MorseWord } from '../words.ts';
import {
  applyWords,
  gradeOf,
  isRight,
  pickRound,
  reportWords,
  scoreOf,
  wordsOpen,
  xpForWords,
  type WordAttempt,
} from './drill.ts';

const KOCH = MORSE_CHARS.map((c) => c.char);
const word = (id: string): MorseWord => {
  const w = MORSE_WORDS.find((x) => x.id === id);
  if (!w) throw new Error(id);
  return w;
};
const attempt = (id: string, typed: string, again = false): WordAttempt => ({
  word: word(id),
  typed,
  again,
});

describe('the word drill (#154)', () => {
  it('opens once the Gatekeeper is passed', () => {
    expect(wordsOpen(NEW_PROGRESS)).toBe(false);
    expect(wordsOpen({ ...NEW_PROGRESS, unlocked: 9, trials: [1] })).toBe(true);
  });

  it('scores right, right after AGN, and wrong', () => {
    const right = attempt('word:are', 'are');
    const twice = attempt('word:are', 'ARE', true);
    const wrong = attempt('word:are', 'ART');
    expect([right, twice, wrong].map(scoreOf)).toEqual([1, 0.5, 0]);
    expect([right, twice, wrong].map(gradeOf)).toEqual(['good', 'hard', 'again']);
    // A prosign can be typed with or without its brackets.
    expect(isRight(attempt('prosign:ar', 'AR'))).toBe(true);
    expect(isRight(attempt('prosign:ar', '<ar>'))).toBe(true);
  });

  it('starts a new learner with the commonest words and one piece of shorthand', () => {
    const open = openWords(KOCH.slice(0, 8));
    const round = pickRound(open, [], new Set(), seededRandom(1));
    expect(round).toHaveLength(10);
    expect(new Set(round.map((w) => w.id)).size).toBe(10);
    // Nothing practiced yet, so the round is all new words from the open ones.
    for (const w of round) expect(open).toContain(w);
  });

  it('puts due words first, then at most three new ones, then known words', () => {
    const open = openWords(KOCH.slice(0, 16));
    const seen = new Set(open.slice(0, 20).map((w) => w.id));
    const due = [open[3], open[7]].map((w) => w?.id ?? '');
    const round = pickRound(open, due, seen, seededRandom(2));
    const ids = round.map((w) => w.id);
    expect(ids).toEqual(expect.arrayContaining(due));
    const fresh = round.filter((w) => !seen.has(w.id));
    expect(fresh).toHaveLength(3);
    expect(fresh.filter((w) => w.kind === 'word')).toHaveLength(2);
    // The new common words are the most frequent ones not yet practiced.
    const firstUnseen = open.filter((w) => w.kind === 'word' && !seen.has(w.id)).slice(0, 2);
    expect(fresh.filter((w) => w.kind === 'word')).toEqual(expect.arrayContaining(firstUnseen));
  });

  it('ignores due words that are not open, and copes with few words', () => {
    const open = openWords(['K', 'M', 'R']);
    const round = pickRound(open, ['word:the'], new Set(), seededRandom(3));
    expect(round.map((w) => w.id).sort()).toEqual(open.map((w) => w.id).sort());
  });

  it('pays 2 XP a right word and keeps the best round', () => {
    const attempts = [
      attempt('word:are', 'ARE'),
      attempt('word:as', 'AS', true),
      attempt('word:an', 'X'),
    ];
    expect(xpForWords(attempts)).toBe(4);
    const next = applyWords({ ...NEW_PROGRESS, words: { rounds: 2, best: 5 } }, attempts);
    expect(next.words).toEqual({ rounds: 3, best: 5 });
    expect(applyWords(NEW_PROGRESS, attempts).words).toEqual({ rounds: 1, best: 2 });
  });

  it('remembers each prosign copied right, once (#178)', () => {
    const once = applyWords(NEW_PROGRESS, [
      attempt('prosign:ar', 'AR'),
      attempt('prosign:sk', 'X'),
      attempt('word:are', 'ARE'),
    ]);
    expect(once.prosigns).toEqual(['prosign:ar']);
    const twice = applyWords(once, [attempt('prosign:ar', '<AR>'), attempt('prosign:sk', 'SK')]);
    expect(twice.prosigns).toEqual(['prosign:ar', 'prosign:sk']);
  });

  it('reports one save with reviews, head-copy results and events', async () => {
    const saveSession = vi.fn().mockResolvedValue(undefined);
    const api = { saveSession } as unknown as SubjectApi;
    const attempts = Array.from({ length: 10 }, () => attempt('abbr:qth', 'QTH'));
    await reportWords(api, NEW_PROGRESS, attempts, 90, new Date('2026-11-10T00:00:00Z'));
    const report = saveSession.mock.calls[0]?.[0];
    expect(report.reviews[0]).toEqual({ itemId: 'abbr:qth', grade: 'good' });
    expect(report.results[0]).toEqual({
      skill: 'head-copy',
      itemId: 'abbr:qth',
      score: 1,
      itemSeed: 1100,
    });
    expect(report.xp).toBe(20);
    expect(report.minutes).toBe(1.5);
    expect(report.events).toEqual([{ kind: 'words-round' }, { kind: 'words-perfect' }]);
  });
});
