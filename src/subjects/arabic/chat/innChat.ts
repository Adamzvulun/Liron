// The logic of a chat at the inn (E17, ADR 0038): who you can sit with, what's sent to the
// partner function, and how a finished chat changes the Arabic progress. The screen is InnChat.
import type { CoachTip, InnChatAsk, InnTurn } from '../../../core/partner.ts';
import type { ArabicProgress } from '../progress.ts';
import { REGULARS, regularStatus, type Regular } from '../questline.ts';
import { inHebrewVowelled } from '../marks.ts';
import { LETTERS } from '../letters.ts';
import type { Item } from '../../../core/content/schema.ts';
import { ECHO_POOL, type WordReview } from '../words.ts';
import { LINES_FOR_XP, MAX_LINES, OLD_FRIEND_CHATS } from './limits.ts';

export { LINES_FOR_XP, MAX_LINES, OLD_FRIEND_CHATS };

/** A line you type, at most (the function takes 160). */
export const MAX_TYPED = 120;
/** XP for a chat of at least this many of your lines. */
export const CHAT_XP = 10;
/** The regular's own goodbye after your last line: no call to the function. */
export const GOODBYE = 'يلّا، لازم أروح هلّق. مع السلامة!';

/** *Spell it* rounds passed at 80% that open the inn on the Arabic keyboard. */
export const SPELLED_FOR_KEYBOARD = 3;

/** Typing in Hebrew letters: your saved choice, else until you can spell (spelling doc, EARS 6). */
export const typesHebrew = (p: ArabicProgress) => p.chat.hebrew ?? p.spelled < SPELLED_FOR_KEYBOARD;

/** Who sits at the table: the regular of your road now, and every regular whose trial you've passed. */
export function regularsToTalkTo(p: ArabicProgress): Regular[] {
  if (!p.guest) return [];
  const now = regularStatus(p)?.regular;
  return REGULARS.filter((r) => r.number === now?.number || p.words.trials.includes(r.number));
}

/**
 * The ask for the regular's next line. The function looks the regular up by number in our own
 * content (their story, the chapter's theme and glosses, never deck text; ADR 0038), so the browser
 * sends only who, what you've told them, how often you've met, and whether their trial is passed.
 */
export function chatAsk(r: Regular, p: ArabicProgress, turns: readonly InnTurn[]): InnChatAsk {
  return {
    kind: 'inn-chat',
    regular: r.number,
    learner: { name: p.chat.name || 'traveler' },
    told: (p.chat.told[String(r.number)] ?? []).slice(-3),
    met: metWith(p, r),
    // Their milestones happened once their trial is passed: shared memories.
    shared: p.words.trials.includes(r.number),
    turns,
  };
}

/** What you type, tidied: Arabic letters, marks, digits, spaces and a little punctuation. */
export function cleanTyped(text: string): string {
  return text
    .replace(/[^؀-ۿ\s0-9.,!?]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TYPED);
}

/** A line in Hebrew letters, word by word; a word we can't spell stays in Arabic. */
export function lineInHebrew(line: string): string {
  return line
    .split(/\s+/)
    .map((word) => {
      const bare = [...word]
        .filter((c) => /\p{Script=Arabic}/u.test(c) && !'؟،؛'.includes(c))
        .join('');
      const tail = word
        .replace(/؟/g, '?')
        .replace(/،/g, ',')
        .replace(/\p{Script=Arabic}/gu, '');
      if (!bare) return word;
      return (inHebrewVowelled(bare) ?? bare) + tail.replace(/[^?!.,]/g, '');
    })
    .join(' ');
}

/** The progress after a chat: your name, the last 3 things you said to them, the count. */
export function afterChat(
  p: ArabicProgress,
  r: Regular,
  turns: readonly InnTurn[],
): ArabicProgress {
  const yours = turns.filter((t) => t.who === 'you').map((t) => t.text.slice(0, 160));
  if (!yours.length) return p;
  const key = String(r.number);
  const told = [...(p.chat.told[key] ?? []), ...yours].slice(-3);
  return {
    ...p,
    chat: {
      ...p.chat,
      told: { ...p.chat.told, [key]: told },
      met: { ...p.chat.met, [key]: metWith(p, r) + 1 },
      chats: p.chat.chats + 1,
      best: Math.max(p.chat.best, yours.length),
    },
  };
}

/** Your lines in a chat. */
export const linesOf = (turns: readonly InnTurn[]) => turns.filter((t) => t.who === 'you').length;

/** Hebrew final forms, read as their plain letter. */
const FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

/**
 * Hebrew letters to Arabic ones, from the letter table's own bridge (content/arabic/letters.json):
 * ח׳ is خ, ג׳ is ج, and so on (a plain apostrophe works as the geresh). A ה ending a word is ة,
 * but for الله; ה׳ there is ه (كله׳ → كله). A plain ג is ج too: Arabic has no hard g of its own
 * here, and it's the likeliest thing meant.
 */
const FROM_HEBREW: ReadonlyMap<string, string> = new Map(
  LETTERS.filter((l) => !['ة', 'ء', 'ى', 'لا'].includes(l.letter)).map((l) => [
    (l.hebrew.split('/')[0] ?? l.hebrew).trim(),
    l.letter,
  ]),
);

/** What you typed in Hebrew letters (E17's Hebrew typing), in Arabic script. */
export function fromHebrew(text: string): string {
  const plain = [...text.replace(/['’`]/g, '׳')].map((c) => FINALS[c] ?? c);
  let out = '';
  for (let i = 0; i < plain.length; i++) {
    const c = plain[i] ?? '';
    const next = plain[i + 1];
    const withGeresh = next === '׳' ? (c === 'ה' ? 'ه' : FROM_HEBREW.get(c + '׳')) : undefined;
    if (withGeresh) {
      out += withGeresh;
      i++;
      continue;
    }
    const atEnd = !next || !/\p{Script=Hebrew}/u.test(next) || next === '׳';
    // …except in الله (ללה), where it's a plain ه.
    const allah = plain[i - 1] === 'ל' && plain[i - 2] === 'ל';
    if (c === 'ה' && atEnd && !allah && /\p{Script=Hebrew}/u.test(plain[i - 1] ?? '')) {
      out += 'ة';
      continue;
    }
    if (c === '?') out += '؟';
    else if (c === ',') out += '،';
    else if (c === '׳') continue;
    else out += FROM_HEBREW.get(c) ?? (c === 'ג' ? 'ج' : c);
  }
  return out;
}

/** The Coach's tips from the reply's text (JSON), checked again here; null if it isn't that. */
export function tipsFrom(text: string): CoachTip[] | null {
  try {
    const body = JSON.parse(text) as { tips?: unknown };
    if (!Array.isArray(body.tips)) return null;
    return body.tips
      .filter(
        (t): t is CoachTip =>
          typeof t === 'object' &&
          t !== null &&
          ['said', 'better', 'why'].every(
            (k) => typeof (t as Record<string, unknown>)[k] === 'string',
          ) &&
          // What the saved progress can hold: one tip too long there would wipe every kept
          // tip, so a tip that won't fit is dropped (`why` is cut to 140 in withTips).
          [(t as CoachTip).said, (t as CoachTip).better].every((x) => x.trim() && x.length <= 160),
      )
      .slice(0, 3);
  } catch {
    return null;
  }
}

/** The most Coach's tips kept; the oldest go first. */
export const MAX_TIPS = 30;

/** A tip's review item id: `tip:` and a short hash of the better line. */
export function tipId(better: string): string {
  let h = 5381;
  for (const c of better) h = ((h * 33) ^ (c.codePointAt(0) ?? 0)) >>> 0;
  return `tip:${h.toString(36)}`;
}

/** The progress with these tips kept (a tip already kept isn't added twice). */
export function withTips(p: ArabicProgress, tips: readonly CoachTip[]): ArabicProgress {
  const have = new Set(p.chat.tips.map((t) => t.id));
  const fresh = tips
    .map((t) => ({ ...t, id: tipId(t.better), why: t.why.slice(0, 140) }))
    .filter((t) => !have.has(t.id) && have.add(t.id));
  return { ...p, chat: { ...p.chat, tips: [...p.chat.tips, ...fresh].slice(-MAX_TIPS) } };
}

/** The kept tips that are due for review now. */
export function dueTips(p: ArabicProgress, due: readonly { itemId: string }[]) {
  const ids = new Set(due.map((d) => d.itemId));
  return p.chat.tips.filter((t) => ids.has(t.id));
}

/** Chats with this regular so far (their reputation, E17). */
export const metWith = (p: ArabicProgress, r: Regular) => p.chat.met[String(r.number)] ?? 0;

/** How a regular knows you, from how often you've sat with them. */
export function standingWith(p: ArabicProgress, r: Regular): string {
  const n = metWith(p, r);
  return n === 0 ? 'New face' : n < OLD_FRIEND_CHATS ? 'Knows you' : 'Old friend';
}

/** A word's letters only: no vowel marks or punctuation, and every alif as ا. */
const plainArabic = (word: string) =>
  [...word]
    .filter((c) => /[ء-ي]/u.test(c))
    .join('')
    .replace(/[أإآ]/gu, 'ا')
    .replace(/ى/gu, 'ي');

/** The words we gloss, by their plain letters: our own glosses only, never the deck's English. */
export type Glossary = ReadonlyMap<string, string>;

/**
 * The glossary for a chat: every deck word with our gloss (the word path and the reviewed letter
 * lessons, ECHO_POOL). It's built in the browser from the deck you've loaded; nothing is sent.
 */
export function glossaryFrom(items: readonly Item[], pool: WordReview = ECHO_POOL): Glossary {
  const glossary = new Map<string, string>();
  for (const item of items) {
    const gloss = pool.words.get(item.id)?.gloss;
    const arabic = (item.data as { arabic?: unknown }).arabic;
    if (!gloss || typeof arabic !== 'string' || /\s/.test(arabic.trim())) continue;
    const plain = plainArabic(arabic);
    if (plain.length > 1 && !glossary.has(plain)) glossary.set(plain, gloss);
  }
  return glossary;
}

/** What a word may start with: "and", "the", "in", "to", and their pairs. */
const PREFIXES = ['وال', 'بال', 'فال', 'عال', 'لل', 'ال', 'و', 'ب', 'ف', 'ل'];
/** What a word may end with: "my", "your", "his", "her", "our", "their". */
const SUFFIXES = ['كم', 'هم', 'ها', 'نا', 'ك', 'ي', 'ه', 'و'];

/** The words in a line that the glossary knows, as said in the line, at most 6. */
export function glossesIn(line: string, glossary: Glossary): { word: string; gloss: string }[] {
  const found: { word: string; gloss: string }[] = [];
  for (const token of line.split(/\s+/)) {
    const plain = plainArabic(token);
    const fronts = [
      plain,
      ...PREFIXES.filter((p) => plain.startsWith(p)).map((p) => plain.slice(p.length)),
    ];
    // The bare word first, then without "my", "your", "his"… at its end (بيتك, قهوتي: ة is ت there).
    const tries = [
      ...fronts,
      ...fronts.flatMap((f) =>
        SUFFIXES.filter((x) => f.endsWith(x) && f.length - x.length > 2).flatMap((x) => {
          const stem = f.slice(0, -x.length);
          return stem.endsWith('ت') ? [stem, `${stem.slice(0, -1)}ة`] : [stem];
        }),
      ),
    ];
    const gloss = tries
      .filter((t) => t.length > 1)
      .map((t) => glossary.get(t))
      .find(Boolean);
    const word = [...token].filter((c) => /[\u0621-\u0652]/u.test(c)).join('');
    if (gloss && !found.some((f) => f.gloss === gloss)) found.push({ word, gloss });
  }
  return found.slice(0, 6);
}
