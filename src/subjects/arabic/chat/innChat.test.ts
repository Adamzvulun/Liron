import type { Item } from '../../../core/content/schema.ts';
import type { WordReview } from '../words.ts';
import { describe, expect, it } from 'vitest';
import { NEW_PROGRESS, parseProgress } from '../progress.ts';
import { REGULARS } from '../questline.ts';
import {
  afterChat,
  chatAsk,
  cleanTyped,
  fromHebrew,
  lineInHebrew,
  regularsToTalkTo,
  standingWith,
  glossaryFrom,
  glossesIn,
  tipsFrom,
  dueTips,
  MAX_TIPS,
  tipId,
  withTips,
} from './innChat.ts';

const guest = { ...NEW_PROGRESS, guest: true };
function must<T>(x: T | undefined): T {
  if (x === undefined) throw new Error('missing');
  return x;
}
const first = must(REGULARS[0]);

describe('sit and talk at the inn (E17, ADR 0038)', () => {
  it('seats the regular of your road and every regular whose trial you passed', () => {
    expect(regularsToTalkTo(NEW_PROGRESS)).toEqual([]);
    expect(regularsToTalkTo(guest).map((r) => r.number)).toEqual([2]);
    const on = { ...guest, words: { ...guest.words, chapter: 3, trials: [2] } };
    expect(regularsToTalkTo(on).map((r) => r.number)).toEqual([2, 3]);
  });

  it('sends the regular by number and nothing of their sheet (report §4at)', () => {
    const ask = chatAsk(first, { ...guest, chat: { ...NEW_PROGRESS.chat, name: 'Adam' } }, []);
    expect(ask).toEqual({
      kind: 'inn-chat',
      regular: first.number,
      learner: { name: 'Adam' },
      told: [],
      met: 0,
      shared: false,
      turns: [],
    });
  });

  it('remembers the last three things you said to each regular', () => {
    const turns = ['واحد', 'اثنين', 'ثلاثة', 'أربعة'].flatMap((text) => [
      { who: 'them' as const, text: 'أهلا' },
      { who: 'you' as const, text },
    ]);
    const next = afterChat(guest, first, turns);
    expect(next.chat.told[String(first.number)]).toEqual(['اثنين', 'ثلاثة', 'أربعة']);
    expect(next.chat.chats).toBe(1);
    expect(afterChat(guest, first, [{ who: 'them', text: 'أهلا' }])).toBe(guest);
    expect(chatAsk(first, next, []).told).toEqual(['اثنين', 'ثلاثة', 'أربعة']);
    expect(parseProgress(next).chat).toEqual(next.chat);
  });

  it('reads old progress without a chat as a fresh one', () => {
    expect(parseProgress({ ...NEW_PROGRESS, chat: undefined }).chat).toEqual(NEW_PROGRESS.chat);
    expect(NEW_PROGRESS.chat).toEqual({
      name: '',
      told: {},
      chats: 0,
      met: {},
      hebrew: false,
      tips: [],
    });
  });

  it('keeps what you type to Arabic', () => {
    expect(cleanTyped('  مرحبا hello   كيفك؟ ')).toBe('مرحبا كيفك؟');
    expect(cleanTyped('<script>')).toBe('');
  });

  it('spells their line in Hebrew letters, word by word', () => {
    const he = lineInHebrew('مرحبا، كيفك؟');
    expect(he).not.toMatch(/\p{Script=Arabic}/u);
    expect(he).toMatch(/,/);
    expect(he).toMatch(/\?$/);
  });

  it('reads what you type in Hebrew letters as Arabic', () => {
    expect(fromHebrew('מניח, אלחמד ללה')).toBe('منيح، الحمد لله');
    expect(fromHebrew("ח'בז וג'בנה")).toBe('خبز وجبنة');
    // A final ה is ة, but ה׳ there is ه ("his"); a plain ג is ج (review, 2026-11-15).
    expect(fromHebrew('כלה')).toBe('كلة');
    expect(fromHebrew("כלה' פיה׳")).toBe('كله فيه');
    expect(fromHebrew('גמיל')).toBe('جميل');
    expect(fromHebrew('ח׳לאץ')).toBe('خلاص');
    expect(fromHebrew('כיפכ?')).toBe('كيفك؟');
    expect(fromHebrew('שו אסמכ? אנא אדם')).toBe('شو اسمك؟ انا ادم');
    expect(fromHebrew('مرحبا')).toBe('مرحبا');
  });

  it('reads the Coach’s tips, and nothing else', () => {
    const tip = { said: 'نعم', better: 'آه', why: 'نعم is formal.' };
    expect(tipsFrom(JSON.stringify({ tips: [tip, { said: 1 }] }))).toEqual([tip]);
    expect(tipsFrom(JSON.stringify({ tips: [] }))).toEqual([]);
    expect(tipsFrom('nope')).toBeNull();
    expect(tipsFrom('{}')).toBeNull();
    // One that the saved progress couldn't hold is dropped, not saved (review, 2026-11-15).
    const long = { ...tip, better: 'آه '.repeat(60) };
    expect(tipsFrom(JSON.stringify({ tips: [long, tip, { ...tip, said: ' ' }] }))).toEqual([tip]);
  });

  it('keeps the Coach’s tips as review items, once each, the newest 30', () => {
    const tip = { said: 'نعم', better: 'آه', why: 'نعم is formal.' };
    expect(tipId('آه')).toMatch(/^tip:[0-9a-z]+$/);
    expect(tipId('آه')).not.toBe(tipId('آه بدّي'));
    const once = withTips(guest, [tip, tip]);
    expect(once.chat.tips).toEqual([{ ...tip, id: tipId('آه') }]);
    expect(withTips(once, [tip]).chat.tips).toHaveLength(1);
    const many = Array.from({ length: 35 }, (_, i) => ({ ...tip, better: `آه ${i}` }));
    const kept = withTips(guest, many).chat.tips;
    expect(kept).toHaveLength(MAX_TIPS);
    expect(kept.at(-1)?.better).toBe('آه 34');
    expect(parseProgress(withTips(guest, many)).chat.tips).toEqual(kept);
    expect(dueTips(once, [{ itemId: tipId('آه') }, { itemId: 'pcav:1' }])).toEqual(once.chat.tips);
    expect(dueTips(once, [{ itemId: 'pcav:1' }])).toEqual([]);
  });

  it('counts chats with each regular: their reputation, sent with the next chat', () => {
    const say = [{ who: 'you' as const, text: 'مرحبا' }];
    expect(standingWith(guest, first)).toBe('New face');
    expect(chatAsk(first, guest, []).met).toBe(0);
    let p = afterChat(guest, first, say);
    expect(standingWith(p, first)).toBe('Knows you');
    expect(chatAsk(first, p, []).met).toBe(1);
    for (let i = 0; i < 4; i++) p = afterChat(p, first, say);
    expect(p.chat.met).toEqual({ [first.number]: 5 });
    expect(standingWith(p, first)).toBe('Old friend');
    // A chat with none of your lines doesn't count.
    expect(afterChat(p, first, []).chat.met).toEqual(p.chat.met);
  });

  it('glosses the words of a line that are on the word path, with our own glosses only', () => {
    const item = (id: string, arabic: string): Item => ({
      id,
      subject: 'arabic',
      type: 'vocab',
      data: { arabic, pronunciation: '', english: 'the deck’s own English' },
      media: [],
      tags: [],
    });
    const pool: WordReview = {
      lessons: new Set(),
      words: new Map([
        ['d:1', { gloss: 'house' }],
        ['d:2', { gloss: 'today' }],
        ['d:3', { gloss: 'coffee' }],
        ['d:4', { gloss: 'two words' }],
      ]),
    };
    const glossary = glossaryFrom(
      [
        item('d:1', 'بَيْت'),
        item('d:2', 'اليوم'),
        item('d:3', 'قَهْوة'),
        item('d:4', 'صباح الخير'),
        item('d:9', 'شاي'),
      ],
      pool,
    );
    expect([...glossary]).toEqual([
      ['بيت', 'house'],
      ['اليوم', 'today'],
      ['قهوة', 'coffee'],
    ]);
    // Marks and punctuation don't matter; "and", "the" and "in" in front are looked past.
    expect(glossesIn('كيفك اليوم؟ بالبيت، والقهوةُ!', glossary)).toEqual([
      { word: 'اليوم', gloss: 'today' },
      { word: 'بالبيت', gloss: 'house' },
      { word: 'والقهوةُ', gloss: 'coffee' },
    ]);
    expect(glossesIn('بالبيت', glossary)).toEqual([{ word: 'بالبيت', gloss: 'house' }]);
    expect(glossesIn('شاي', glossary)).toEqual([]);
    // "My", "your" and the like at the end, with ة written ت before them.
    expect(glossesIn('وبيتك؟ قهوتي', glossary)).toEqual([
      { word: 'وبيتك', gloss: 'house' },
      { word: 'قهوتي', gloss: 'coffee' },
    ]);
  });

  it('sends a regular’s milestones as shared memories once their trial is passed', () => {
    expect(chatAsk(first, guest, []).shared).toBe(false);
    const passed = { ...guest, words: { ...guest.words, trials: [first.number] } };
    expect(chatAsk(first, passed, []).shared).toBe(true);
  });
});
