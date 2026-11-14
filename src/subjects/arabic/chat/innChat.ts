// The logic of a chat at the inn (E17, ADR 0038): who you can sit with, what's sent to the
// partner function, and how a finished chat changes the Arabic progress. The screen is InnChat.
import type { CoachTip, InnChatAsk, InnTurn } from '../../../core/partner.ts';
import type { ArabicProgress } from '../progress.ts';
import { REGULARS, regularStatus, type Regular } from '../questline.ts';
import { WORD_CHAPTERS } from '../core/wordChapters.ts';
import { inHebrewVowelled } from '../marks.ts';
import { LETTERS } from '../letters.ts';

/** Your lines in one chat; after that the regular has to go. */
export const MAX_LINES = 8;
/** A line you type, at most (the function takes 160). */
export const MAX_TYPED = 120;
/** XP for a chat of at least this many of your lines. */
export const CHAT_XP = 10;
export const LINES_FOR_XP = 3;
/** The regular's own goodbye after your last line: no call to the function. */
export const GOODBYE = 'يلّا، لازم أروح هلّق. مع السلامة!';
/** The glosses of the chapter's words sent with each line, at most. */
const WORDS_SENT = 25;

/** Who sits at the table: the regular of your road now, and every regular whose trial you've passed. */
export function regularsToTalkTo(p: ArabicProgress): Regular[] {
  if (!p.guest) return [];
  const now = regularStatus(p)?.regular;
  return REGULARS.filter((r) => r.number === now?.number || p.words.trials.includes(r.number));
}

/** What the regular is told about themselves: our own story text, and their gender for the grammar. */
export function aboutOf(r: Regular): string {
  const gender = r.she ? 'You are a woman.' : 'You are a man.';
  return `${gender} ${r.intro} ${r.outro}`.replace(/\s+/g, ' ').slice(0, 900);
}

/** The ask for the regular's next line: our own glosses only, never deck text (ADR 0038). */
export function chatAsk(r: Regular, p: ArabicProgress, turns: readonly InnTurn[]): InnChatAsk {
  const chapter = WORD_CHAPTERS[r.wordChapter - 1];
  return {
    kind: 'inn-chat',
    persona: { who: r.who.slice(0, 80), about: aboutOf(r) },
    learner: { name: p.chat.name || 'traveler' },
    theme: (chapter?.theme ?? r.title).slice(0, 160),
    words: [...new Set((chapter?.words ?? []).map((w) => w.gloss.slice(0, 40)))].slice(
      0,
      WORDS_SENT,
    ),
    told: (p.chat.told[String(r.number)] ?? []).slice(-3),
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
        .replace('؟', '?')
        .replace('،', ',')
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
    chat: { ...p.chat, told: { ...p.chat.told, [key]: told }, chats: p.chat.chats + 1 },
  };
}

/** Your lines in a chat. */
export const linesOf = (turns: readonly InnTurn[]) => turns.filter((t) => t.who === 'you').length;

/** Hebrew final forms, read as their plain letter. */
const FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

/**
 * Hebrew letters to Arabic ones, from the letter table's own bridge (content/arabic/letters.json):
 * ח׳ is خ, ג׳ is ج, and so on (a plain apostrophe works as the geresh). A ה ending a word is ة,
 * but for الله.
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
    const withGeresh = next === '׳' ? FROM_HEBREW.get(c + '׳') : undefined;
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
    else out += FROM_HEBREW.get(c) ?? c;
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
          ),
      )
      .slice(0, 3);
  } catch {
    return null;
  }
}
