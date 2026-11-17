import { describe, expect, it } from 'vitest';
import type { CoreWord } from '../core/coreWords.ts';
import { NEW_PROGRESS } from '../progress.ts';
import {
  applyShadow,
  GRADE,
  shadowLines,
  shadowRound,
  wordCount,
  type ShadowLine,
} from './shadow.ts';

const word = (deck: string, chapter: number, sentence?: string, sDeck = `s${deck}`): CoreWord => ({
  deck,
  itemId: `word:${deck}`,
  chapter,
  arabic: 'كلمة',
  latin: 'kilme',
  hebrew: '',
  meaning: `gloss ${deck}`,
  audio: `${deck}.mp3`,
  ...(sentence
    ? {
        sentence: {
          arabic: sentence,
          latin: 'x',
          english: 'x',
          audio: `${sDeck}.mp3`,
          deck: sDeck,
        },
      }
    : {}),
});

const CHAPTERS: CoreWord[][] = [
  [
    word('a', 1, 'أنا جاهز اليوم'),
    word('b', 1, 'هذا كثير'),
    word('c', 1, 'واحد اثنين ثلاثة أربعة خمسة ستة سبعة'),
    word('d', 1),
  ],
  [word('e', 2, 'بدي أروح عالبيت هلأ!'), word('f', 2, 'بدي أروح عالبيت هلأ!', 'se')],
];

describe('shadowing (#194)', () => {
  it('counts words, not punctuation', () => {
    expect(wordCount('بدي أروح عالبيت هلأ!')).toBe(4);
    expect(wordCount('شو؟ - ولا إشي.')).toBe(3);
  });

  it('takes 3- to 6-word sentences of the words you’ve met, each once', () => {
    const lines = shadowLines(CHAPTERS, new Set(['a', 'b', 'c', 'e', 'f']));
    expect(lines.map((l) => l.deck)).toEqual(['sa', 'se']);
    expect(lines[0]).toMatchObject({ itemId: 'shadow:sa', word: 'gloss a', words: 3 });
  });

  it('uses the first chapter’s sentences until you’ve met a word', () => {
    expect(shadowLines(CHAPTERS, new Set()).map((l) => l.deck)).toEqual(['sa']);
  });

  it('puts due sentences first, then new ones shortest first', () => {
    const line = (deck: string, words: number): ShadowLine => ({
      deck,
      itemId: `shadow:${deck}`,
      arabic: '',
      latin: '',
      english: '',
      audio: '',
      word: '',
      words,
    });
    const lines = [line('long', 6), line('done', 3), line('due', 5), line('short', 3)];
    const round = shadowRound(
      lines,
      new Set(['shadow:due']),
      new Set(['shadow:due', 'shadow:done']),
      () => 0.3,
      3,
    );
    expect(round.map((l) => l.deck)).toEqual(['due', 'short', 'long']);
  });

  it('grades in step as good, close as hard, lost as again, and counts what you shadowed', () => {
    expect(GRADE).toEqual({ 'in-step': 'good', close: 'hard', lost: 'again' });
    const next = applyShadow(NEW_PROGRESS, 4);
    expect(next.echo.shadowed).toBe(4);
    expect(next.sessions).toBe(1);
  });
});
