// The Stranger at the Gate (tasks 4.2 and 4.3, #334, #335; ADR 0047): the Long Road In's finale,
// and the Arabic capstone, in three parts. Read a page of the innkeeper's guest book (our own
// sentences, for words you've met; never deck text, ADR 0011); write the stranger's name on the
// slate from memory; then tell the table your story, judged against the rubric by api/partner.ts.
// The story is content (content/arabic/finale.json); the rules are here, the screen in
// StrangerAtTheGate.tsx. Design: docs/game/the-road.md §5, chapter 115.

import { z } from 'zod';
import pack from '../../../../content/arabic/finale.json' with { type: 'json' };
import type { InnTurn, Verdict } from '../../../core/partner.ts';
import type { SubjectApi } from '../../../core/subject.ts';
import type { ArabicProgress } from '../progress.ts';
import type { OwnSentence } from '../core/ownSentences.ts';

export const FINALE_ID = 'stranger-at-the-gate';
/** Lines on the guest book's page, and how many must be read right. */
export const PAGE_LINES = 4;
export const PAGE_PASS = 3;
/** The fewest of your lines in "Your Story" (the inn's MAX_LINES, 8, is the most). */
export const STORY_LINES = 6;
/** The longest line the page holds, in letters: a page, not a paragraph. */
const LONGEST = 48;
export const FINALE_XP = { pass: 120, try: 10 };

const Story = z.object({
  title: z.string().min(1),
  intro: z.string().min(1),
  rules: z.string().min(1),
  book: z.string().min(1),
  slate: z.string().min(1),
  story: z.string().min(1),
  screen: z.string().min(1),
  epilogue: z.string().min(1),
  missed: z.string().min(1),
});
const Stranger = z.object({ arabic: z.string().min(1), latin: z.string(), hebrew: z.string() });
export type Stranger = z.infer<typeof Stranger>;

export const FINALE_STORY = Story.parse(pack.items.find((i) => i.type === 'finale')?.data);
export const STRANGERS: readonly Stranger[] = pack.items
  .filter((i) => i.type === 'stranger')
  .map((i) => Stranger.parse(i.data));

export interface PageLine {
  arabic: string;
  english: string;
  /** Its meaning among two others from the page's pool, shuffled. */
  choices: string[];
}

function shuffled<T>(xs: readonly T[], random: () => number): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/**
 * A page of the guest book: our own sentences for words you've met, short enough for a page.
 * Null when there aren't enough of them yet.
 */
export function guestPage(
  met: readonly string[],
  sentences: ReadonlyMap<string, OwnSentence>,
  random: () => number = Math.random,
): PageLine[] | null {
  const pool = met
    .map((id) => sentences.get(id))
    .filter((s): s is OwnSentence => !!s && [...s.arabic].length <= LONGEST)
    .filter((s, i, all) => all.findIndex((x) => x.english === s.english) === i);
  if (pool.length < PAGE_LINES + 2) return null;
  const picked = shuffled(pool, random);
  const page = picked.slice(0, PAGE_LINES);
  const others = picked.slice(PAGE_LINES);
  return page.map((s, i) => {
    const wrong = [others[i % others.length], others[(i + 1) % others.length]]
      .map((o) => o?.english ?? '')
      .filter((e) => e && e !== s.english);
    return {
      arabic: s.arabic,
      english: s.english,
      choices: shuffled([s.english, ...wrong], random),
    };
  });
}

export const pageRead = (page: readonly PageLine[], answers: readonly string[]) =>
  page.filter((l, i) => answers[i] === l.english).length;

export const pickStranger = (random: () => number = Math.random): Stranger =>
  STRANGERS[Math.floor(random() * STRANGERS.length)] ?? (STRANGERS[0] as Stranger);

export const yourLines = (turns: readonly InnTurn[]) => turns.filter((t) => t.who === 'you').length;

/** The verdict from the judge's reply, or null when it isn't one. */
export function readVerdict(text: string): Verdict | null {
  try {
    const v = JSON.parse(text) as Record<string, unknown>;
    if (typeof v.understood !== 'boolean' || typeof v.answered !== 'boolean') return null;
    if (typeof v.keptGoing !== 'boolean' || typeof v.why !== 'string') return null;
    return { understood: v.understood, answered: v.answered, keptGoing: v.keptGoing, why: v.why };
  } catch {
    return null;
  }
}

export const storyPassed = (v: Verdict, turns: readonly InnTurn[]) =>
  v.understood && v.answered && v.keptGoing && yourLines(turns) >= STORY_LINES;

/** The finale opens once you are a Storyteller, the house's last rank. */
export const finaleOpen = (p: ArabicProgress) => p.ranks.includes('storyteller');
export const finalePassed = (p: ArabicProgress) => p.finale;

/**
 * Saves an attempt. A first pass sends `trial-stranger-at-the-gate`: the database gives the
 * guest-book pen and the title Keeper of the Table, and the feed tells your friends (ADR 0047).
 */
export async function reportFinale(
  api: SubjectApi,
  before: ArabicProgress,
  passed: boolean,
  seconds: number,
): Promise<ArabicProgress> {
  const first = passed && !before.finale;
  const next = first ? { ...before, finale: true } : before;
  await api.saveSession({
    state: next,
    xp: first ? FINALE_XP.pass : FINALE_XP.try,
    minutes: seconds / 60,
    events: first ? [{ kind: `trial-${FINALE_ID}` }] : [],
  });
  return next;
}
