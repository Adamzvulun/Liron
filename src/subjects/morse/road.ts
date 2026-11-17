// The Silent Beacon as a road (docs/game/the-road.md §4): every lesson, station, trial and rank
// of the Signal Tower as one ordered list of steps, each with a check on the saved progress.
// The words are content (content/morse/road.json, and the lamps and trials of questline.json);
// the checks are here. Loaded lazily by index.ts, so the square stays small.
import { z } from 'zod';
import pack from '../../../content/morse/road.json' with { type: 'json' };
import {
  answer,
  HALL_DOOR,
  inSentence,
  stationOfDay,
  walk,
  withIntros,
  type Meanwhile,
  type RoadAnswer,
  type RoadChapter,
  type RoadContext,
  type RoadRules,
  type RoadStep,
} from '../../core/road/road.ts';
import { heldRanks } from '../../core/ranks/ranks.ts';
import { charLabel, MORSE_CHARS } from './code.ts';
import {
  parseProgress,
  pendingTrial,
  unlockedChars,
  type MorseProgress,
} from './lesson/progress.ts';
import { stationOf } from './qso/onAir.ts';
import { farOpen, farPassed } from './qso/farStation.ts';
import { finaleOpen, finalePassed } from './qso/fortyWinters.ts';
import { CHAPTERS } from './questline.ts';
import { GHOST_DIT_MS, GHOST_WPM, KEYER_DIT_MS, MORSE_RANKS, morseStanding } from './ranks.ts';
import { lampOpen, lampPassed } from './send/lampSignal.ts';
import { PROSIGNS } from './words.ts';
import { wordsOpen } from './words/drill.ts';
import { watchOpen, watchPassed } from './words/nightWatch.ts';
import { rushOpen } from './words/rush.ts';

/** The hall's doors a step may open (Hall.tsx's `HallDoor`, and the hall itself). */
export const MORSE_DOORS = [
  'koch',
  'recognition',
  'trial',
  'sending',
  'lamp',
  'words',
  'watch',
  'far',
  'radio',
  'beacon',
  HALL_DOOR,
] as const;

const KOCH = MORSE_CHARS.map((c) => c.char);
const ALL = KOCH.length;

const StepData = z.object({
  chapter: z.number().int().positive(),
  kind: z.enum(['lesson', 'visit', 'practice', 'trial', 'rank', 'finale']),
  door: z.enum(MORSE_DOORS),
  title: z.string().min(1),
  invite: z.string().min(1),
  beat: z.string().optional(),
});
const LampsData = z.object({ chapter: z.number().int().positive(), chars: z.array(z.string()) });
const TrialData = z.object({ chapter: z.number().int().positive() });
const ChapterData = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  intro: z.string().optional(),
  outro: z.string().optional(),
});

const slug = (id: string) => id.replace(/^road:/, '');
const fastest = (p: MorseProgress) => p.sending.fastest ?? p.sending.ditMs ?? Infinity;
const drills = (n: number) => (p: MorseProgress) => p.sending.drills >= n;
const contacts = (n: number) => (p: MorseProgress) => p.radio.contacts >= n;
const rank = (id: string) => (p: MorseProgress) => p.ranks.includes(id);
const rankOpen = (id: string) => (p: MorseProgress) =>
  heldRanks(MORSE_RANKS, morseStanding(p)).some((r) => r.id === id);
const always = () => true;
const codebook = (p: MorseProgress) => wordsOpen(p);
const rush = (p: MorseProgress) => wordsOpen(p) && rushOpen(unlockedChars(p));
const room = (p: MorseProgress) => farPassed(p);

interface Check {
  done: (p: MorseProgress) => boolean;
  open: (p: MorseProgress) => boolean;
}

/** The written steps' checks, by id. Every check only ever goes from false to true. */
export const MORSE_CHECKS: Record<string, Check> = {
  'first-sounds': { done: (p) => p.runs >= 1, open: always },
  'warm-key': { done: drills(1), open: always },
  'lamp-fades': { done: (p) => p.recognition.rounds >= 1, open: always },
  'logbook-words': { done: (p) => p.words.rounds >= 1, open: codebook },
  'steadier-hand': { done: drills(4), open: always },
  'operators-chair': { done: drills(8), open: always },
  'list-of-stations': { done: (p) => p.rush.runs >= 1, open: rush },
  'nine-minutes-past': { done: drills(12), open: always },
  'one-more-night': { done: drills(16), open: always },
  'rank-listener': { done: rank('listener'), open: rankOpen('listener') },
  'twenty-messages': { done: drills(20), open: always },
  'fifteen-wpm': { done: (p) => fastest(p) <= KEYER_DIT_MS, open: always },
  'lamp-signal': { done: lampPassed, open: (p) => lampOpen(p, ALL) },
  'rank-keyer': { done: rank('keyer'), open: rankOpen('keyer') },
  'four-signs': { done: (p) => PROSIGNS.every((s) => p.prosigns.includes(s.id)), open: codebook },
  'far-station': { done: farPassed, open: farOpen },
  'rank-operator': { done: rank('operator'), open: rankOpen('operator') },
  'own-call': { done: (p) => stationOf(p.radio) !== null, open: room },
  'first-on-air': { done: contacts(1), open: room },
  'words-by-ear': { done: (p) => p.words.rounds >= 10, open: codebook },
  'night-watch': { done: watchPassed, open: (p) => wordsOpen(p) && watchOpen(p, ALL) },
  'rank-telegraphist': { done: rank('telegraphist'), open: rankOpen('telegraphist') },
  'three-in-log': { done: contacts(3), open: room },
  'six-in-log': { done: contacts(6), open: room },
  'ten-in-log': { done: contacts(10), open: room },
  'no-repeats': { done: (p) => p.radio.cleanFast, open: (p) => room(p) && p.radio.contacts >= 10 },
  'rank-signal-master': { done: rank('signal-master'), open: rankOpen('signal-master') },
  'thirty-by-ear': { done: (p) => p.rush.topWpm >= GHOST_WPM, open: rush },
  'thirty-by-hand': { done: (p) => fastest(p) <= GHOST_DIT_MS, open: always },
  'rank-ghost': { done: rank('ghost'), open: rankOpen('ghost') },
  'forty-winters': { done: finalePassed, open: finaleOpen },
};

type Built = RoadStep & Check;

function build(): { steps: Built[]; chapters: RoadChapter[] } {
  const steps: Built[] = [];
  const chapters: RoadChapter[] = CHAPTERS.map((c) => ({
    number: c.number,
    title: c.title,
    intro: c.intro,
    outro: c.outro,
  }));
  for (const item of pack.items) {
    if (item.type === 'road-chapter') {
      chapters.push(ChapterData.parse(item.data));
    } else if (item.type === 'road-step') {
      const id = slug(item.id);
      const check = MORSE_CHECKS[id];
      if (!check) throw new Error(`content/morse/road.json: no check for ${id}`);
      steps.push({ id, ...StepData.parse(item.data), ...check });
    } else if (item.type === 'road-lamps') {
      const { chapter, chars } = LampsData.parse(item.data);
      const beats = CHAPTERS.find((c) => c.number === chapter)?.lamps;
      for (const char of chars) {
        const at = KOCH.indexOf(char);
        if (at < 0) throw new Error(`content/morse/road.json: no character ${char}`);
        steps.push({
          id: `lamp:${char}`,
          chapter,
          kind: 'lesson',
          door: 'koch',
          // “Lamp U”, but “Lamp for the period (.)”.
          title: `Lamp ${charLabel(char).replace(/^the /, 'for the ')}`,
          invite: `Light the next lamp: learn ${charLabel(char)}.`,
          beat: beats?.get(char),
          done: (p) => p.unlocked >= at + 1,
          // The lesson teaches the next character in order, and a chapter's trial holds the gate.
          open: (p) => p.unlocked === at && !pendingTrial(p),
        });
      }
    } else if (item.type === 'road-trial') {
      const { chapter } = TrialData.parse(item.data);
      const c = CHAPTERS.find((x) => x.number === chapter);
      if (!c) throw new Error(`content/morse/road.json: no chapter ${chapter}`);
      steps.push({
        id: `trial:${chapter}`,
        chapter,
        kind: 'trial',
        door: 'trial',
        title: `Trial: ${c.trial.name}`,
        invite: `Face ${inSentence(c.trial.name)}.`,
        beat: c.outro,
        done: (p) => p.trials.includes(chapter),
        open: (p) => pendingTrial(p)?.number === chapter,
      });
    }
  }
  chapters.sort((a, b) => a.number - b.number);
  return { steps: withIntros(steps, chapters), chapters };
}

const built = build();
export const MORSE_ROAD: readonly RoadStep[] = built.steps;
export const MORSE_ROAD_CHAPTERS: readonly RoadChapter[] = built.chapters;
export const QUESTLINE = CHAPTERS[0]?.questline ?? 'The Silent Beacon';

const rules: RoadRules<MorseProgress> = {
  done: (s, p) => (s as Built).done(p),
  open: (s, p) => (s as Built).open(p),
  // Nothing in the tower needs a second day or an allowance: its contacts fall back to a script.
  waiting: () => null,
};

/** Is this step done? For tests and "the road so far". */
export const morseDone = (step: RoadStep, p: MorseProgress) => rules.done(step, p);

const STATION_LINE: Record<string, string> = {
  koch: 'Tonight: a run on the stair, to keep every sound sharp.',
  recognition: 'Tonight: Instant Recognition. Name each letter before its lamp fades.',
  sending: 'Tonight: the brass key. A sending drill keeps your hand steady.',
  words: 'Tonight: the Codebook. Copy whole words by ear.',
  radio: 'Tonight: the Radio Room. Somebody is calling.',
};

function meanwhile(p: MorseProgress, ctx: RoadContext): Meanwhile {
  if (ctx.due > 0) {
    const n = ctx.due === 1 ? '1 sound is' : `${ctx.due} sounds are`;
    return { door: 'koch', line: `Tonight: ${n} due for review on the stair.`, why: 'reviews' };
  }
  if (ctx.contractDoor) {
    return {
      door: ctx.contractDoor,
      line: 'Tonight: a contract is waiting in the tower.',
      why: 'contract',
    };
  }
  const open = [
    'koch',
    'recognition',
    'sending',
    ...(wordsOpen(p) ? ['words'] : []),
    ...(farPassed(p) ? ['radio'] : []),
  ];
  const door = stationOfDay(open, ctx.today) ?? 'koch';
  return { door, line: STATION_LINE[door] ?? '', why: 'station' };
}

/** Where a player stands on The Silent Beacon, and the one thing to do now. */
export function morseRoad(state: unknown, ctx: RoadContext): RoadAnswer {
  const p = parseProgress(state);
  return answer(QUESTLINE, MORSE_ROAD, MORSE_ROAD_CHAPTERS, walk(MORSE_ROAD, p, rules, ctx), () =>
    meanwhile(p, ctx),
  );
}
