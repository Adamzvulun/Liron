import { describe, expect, it } from 'vitest';
import {
  inHebrewVowelled,
  MARKS,
  marksIn,
  marksOfLesson,
  marksUpTo,
  vowelSwaps,
  withMarks,
} from './marks.ts';

describe('vowel marks (#40)', () => {
  it('teaches the short vowels first, then sukun, shadda and tanween', () => {
    expect(marksOfLesson(1).map((m) => m.nameLatin)).toEqual(['fatḥa', 'kasra', 'ḍamma']);
    expect(marksOfLesson(2).map((m) => m.id)).toEqual(['mark:sukun']);
    expect(marksOfLesson(3).map((m) => m.id)).toEqual(['mark:shadda']);
    expect(marksUpTo(5)).toHaveLength(MARKS.length);
  });

  it('finds the marks a word carries, and keeps only the ones you know', () => {
    expect(marksIn('بِنْت').map((m) => m.id)).toEqual(['mark:kasra', 'mark:sukun']);
    expect(marksIn('شُكْراً').map((m) => m.id)).toContain('mark:tanween');
    expect(withMarks('بِنْت', marksUpTo(1))).toBe('بِنت');
    expect(withMarks('بِنْت', [])).toBe('بنت');
  });

  it('spells words in Hebrew with niqqud', () => {
    expect(inHebrewVowelled('بِنْت')).toBe('בִּנְת'.normalize('NFC'));
    expect(inHebrewVowelled('مَلِك')).toBe('מַלִכּ'.normalize('NFC'));
    expect(inHebrewVowelled('تِبِن')).toBe('תִבִּן'.normalize('NFC'));
    // Shadda is a dagesh; a final letter drops it.
    expect(inHebrewVowelled('بنّ')).toBe('בּן'.normalize('NFC'));
    // The deck's ō and ē (sukun on و and ي).
    expect(inHebrewVowelled('موْت')).toBe('מוֹת'.normalize('NFC'));
    expect(inHebrewVowelled('بَيْت')).toBe('בֵּית'.normalize('NFC'));
    // Tanween: -an, and ة before it is said t.
    expect(inHebrewVowelled('شُكْراً')).toBe('שֻכְּרַן'.normalize('NFC'));
    // Tanween before its alif (the order Unicode prefers) reads the same: no stray alef (C5).
    expect(inHebrewVowelled('شُكْرًا')).toBe('שֻכְּרַן'.normalize('NFC'));
    expect(inHebrewVowelled('عادةً')).toBe('עאדתַן'.normalize('NFC'));
    // Words starting with two consonants keep their shva.
    expect(inHebrewVowelled('لْسان')).toBe('לְסאן'.normalize('NFC'));
    expect(inHebrewVowelled('abc')).toBeNull();
  });

  it('swaps one short vowel at a time for wrong choices', () => {
    expect(vowelSwaps('بِنْت').map((w) => inHebrewVowelled(w))).toEqual([
      'בַּנְת'.normalize('NFC'),
      'בֻּנְת'.normalize('NFC'),
    ]);
    expect(vowelSwaps('بنت')).toEqual([]);
  });
});
