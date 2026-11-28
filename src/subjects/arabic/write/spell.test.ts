import { describe, expect, it } from 'vitest';
import { wordsFrom, NO_REVIEW } from '../words.ts';
import { LETTERS } from '../letters.ts';
import { SLATE_IDS } from '../ranks.ts';
import {
  isSpelledRight,
  markLetters,
  pickSpellRound,
  spellEvents,
  spellGrade,
  spellItemId,
  spellOpen,
  spellScore,
} from './spell.ts';

const text = (cs: { text: string; ok: boolean }[]) => cs.filter((c) => !c.ok).map((c) => c.text);

describe('isSpelledRight (#519)', () => {
  it('ignores the short vowels and other marks', () => {
    expect(isSpelledRight('بيْت', 'بيت')).toBe(true);
    expect(isSpelledRight('بيت', 'بَيْتٌ')).toBe(true);
  });
  it('takes ة for ه and the alef and yeh forms as one', () => {
    expect(isSpelledRight('مدرسة', 'مدرسه')).toBe(true);
    expect(isSpelledRight('أنا', 'انا')).toBe(true);
    expect(isSpelledRight('إلى', 'الي')).toBe(true);
  });
  it('is wrong for another letter, a missing letter or nothing typed', () => {
    expect(isSpelledRight('مدرسة', 'مدرصة')).toBe(false);
    expect(isSpelledRight('مدرسة', 'مدرس')).toBe(false);
    expect(isSpelledRight('مدرسة', '')).toBe(false);
    expect(isSpelledRight('بيت', ' ')).toBe(false);
  });
});

describe('markLetters', () => {
  it('marks the wrong letter on both sides', () => {
    const m = markLetters('مدرسة', 'مدرصة');
    expect(text(m.right)).toEqual(['س']);
    expect(text(m.yours)).toEqual(['ص']);
  });
  it('marks nothing when the spelling is right, whatever the marks', () => {
    const m = markLetters('بيْت', 'بيت');
    expect(text(m.right)).toEqual([]);
    expect(text(m.yours)).toEqual([]);
    expect(m.right.map((c) => c.text)).toEqual(['ب', 'يْ', 'ت']);
  });
  it('marks a missing letter on the right spelling only, and an extra one on yours', () => {
    expect(text(markLetters('بيت', 'بت').right)).toEqual(['ي']);
    expect(text(markLetters('بيت', 'بت').yours)).toEqual([]);
    expect(text(markLetters('بيت', 'بنيت').yours)).toEqual(['ن']);
  });
});

describe('grades', () => {
  it('Good first time, Hard second, Again otherwise', () => {
    expect([1, 2, null].map((t) => spellGrade(t as 1 | 2 | null))).toEqual([
      'good',
      'hard',
      'again',
    ]);
    expect([1, 2, null].map((t) => spellScore(t as 1 | 2 | null))).toEqual([1, 0.5, 0]);
  });
});

describe('spellOpen', () => {
  it('needs every single-character letter met', () => {
    expect(spellOpen(SLATE_IDS)).toBe(true);
    expect(spellOpen(SLATE_IDS.slice(1))).toBe(false);
    expect(spellOpen([])).toBe(false);
  });
});

describe('pickSpellRound', () => {
  const item = (n: number, arabic: string) => ({
    id: `pcav:${n}`,
    subject: 'arabic',
    type: 'vocab',
    data: { arabic, pronunciation: 'x', english: `w${n}` },
    media: [{ kind: 'audio', store: 'private', path: `a${n}.mp3` }],
    tags: [],
  });
  const words = wordsFrom(
    ['بيت', 'تين', 'بنت', 'نبي', 'باب', 'ضرب'].map((a, i) => item(i + 1, a)) as never,
    NO_REVIEW,
  );
  const met = new Set(LETTERS.filter((l) => l.lesson === 1).map((l) => l.id));

  it('takes words whose letters are met: due first, then new, then known', () => {
    const due = new Set([spellItemId({ id: 'pcav:5' })]);
    const fresh = new Set(['pcav:4', 'pcav:3'].map((id) => spellItemId({ id })));
    const got = pickSpellRound(
      words,
      met,
      due,
      (id) => fresh.has(id),
      () => 0.5,
      3,
    );
    expect(got.map((w) => w.id).sort()).toEqual(['pcav:3', 'pcav:4', 'pcav:5']);
    // Of 6 words, the one with an unmet letter (ض) never joins a round.
    expect(
      pickSpellRound(
        words,
        met,
        new Set(),
        () => false,
        () => 0.5,
        99,
      ),
    ).toHaveLength(5);
  });
});

describe('spellEvents (spell-90)', () => {
  const kinds = (share: number) => spellEvents(share).map((e) => e.kind);
  it('sends only spell-round below 0.9', () => {
    expect(kinds(7 / 8)).toEqual(['spell-round']);
  });
  it('adds spell-90 at exactly 0.9 and at a full round', () => {
    expect(kinds(0.9)).toEqual(['spell-round', 'spell-90']);
    expect(kinds(1)).toEqual(['spell-round', 'spell-90']);
  });
});
