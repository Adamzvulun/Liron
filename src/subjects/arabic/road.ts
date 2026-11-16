// The Long Road In as a road (docs/game/the-road.md §5): every lesson, station, trial and rank
// of the Caravanserai as one ordered list of steps, each with a check on the saved progress.
// The words are content (content/arabic/road.json, and the milestones and regulars of
// questline.json); the checks are here. Loaded lazily by index.ts, so the square stays small.
import { z } from 'zod';
import pack from '../../../content/arabic/road.json' with { type: 'json' };
import {
  answer,
  HALL_DOOR,
  inSentence,
  stationOfDay,
  walk,
  type Meanwhile,
  type RoadAnswer,
  type RoadChapter,
  type RoadContext,
  type RoadRules,
  type RoadStep,
  type WaitReason,
} from '../../core/road/road.ts';
import { heldRanks } from '../../core/ranks/ranks.ts';
import { MAX_LINES, LINES_FOR_XP, OLD_FRIEND_CHATS } from './chat/limits.ts';
import { WORD_CHAPTERS } from './core/wordChapters.ts';
import { PAIRS } from './echo/pairs.ts';
import { LESSONS, LETTERS } from './letters.ts';
import { parseProgress, wordsOpen, type ArabicProgress } from './progress.ts';
import { CHAPTER, REGULARS } from './questline.ts';
import {
  ARABIC_RANKS,
  arabicStanding,
  FRIEND_CHATS,
  FRIEND_WORDS,
  LOCAL_WORDS,
  SLATE_IDS,
  STORY_FRIENDS,
} from './ranks.ts';

/** The courtyard's doors a step may open (Courtyard.tsx's `CourtyardDoor`, and the hall itself). */
export const ARABIC_DOORS = [
  'lesson',
  'listen',
  'read',
  'write',
  'phrases',
  'words',
  'trial',
  'regular',
  'echo',
  'chat',
  HALL_DOOR,
] as const;

const StepData = z.object({
  chapter: z.number().int().positive(),
  kind: z.enum(['lesson', 'visit', 'practice', 'trial', 'rank', 'finale']),
  door: z.enum(ARABIC_DOORS),
  title: z.string().min(1),
  invite: z.string().min(1),
  beat: z.string().optional(),
  needs: z.enum(['partner', 'deck']).optional(),
});
const LessonData = z.object({ lesson: z.number().int().positive() });
const RangeData = z.object({ from: z.number().int().min(2), to: z.number().int().min(2) });

type P = ArabicProgress;
interface Check {
  done: (p: P) => boolean;
  open: (p: P) => boolean;
  /** The step can't be finished today (a second pass needs a later day). */
  tomorrow?: (p: P, today: string) => boolean;
}

const slug = (id: string) => id.replace(/^road:/, '');
const always = () => true;
const guest = (p: P) => p.guest;
const lessonPassed = (n: number) => (p: P) => p.done || p.lesson > n;
/** The slate's letters of lessons 1 to `n`: single letters only, as the slate teaches them. */
const slateLetters = (n: number) =>
  LETTERS.filter((l) => l.lesson <= n && SLATE_IDS.includes(l.id)).map((l) => l.id);
const slate = (n: number): Check => ({
  done: (p) => slateLetters(n).every((id) => p.written.includes(id)),
  // The slate offers the letters you've met.
  open: (p) => slateLetters(n).every((id) => p.met.includes(id)),
});
const phrases = (set: number): Check => ({ done: (p) => p.phraseSet > set, open: always });
const pair = (n: number): Check => {
  const id = PAIRS[n - 1]?.id ?? '';
  return { done: (p) => p.echo.heard.includes(id), open: always };
};
const rank = (id: string): Check => ({
  done: (p) => p.ranks.includes(id),
  open: (p) => heldRanks(ARABIC_RANKS, arabicStanding(p)).some((r) => r.id === id),
});
const metLetters = (p: P) => p.met.length > 0;

/** The written steps' checks, by id. Every check only ever goes from false to true. */
export const ARABIC_CHECKS: Record<string, Check> = {
  'a-few-letters': { done: (p) => p.sessions >= 1, open: always },
  'at-the-door': phrases(1),
  'the-slate': slate(1),
  'the-fountain': { done: (p) => p.only.listen >= 1, open: metLetters },
  'please-and-thanks': phrases(2),
  'the-storyteller': { done: (p) => p.only.read >= 1, open: metLetters },
  'a-line-of-letters': slate(3),
  counting: phrases(3),
  'the-echo-well': pair(1),
  'a-catch-in-the-throat': pair(2),
  'two-lines-of-letters': slate(6),
  'two-rough-sounds': pair(3),
  'the-whole-slate': slate(LESSONS.length),
  'deeper-still': pair(4),
  'rank-guest': rank('guest'),
  'innkeepers-table': { done: (p) => p.words.sessions >= 1, open: wordsOpen },
  'sit-with-salim': { done: (p) => p.chat.chats >= 1, open: guest },
  questions: phrases(4),
  'at-the-shop': phrases(5),
  'the-heavy-s': pair(5),
  'getting-to-know-you': phrases(6),
  'the-heavy-d': pair(6),
  'at-the-coffee-corner': phrases(7),
  'the-heavy-t': pair(7),
  'which-way': phrases(8),
  'three-ways-to-say-it': pair(8),
  'today-and-tomorrow': phrases(9),
  'in-hassans-voice': { done: (p) => p.echo.shadowed >= 5, open: always },
  'rank-traveler': rank('traveler'),
  'three-lines': { done: (p) => p.chat.best >= LINES_FOR_XP, open: guest },
  'rank-neighbor': rank('neighbor'),
  'a-thousand-words': { done: (p) => p.words.met.length >= FRIEND_WORDS, open: wordsOpen },
  'twenty-evenings': { done: (p) => p.chat.chats >= FRIEND_CHATS, open: guest },
  'rank-friend': rank('friend'),
  'two-thousand-words': { done: (p) => p.words.met.length >= LOCAL_WORDS, open: wordsOpen },
  'a-whole-evening': { done: (p) => p.chat.best >= MAX_LINES, open: guest },
  'rank-local': rank('local'),
  'five-old-friends': {
    done: (p) =>
      Object.values(p.chat.met).filter((n) => n >= OLD_FRIEND_CHATS).length >= STORY_FRIENDS,
    open: guest,
  },
  'rank-storyteller': rank('storyteller'),
};

type Built = RoadStep & Check;

function build(): { steps: Built[]; chapters: RoadChapter[] } {
  const steps: Built[] = [];
  const chapters: RoadChapter[] = [
    { number: CHAPTER.number, title: CHAPTER.title, intro: CHAPTER.intro, outro: CHAPTER.outro },
    ...REGULARS.map((r) => ({ number: r.number, title: r.title, intro: r.intro, outro: r.outro })),
  ];
  for (const item of pack.items) {
    if (item.type === 'road-step') {
      const id = slug(item.id);
      const check = ARABIC_CHECKS[id];
      if (!check) throw new Error(`content/arabic/road.json: no check for ${id}`);
      steps.push({ id, ...StepData.parse(item.data), ...check });
    } else if (item.type === 'road-lesson') {
      const { lesson } = LessonData.parse(item.data);
      steps.push({
        id: `lesson:${lesson}`,
        chapter: CHAPTER.number,
        kind: 'lesson',
        door: 'lesson',
        title: `Milestone ${lesson}`,
        invite: `Pass lesson ${lesson} at the scribe’s table.`,
        beat: CHAPTER.milestones[lesson - 1],
        done: lessonPassed(lesson),
        open: (p) => !p.done && p.lesson === lesson,
        tomorrow: (p, today) => p.lesson === lesson && p.streak >= 1 && p.passDay === today,
      });
    } else if (item.type === 'road-trial') {
      steps.push({
        id: 'trial:1',
        chapter: CHAPTER.number,
        kind: 'trial',
        door: 'trial',
        title: `Trial: ${CHAPTER.trial.name}`,
        invite: `Read ${inSentence(CHAPTER.trial.name)}.`,
        beat: CHAPTER.outro,
        done: guest,
        open: (p) => p.done && !p.guest,
      });
    } else if (item.type === 'road-chapters') {
      const { from, to } = RangeData.parse(item.data);
      for (const r of REGULARS.filter((x) => x.number >= from && x.number <= to)) {
        const wc = r.wordChapter;
        const passed = (p: P) => p.words.done || p.words.chapter > wc;
        steps.push({
          id: `pass:${r.number}`,
          chapter: r.number,
          kind: 'lesson',
          door: 'words',
          needs: 'deck',
          title: r.title,
          invite: `Pass “${WORD_CHAPTERS[wc - 1]?.title ?? ''}” at the innkeeper’s table.`,
          beat: r.milestones[r.milestones.length - 1],
          done: passed,
          open: (p) => wordsOpen(p) && !p.words.done && p.words.chapter === wc,
          tomorrow: (p, today) =>
            p.words.chapter === wc && p.words.streak >= 1 && p.words.passDay === today,
        });
        steps.push({
          id: `trial:${r.number}`,
          chapter: r.number,
          kind: 'trial',
          door: 'regular',
          needs: 'deck',
          title: `Trial: ${r.trial.name}`,
          invite: `Face ${inSentence(r.trial.name)}.`,
          beat: r.outro,
          done: (p) => p.words.trials.includes(r.number),
          open: (p) => wordsOpen(p) && passed(p),
        });
      }
    }
  }
  return { steps, chapters };
}

const built = build();
export const ARABIC_ROAD: readonly RoadStep[] = built.steps;
export const ARABIC_ROAD_CHAPTERS: readonly RoadChapter[] = built.chapters;
export const QUESTLINE = CHAPTER.questline;

const rules: RoadRules<P> = {
  done: (s, p) => (s as Built).done(p),
  open: (s, p) => (s as Built).open(p),
  waiting(s, p, ctx): WaitReason | null {
    if (s.needs === 'partner' && ctx.partner !== 'ready') return ctx.partner;
    return (s as Built).tomorrow?.(p, ctx.today) ? 'tomorrow' : null;
  },
};

/** Is this step done? For tests and "the road so far". */
export const arabicDone = (step: RoadStep, p: P) => rules.done(step, p);

/** A player's own road: without the deck, the steps that need it are left out (ADR 0011). */
export const roadFor = (licensee: boolean): readonly RoadStep[] =>
  licensee ? ARABIC_ROAD : ARABIC_ROAD.filter((s) => s.needs !== 'deck');

const STATION_LINE: Record<string, string> = {
  listen: 'Tonight: the fountain. Which letter did you hear?',
  read: 'Tonight: the storyteller has short words for you to read.',
  write: 'Tonight: the slate. Write the letters from memory.',
  echo: 'Tonight: the echo well. Hear the difference.',
  phrases: 'Tonight: the coffee corner. Keep your phrases warm.',
  words: 'Tonight: the innkeeper’s table. Keep your words fresh.',
  chat: 'Tonight: sit and talk with a regular at the inn.',
};

function meanwhile(
  p: P,
  ctx: RoadContext,
  steps: readonly RoadStep[],
  position: number,
): Meanwhile {
  if (ctx.due > 0) {
    const n = ctx.due === 1 ? '1 review is' : `${ctx.due} reviews are`;
    const door = wordsOpen(p) && ctx.licensee ? 'words' : 'lesson';
    return { door, line: `Tonight: ${n} due. Keep what you’ve learned.`, why: 'reviews' };
  }
  // The road waits a day on a word chapter: its regular is at the table.
  const at = steps[position];
  const who = at?.id.startsWith('pass:') && REGULARS.find((r) => r.number === at.chapter)?.who;
  if (who && ctx.partner === 'ready') {
    return {
      door: 'chat',
      line: `Tonight: sit with ${who} while the words settle.`,
      why: 'regular',
    };
  }
  if (ctx.contractDoor) {
    return {
      door: ctx.contractDoor,
      line: 'Tonight: a contract is waiting at the inn.',
      why: 'contract',
    };
  }
  const open = [
    ...(metLetters(p) ? ['listen', 'read', 'write'] : []),
    ...(ctx.licensee ? ['echo', 'phrases'] : []),
    ...(ctx.licensee && wordsOpen(p) ? ['words'] : []),
    ...(p.guest && ctx.partner === 'ready' ? ['chat'] : []),
  ];
  const door = stationOfDay(open, ctx.today) ?? 'lesson';
  return {
    door,
    line: STATION_LINE[door] ?? 'Tonight: the scribe’s table. Go over your letters.',
    why: 'station',
  };
}

/** Where a player stands on The Long Road In, and the one thing to do now. */
export function arabicRoad(state: unknown, ctx: RoadContext): RoadAnswer {
  const p = parseProgress(state);
  const steps = roadFor(ctx.licensee);
  const w = walk(steps, p, rules, ctx);
  return answer(QUESTLINE, steps, ARABIC_ROAD_CHAPTERS, w, () =>
    meanwhile(p, ctx, steps, w.position),
  );
}
