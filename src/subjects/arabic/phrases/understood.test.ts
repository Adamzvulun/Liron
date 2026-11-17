import { describe, expect, it } from 'vitest';
import { judge, normalizeArabic } from './understood.ts';

describe('normalizeArabic (ADR 0014)', () => {
  it('drops vowel marks, tatweel and punctuation, and writes alef, ى, ة and hamza one way', () => {
    expect(normalizeArabic('أَهْلاً وَسَهْلاً!')).toBe('اهلا وسهلا');
    expect(normalizeArabic('كيف حالك؟')).toBe('كيف حالك');
    expect(normalizeArabic('على')).toBe('علي');
    expect(normalizeArabic('صباح الخيـــر (morning)')).toBe('صباح الخير');
    expect(normalizeArabic('مدرسة')).toBe('مدرسه');
    expect(normalizeArabic('مسؤول')).toBe('مسءول');
  });
});

describe('judge', () => {
  it('accepts the phrase however Whisper spells it', () => {
    expect(judge('أهلاً وسهلاً.', 'أهلا وسهلا').understood).toBe(true);
    expect(judge('الحمد لله', 'الحمدُ لله').difference).toBe(0);
    expect(judge('تصبح على خير', 'تصبح علی خير').understood).toBe(true);
  });

  it('accepts ق heard as ج or غ, the way this dialect says it', () => {
    expect(judge('جديش', 'قديش').difference).toBe(0);
    expect(judge('غهوة', 'قهوة').difference).toBe(0);
    // Only that way round: the phrase's ج isn't a ق.
    expect(judge('قمل', 'جمل').difference).toBeGreaterThan(0);
  });

  it('accepts the standard ث, ذ and ظ for the dialect’s ت, د and ض', () => {
    expect(judge('الساعة ثلاثة', 'الساعة تلاتة').difference).toBe(0);
    expect(judge('هذا', 'هدا').difference).toBe(0);
  });

  it('accepts digits for numbers', () => {
    expect(judge('15', 'خمستاعش').understood).toBe(true);
    expect(judge('٣ ساعات', 'تلات ساعات').difference).toBe(0);
    expect(judge('3 ساعات', 'ثلاث ساعات').difference).toBe(0);
    expect(judge('٢', 'اتنين').understood).toBe(true);
  });

  it('allows a slip or two, but not a different phrase', () => {
    expect(judge('صباح الخيل', 'صباح الخير').understood).toBe(true);
    expect(judge('مساء الخير', 'صباح الخير').understood).toBe(false);
    expect(judge('شكرا', 'مرحبا').understood).toBe(false);
    expect(judge('صباح', 'صباح الخير').understood).toBe(false);
  });

  it('wants short words exactly: one letter makes a different word', () => {
    expect(judge('شاي', 'باي').understood).toBe(false);
    expect(judge('بكرا', 'شكرا').understood).toBe(false);
    expect(judge('يمين', 'مين').understood).toBe(false);
    expect(judge('هلا', 'لا').understood).toBe(false);
  });

  it('counts words split or joined differently as close', () => {
    expect(judge('اهلاوسهلا', 'أهلا وسهلا').understood).toBe(true);
    expect(judge('الحمد للّه', 'الحمدلله').understood).toBe(true);
  });

  it("doesn't count silence or Latin-only answers as understood", () => {
    expect(judge('', 'مرحبا')).toEqual({ understood: false, difference: 1 });
    expect(judge('Thank you.', 'مرحبا').understood).toBe(false);
  });
});
