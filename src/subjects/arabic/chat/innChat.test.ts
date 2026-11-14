import { describe, expect, it } from 'vitest';
import { NEW_PROGRESS, parseProgress } from '../progress.ts';
import { REGULARS } from '../questline.ts';
import { WORD_CHAPTERS } from '../core/wordChapters.ts';
import {
  aboutOf,
  afterChat,
  chatAsk,
  cleanTyped,
  fromHebrew,
  lineInHebrew,
  regularsToTalkTo,
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

  it('tells each regular their gender for the grammar', () => {
    const she = REGULARS.find((r) => r.she);
    const he = REGULARS.find((r) => !r.she);
    expect(aboutOf(must(she))).toMatch(/^You are a woman\. /);
    expect(aboutOf(must(he))).toMatch(/^You are a man\. /);
    expect(REGULARS.every((r) => aboutOf(r).length <= 900)).toBe(true);
  });

  it('sends the theme and our own English glosses, never the deck', () => {
    const ask = chatAsk(first, { ...guest, chat: { ...NEW_PROGRESS.chat, name: 'Adam' } }, []);
    const chapter = must(WORD_CHAPTERS[first.wordChapter - 1]);
    expect(ask).toMatchObject({ kind: 'inn-chat', learner: { name: 'Adam' }, turns: [] });
    expect(ask.theme).toBe(chapter.theme.slice(0, 160));
    expect(ask.words.length).toBeGreaterThan(0);
    expect(ask.words.length).toBeLessThanOrEqual(25);
    expect(ask.words.every((w) => chapter.words.some((x) => x.gloss.startsWith(w)))).toBe(true);
    // The deck's ids and sentences stay home: glosses are English.
    expect(JSON.stringify(ask)).not.toMatch(/deck|lingualism/i);
    expect(ask.words.join(' ')).not.toMatch(/\p{Script=Arabic}/u);
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
    expect(parseProgress({ ...NEW_PROGRESS, chat: undefined }).chat).toEqual({
      name: '',
      told: {},
      chats: 0,
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
});
