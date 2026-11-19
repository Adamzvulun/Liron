// The Road and its compass (docs/game/the-road.md): each subject has one ordered list of steps,
// and where you are is the first step whose check is false. Nothing is saved to mark the place,
// so the road can't disagree with real progress. The platform only knows this shape; the steps,
// their checks and their words belong to each subject (ADR 0003, ADR 0019).

/** What a step needs beyond the player's own progress. */
export type RoadNeed = 'partner' | 'deck';

export type StepKind = 'lesson' | 'visit' | 'practice' | 'trial' | 'rank' | 'finale';

/** The hall itself, for steps done on arriving there (taking a rank). */
export const HALL_DOOR = 'hall';

export interface RoadStep {
  id: string;
  chapter: number;
  kind: StepKind;
  title: string;
  /** One sentence saying what to do: what the compass shows while this is next. */
  invite: string;
  /** The line of story shown once it's done. */
  beat?: string;
  /** The door of the subject's hall where it's done (or `HALL_DOOR`). */
  door: string;
  needs?: RoadNeed;
}

export interface RoadChapter {
  number: number;
  title: string;
  intro?: string;
  outro?: string;
}

/** What the platform tells a subject about today. */
export interface RoadContext {
  /** The player's local day, YYYY-MM-DD. */
  today: string;
  /** The AI partner: usable, used up for today, or not set up on this site. */
  partner: 'ready' | 'spent' | 'off';
  /** May this player read the licensed deck (ADR 0011)? */
  licensee: boolean;
  /** Reviews due now in this subject. */
  due: number;
  /** The door of an unpaid contract of this subject today, if there is one. */
  contractDoor?: string;
}

/** Why a step waits: a later day, the partner's day spent or not set up, or no deck (ADR 0050). */
export type WaitReason = 'tomorrow' | 'spent' | 'off' | 'deck';

export interface RoadRules<P> {
  done(step: RoadStep, p: P): boolean;
  /** Can it be done now, by the game's own rules? The road never opens or closes anything. */
  open(step: RoadStep, p: P): boolean;
  /** Open in principle, but not right now. */
  waiting(step: RoadStep, p: P, ctx: RoadContext): WaitReason | null;
}

export interface Walk {
  /** The first step not done: where you are. -1 when the road is finished. */
  position: number;
  /** The first step not done, open and not waiting: what to do now. -1 when there is none. */
  compass: number;
  /** The first step not done that is waiting, with why. */
  waiting?: { index: number; reason: WaitReason };
}

export function walk<P>(
  steps: readonly RoadStep[],
  p: P,
  rules: RoadRules<P>,
  ctx: RoadContext,
): Walk {
  let position = -1;
  let compass = -1;
  let waiting: Walk['waiting'];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step || rules.done(step, p)) continue;
    if (position < 0) position = i;
    // The compass may look past a waiting step, but only as far as the next chapter: a step far
    // down the road ("have 20 chats") is not what to do tonight just because its door is open.
    if (step.chapter > (steps[position]?.chapter ?? step.chapter) + 1) break;
    if (!rules.open(step, p)) continue;
    const reason = rules.waiting(step, p, ctx);
    if (reason) {
      waiting ??= { index: i, reason };
      continue;
    }
    compass = i;
    break;
  }
  return { position, compass, waiting };
}

/** Something worth doing while the road waits, or after it ends. */
export interface Meanwhile {
  door: string;
  line: string;
  /** `closed`: nothing here can be done without what the road waits on; the line says what. */
  why: 'reviews' | 'regular' | 'contract' | 'station' | 'closed';
}

/** A subject's answer to "where am I, and what now?". */
export interface RoadAnswer {
  questline: string;
  /** Steps and chapters on this player's road. */
  steps: number;
  chapters: number;
  /** Where you are, or null when every step is done. */
  position: {
    index: number;
    step: RoadStep;
    chapter: RoadChapter;
    /** This step's place among its chapter's steps, from 1. */
    inChapter: number;
    ofChapter: number;
  } | null;
  /** The one thing to do now. */
  now: { kind: 'step'; index: number; step: RoadStep } | ({ kind: 'meanwhile' } & Meanwhile);
  /** A step the road is waiting on, in the player's words. */
  waiting?: { step: RoadStep; reason: WaitReason; line: string };
}

const WAIT_LINE: Record<WaitReason, (title: string) => string> = {
  tomorrow: (t) => `The road goes on tomorrow: ${t}.`,
  spent: (t) => `The regulars have talked enough for one day. Tomorrow: ${t}.`,
  off: () => 'Nobody is at the table on this site yet.',
  deck: () => 'This account can’t read the deck yet: ask whoever invited you to open it.',
};

/** The player's local day, YYYY-MM-DD. */
export function localDay(now = new Date()): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

/** Days since 1970 for a local day, so a pick can rotate with the calendar. */
export function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.floor(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/**
 * The station of the day: the same all day, the next one tomorrow, so with two or more open
 * stations it is never the same two days running.
 */
export function stationOfDay<T>(stations: readonly T[], day: string, offset = 0): T | undefined {
  if (!stations.length) return undefined;
  return stations[
    (((dayNumber(day) + offset) % stations.length) + stations.length) % stations.length
  ];
}

/** Puts a walk into the answer the platform shows. `meanwhile` is asked only when it's needed. */
export function answer(
  questline: string,
  steps: readonly RoadStep[],
  chapters: readonly RoadChapter[],
  w: Walk,
  meanwhile: () => Meanwhile,
): RoadAnswer {
  const at = steps[w.position];
  const chapter = at && chapters.find((c) => c.number === at.chapter);
  const mates = at ? steps.filter((s) => s.chapter === at.chapter) : [];
  const next = steps[w.compass];
  const now: RoadAnswer['now'] = next
    ? { kind: 'step', index: w.compass, step: next }
    : { kind: 'meanwhile', ...meanwhile() };
  // A closed road's meanwhile line already says what it waits on: it isn't said twice.
  const closed = now.kind === 'meanwhile' && now.why === 'closed';
  const held = w.waiting && !closed && steps[w.waiting.index];
  return {
    questline,
    steps: steps.length,
    chapters: new Set(steps.map((s) => s.chapter)).size,
    position:
      at && chapter
        ? {
            index: w.position,
            step: at,
            chapter,
            inChapter: mates.indexOf(at) + 1,
            ofChapter: mates.length,
          }
        : null,
    now,
    ...(held &&
      w.waiting && {
        waiting: {
          step: held,
          reason: w.waiting.reason,
          line: WAIT_LINE[w.waiting.reason](held.title),
        },
      }),
  };
}

/** “The Gatekeeper” inside a sentence: “the Gatekeeper”. */
export const inSentence = (name: string) => name.replace(/^The /, 'the ');

/** "Step 14 of 74": the same count the square shows. */
export function standingLine(answer: RoadAnswer): string {
  const at = answer.position;
  return at ? `Step ${at.index + 1} of ${answer.steps}` : `All ${answer.steps} steps walked`;
}

/** The step where the road first reaches a door, from 1; 0 if it never does. */
export function stepAt(steps: readonly RoadStep[], door: string): number {
  return steps.findIndex((s) => s.door === door) + 1;
}

/**
 * What a locked station says: the step that opens it, in the road's own count. Null when the
 * road never reaches that door, or already has.
 */
export function opensAt(
  answer: RoadAnswer,
  steps: readonly RoadStep[],
  door: string,
): string | null {
  const n = stepAt(steps, door);
  const first = steps[n - 1];
  if (!first || !answer.position || answer.position.index >= n - 1) return null;
  return `Opens at step ${n} · ${first.title}`;
}

/**
 * A chapter's first step is told by the chapter's own opening: where such a step has no beat of
 * its own, it takes the chapter's intro, so no step is without a line of the tale.
 */
export function withIntros<S extends RoadStep>(
  steps: readonly S[],
  chapters: readonly RoadChapter[],
): S[] {
  const seen = new Set<number>();
  return steps.map((step) => {
    const first = !seen.has(step.chapter);
    seen.add(step.chapter);
    const intro = chapters.find((c) => c.number === step.chapter)?.intro;
    return first && !step.beat && intro ? { ...step, beat: intro } : step;
  });
}
