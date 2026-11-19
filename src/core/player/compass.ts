// The compass in the square (docs/game/the-road.md §6, "Across the city"): one line per guild
// saying the one thing to do now, the guild practiced last first. The platform asks each subject
// for its road through the subject contract and never reads a road itself (ADR 0003, ADR 0019).
import { useEffect, useState } from 'react';
import { PLACE_PATHS } from '../city/layout.ts';
import { HALL_DOOR, type RoadAnswer, type RoadContext } from '../road/road.ts';
import { DEFAULT_LOOK, lookKey, type Look } from '../avatar/looks.ts';
import { ASSUMED_FACTS, type RoadFacts } from '../road/facts.ts';
import type { SubjectInfo } from '../subject.ts';

export interface CompassLine {
  subject: string;
  /** The guild's place, shown above the line. */
  giver: string;
  color: string;
  /** Straight to the door where the step is done. */
  href: string;
  /** What to do now. */
  text: string;
  /** Where the player stands: "Step 14 of 74". An errand has none. */
  progress?: string;
  /** A step the road is waiting on, said plainly. */
  waiting?: string;
  /** A guild not started yet, when it isn't the main line: shown in a quieter voice. */
  quiet: boolean;
  /** Has the player done any step of this road? */
  started: boolean;
  /** What the guild's button on the first page says. */
  welcome?: string;
}

interface Found {
  subject: SubjectInfo;
  road: RoadAnswer;
  started: boolean;
}

/** What the platform can tell every subject about today. */
export interface CompassDay {
  /** The player's local day, YYYY-MM-DD. */
  today: string;
  /** Subjects with an unpaid contract today. */
  contracts: readonly string[];
}

export interface CompassSources {
  loadState(subjectId: string): Promise<unknown>;
  /** Reviews due now in a subject. */
  due(subjectId: string): Promise<number>;
  /** Subjects with saved progress, the one practiced last first. */
  practiced(): Promise<readonly string[]>;
  /** May this player read the deck, and is the partner set up (road/facts.ts)? */
  facts?: () => Promise<RoadFacts>;
}

/** The address of a hall's door. */
export function doorHref(subject: SubjectInfo, door: string): string {
  const hall = subject.building ? PLACE_PATHS[subject.building] : '/';
  return door === HALL_DOOR ? hall : `${hall}?open=${door}`;
}

async function find(
  subject: SubjectInfo,
  sources: CompassSources,
  day: CompassDay,
): Promise<Found | null> {
  if (!subject.road || !subject.building) return null;
  try {
    const [state, facts] = await Promise.all([
      sources.loadState(subject.id),
      sources.facts?.().catch(() => ASSUMED_FACTS) ?? ASSUMED_FACTS,
    ]);
    const ctx: RoadContext = {
      today: day.today,
      ...facts,
      due: 0,
      ...(day.contracts.includes(subject.id) && { contractDoor: HALL_DOOR }),
    };
    let road = await subject.road(state, ctx);
    // The count of reviews only matters when the road has no step to offer, so it's asked then.
    if (road.now.kind === 'meanwhile') {
      const due = await sources.due(subject.id).catch(() => 0);
      if (due > 0) road = await subject.road(state, { ...ctx, due });
    }
    return { subject, road, started: road.position === null || road.position.index > 0 };
  } catch {
    return null;
  }
}

/**
 * The order of the lines: registry order for a new player; otherwise the guild practiced last.
 * Either way, a road that is waiting or finished yields the first place to a guild with a real
 * step to offer (a new player whose account can't read the deck starts with Morse, task 2.1).
 */
export function inOrder(found: readonly Found[], practiced: readonly string[]): Found[] {
  const rank = (f: Found) => {
    const at = practiced.indexOf(f.subject.id);
    return at < 0 ? practiced.length : at;
  };
  const sorted = found.some((f) => f.started)
    ? [...found].sort((a, b) => rank(a) - rank(b))
    : [...found];
  if (sorted[0]?.road.now.kind === 'meanwhile') {
    const step = sorted.findIndex((f) => f.road.now.kind === 'step');
    if (step > 0) sorted.unshift(...sorted.splice(step, 1));
  }
  return sorted;
}

function line(f: Found, first: boolean): CompassLine {
  const { subject, road } = f;
  const now = road.now;
  return {
    subject: subject.id,
    giver: subject.place,
    color: subject.guildColor,
    href: doorHref(subject, now.kind === 'step' ? now.step.door : now.door),
    text: now.kind === 'step' ? now.step.invite : now.line,
    progress: road.position
      ? `Step ${road.position.index + 1} of ${road.steps}`
      : `${road.questline}: the road is walked`,
    ...(road.waiting && { waiting: road.waiting.line }),
    quiet: !first && !f.started,
    started: f.started,
    ...(subject.welcome && { welcome: subject.welcome }),
  };
}

/** Every guild's compass line, the main one first. A guild whose road fails to load is left out. */
export async function loadCompass(
  subjects: readonly SubjectInfo[],
  sources: CompassSources,
  day: CompassDay,
): Promise<CompassLine[]> {
  const [found, practiced] = await Promise.all([
    Promise.all(subjects.map((s) => find(s, sources, day))),
    sources.practiced().catch(() => []),
  ]);
  return inOrder(
    found.filter((f) => f !== null),
    practiced,
  ).map((f, i) => line(f, i === 0));
}

/** The compass, read again whenever `when` changes (e.g. on coming back to the square). */
export function useCompass(
  subjects: readonly SubjectInfo[],
  sources: CompassSources,
  /** The player's local day, once it's known. */
  today: string | undefined,
  /** Subjects with an unpaid contract today. */
  unpaid: readonly string[],
  when: unknown,
): readonly CompassLine[] {
  const [lines, setLines] = useState<readonly CompassLine[]>([]);
  // As text, so a new list with the same subjects doesn't read everything again.
  const contracts = unpaid.join(',');
  useEffect(() => {
    if (!today) return;
    let live = true;
    void loadCompass(subjects, sources, {
      today,
      contracts: contracts ? contracts.split(',') : [],
    }).then((c) => live && setLines(c));
    return () => {
      live = false;
    };
  }, [subjects, sources, today, contracts, when]);
  return lines;
}

/** The price of the Market's cheapest ware (content/core/items.json; a test keeps it true). */
export const CHEAPEST_WARE = 60;

const BOARD_COLOR = '#e8a93a';

/**
 * The city's own errands (the-road.md §7): one line each for the Notice Board, the Market and
 * Your House, shown after the guilds' lines while its reason holds and never once it's done.
 */
export function cityErrands(player: {
  chests: number;
  gold: number;
  owned: readonly string[];
  avatar: Look;
}): CompassLine[] {
  const errand = (id: string, giver: string, href: string, text: string): CompassLine => ({
    subject: `errand:${id}`,
    giver,
    color: BOARD_COLOR,
    href,
    text,
    quiet: false,
    started: true,
  });
  const untouched = lookKey(player.avatar) === lookKey(DEFAULT_LOOK);
  return [
    ...(player.chests > 0
      ? [
          errand(
            'chest',
            'Notice Board',
            '/notice-board',
            player.chests === 1
              ? 'A chest is waiting at the Notice Board.'
              : `${player.chests} chests are waiting at the Notice Board.`,
          ),
        ]
      : []),
    // "Never bought anything" is read as owning nothing: gear from a rank or a chest has
    // already shown the player what gear is.
    ...(player.gold >= CHEAPEST_WARE && player.owned.length === 0
      ? [errand('market', 'Market', '/market', 'You have gold. The Market is open.')]
      : []),
    ...(player.owned.length > 0 && untouched
      ? [errand('house', 'Your House', '/house', 'Your House has a wardrobe.')]
      : []),
  ];
}
