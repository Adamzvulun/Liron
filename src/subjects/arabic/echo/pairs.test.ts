import { describe, expect, it } from 'vitest';
import type { Item } from '../../../core/content/schema.ts';
import { lettersOf, inHebrew } from '../letters.ts';
import { NEW_PROGRESS, parseProgress, type ArabicProgress } from '../progress.ts';
import type { Word } from '../words.ts';
import {
  applyRound,
  audioOf,
  currentPair,
  firstSound,
  HEARD_STREAK,
  minimalPairs,
  PAIRS,
  ROUND,
  roundQuestions,
  sideFor,
  wordsFor,
  type PairQuestion,
} from './pairs.ts';

const word = (id: string, arabic: string, sound: string): Word => {
  const letters = lettersOf(arabic) ?? [];
  return {
    id,
    arabic,
    letters,
    sound,
    meaning: id,
    audio: `a/${id}.mp3`,
    hebrew: inHebrew(letters),
    homograph: false,
  };
};

// Made-up words in the deck's romanization (ɧ for ح, 3 for ع, g for ق): enough of each sound.
const WORDS: Word[] = [
  ...Array.from({ length: 12 }, (_, i) => word(`hah${i}`, 'حب', 'ɧább')),
  ...Array.from({ length: 12 }, (_, i) => word(`heh${i}`, 'هب', 'hább')),
  word('ain', 'عم', '3amm'),
  word('alef', 'أم', 'amm'),
  word('al', 'الب', 'lbab'),
  word('qaf-g', 'قلب', 'galb'),
  word('qaf-q', 'قرن', 'qarn'),
  word('kaf', 'كلب', 'kalb'),
  word('long', 'حبببببب', 'ɧabbbbbb'),
];

const item = (id: string, arabic: string): Item => ({
  id,
  subject: 'arabic',
  type: 'vocab',
  data: { arabic, pronunciation: 'x', english: 'x' },
  media: [{ kind: 'audio', store: 'private', path: `a/${id}.mp3` }],
  tags: [],
});

function must<T>(x: T | undefined): T {
  if (x === undefined) throw new Error('missing');
  return x;
}
const byId = (id: string) => must(PAIRS.find((p) => p.id === id));
const withEcho = (echo: Partial<ArabicProgress['echo']>): ArabicProgress => ({
  ...NEW_PROGRESS,
  echo: { ...NEW_PROGRESS.echo, ...echo },
});
const rand = () => 0.42;

describe('sound pairs (#193)', () => {
  it('runs from ḥ / h, the hardest, to g / k, each with its letters and a tip', () => {
    expect(PAIRS.map((p) => p.id)).toEqual([
      'hah-heh',
      'ain-hamza',
      'khah-hah',
      'ghain-khah',
      'sad-seen',
      'dad-dal',
      'tah-teh',
      'qaf-kaf',
    ]);
    expect(
      PAIRS.every((p) => p.a.letter && p.b.letter && p.tip && p.itemId.startsWith('pair:')),
    ).toBe(true);
  });

  it('reads the first sound from the romanization, ʿayn’s 3 included', () => {
    expect(firstSound({ sound: '3ámm [pl.]' })).toBe('3amm');
    expect(firstSound({ sound: '-ɧāla' })).toBe('ɧala');
  });

  it('sorts a word by its first letter and its sound, and leaves out what isn’t clearly said', () => {
    const w = (id: string) => must(WORDS.find((x) => x.id === id));
    expect(sideFor(w('hah0'), byId('hah-heh'))).toBe('a');
    expect(sideFor(w('heh0'), byId('hah-heh'))).toBe('b');
    expect(sideFor(w('ain'), byId('ain-hamza'))).toBe('a');
    expect(sideFor(w('alef'), byId('ain-hamza'))).toBe('b');
    // Starts with alif but said with the article: no catch to hear.
    expect(sideFor(w('al'), byId('ain-hamza'))).toBeNull();
    expect(sideFor(w('qaf-g'), byId('qaf-kaf'))).toBe('a');
    // ق said as q isn't the g this pair trains.
    expect(sideFor(w('qaf-q'), byId('qaf-kaf'))).toBeNull();
    expect(wordsFor(WORDS, byId('hah-heh')).a.map((x) => x.id)).not.toContain('long');
  });

  it('finds the minimal pairs the deck has recordings for', () => {
    const pair = byId('ghain-khah');
    const { a, b } = must(pair.minimal[0]);
    expect(minimalPairs([item(a, 'غيمة')], pair)).toEqual([]);
    const found = minimalPairs([item(a, 'غيمة'), item(b, 'خيمة')], pair);
    expect(found).toHaveLength(1);
    expect(must(found[0]).a).toMatchObject({ deck: a, gloss: 'cloud', audio: `a/${a}.mp3` });
  });

  it('starts on ḥ / h, with a round of both sounds about equally', () => {
    expect(currentPair(NEW_PROGRESS)?.id).toBe('hah-heh');
    const qs = roundQuestions(NEW_PROGRESS, WORDS, [], rand);
    expect(qs).toHaveLength(ROUND);
    expect(qs.every((q) => q.pair.id === 'hah-heh' && q.kind === 'sound')).toBe(true);
    const a = qs.filter((q) => q.answer === 'a').length;
    expect(Math.abs(a - (ROUND - a))).toBeLessThanOrEqual(1);
    expect(audioOf(must(qs[0]))).toMatch(/^a\/(hah|heh)\d+\.mp3$/);
  });

  it('mixes heard pairs back in, and asks a minimal pair as "which one?"', () => {
    const p = withEcho({ heard: ['hah-heh'] });
    const pair = byId('ain-hamza');
    const items = pair.minimal.flatMap((m) => [item(m.a, 'عم'), item(m.b, 'أم')]);
    const qs = roundQuestions(p, WORDS, items, rand);
    expect(qs.some((q) => q.pair.id === 'hah-heh')).toBe(true);
    const one = qs.filter((q) => q.kind === 'one');
    expect(one.length).toBeGreaterThan(0);
    expect(one.every((q) => q.pair.id === 'ain-hamza')).toBe(true);
  });

  it('counts a streak on the pair you’re training, and opens the next at 20 in a row', () => {
    const pair = byId('hah-heh');
    const q = (id = 'hah-heh'): PairQuestion => ({
      kind: 'sound',
      pair: byId(id),
      word: must(WORDS[0]),
      answer: 'a',
    });
    const right = Array.from({ length: 10 }, () => ({ question: q(), right: true }));
    const first = applyRound(NEW_PROGRESS, right);
    expect(first.heard).toBeNull();
    expect(first.next.echo).toEqual({ heard: [], streak: 10, rounds: 1 });
    // A wrong answer resets it; one about another pair doesn't count.
    const reset = applyRound(first.next, [
      { question: q(), right: false },
      { question: q('qaf-kaf'), right: true },
    ]);
    expect(reset.next.echo.streak).toBe(0);
    const almost = withEcho({ streak: HEARD_STREAK - 10 });
    const done = applyRound(almost, right);
    expect(done.heard).toBe(pair);
    expect(done.next.echo).toMatchObject({ heard: ['hah-heh'], streak: 0 });
    expect(currentPair(done.next)?.id).toBe('ain-hamza');
  });

  it('mixes every pair once all are heard', () => {
    const p = withEcho({ heard: PAIRS.map((x) => x.id) });
    expect(currentPair(p)).toBeNull();
    expect(roundQuestions(p, WORDS, [], rand).length).toBeGreaterThan(0);
    expect(applyRound(p, []).heard).toBeNull();
  });

  it('reads an old save without the echo well as a fresh start', () => {
    expect(parseProgress({ lesson: 2 }).echo).toEqual({ heard: [], streak: 0, rounds: 0 });
  });
});
