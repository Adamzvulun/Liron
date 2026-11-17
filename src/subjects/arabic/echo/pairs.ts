// Hear the difference (#193, E14): ear training on the sounds a Hebrew speaker mixes up, at the
// echo well. The pairs and their order are ours (content/arabic/sound-pairs.json); the words
// and recordings are the private deck's (ADR 0011). Design: docs/game/mic-practice.md §2.
import { z } from 'zod';
import type { Item } from '../../../core/content/schema.ts';
import pack from '../../../../content/arabic/sound-pairs.json' with { type: 'json' };
import { line, shuffle, type DeckLine } from '../core/coreWords.ts';
import { letterById, type Letter } from '../letters.ts';
import type { ArabicProgress } from '../progress.ts';
import { untagged, type Word } from '../words.ts';

type Rand = () => number;
export type Side = 'a' | 'b';

const SideData = z.object({
  letter: z.string(),
  /** The word's first written letter must be one of these (ء is mostly written as alif). */
  written: z.array(z.string()).min(1),
  /** …and the deck's romanization must start with one of these, so the sound is really there. */
  sounds: z.array(z.string()).min(1),
  label: z.string(),
});
const PairData = z.object({
  order: z.number().int().positive(),
  title: z.string(),
  tip: z.string(),
  a: SideData,
  b: SideData,
  minimal: z.array(
    z.object({ a: z.string(), aGloss: z.string(), b: z.string(), bGloss: z.string() }),
  ),
});

export interface PairSide {
  letter: Letter;
  written: ReadonlySet<string>;
  sounds: readonly string[];
  label: string;
}

export interface SoundPair {
  /** e.g. `hah-heh`; its listen rating is saved as `pair:hah-heh`. */
  id: string;
  itemId: string;
  order: number;
  title: string;
  tip: string;
  a: PairSide;
  b: PairSide;
  minimal: readonly { a: string; aGloss: string; b: string; bGloss: string }[];
}

const sideOf = (s: z.infer<typeof SideData>): PairSide => {
  const letter = letterById(s.letter);
  if (!letter) throw new Error(`sound-pairs.json: no letter ${s.letter}`);
  return { letter, written: new Set(s.written), sounds: s.sounds, label: s.label };
};

export const PAIRS: readonly SoundPair[] = pack.items
  .map((i) => {
    const d = PairData.parse(i.data);
    return {
      id: i.id.replace(/^pair:/, ''),
      itemId: i.id,
      order: d.order,
      title: d.title,
      tip: d.tip,
      a: sideOf(d.a),
      b: sideOf(d.b),
      minimal: d.minimal,
    };
  })
  .sort((x, y) => x.order - y.order);

/** A pair is heard after this many right in a row. */
export const HEARD_STREAK = 20;
/** Questions in a round, and how many of them come from pairs you've already heard. */
export const ROUND = 10;
const REVIEW_SHARE = 3;
/** At most this many "which one?" questions a round: the deck has few minimal pairs. */
const MAX_MINIMAL = 3;
/** 1 XP a right answer: a question takes about 6 seconds (docs/game/economy.md). */
export const XP_PER_RIGHT = 1;

/** How the deck writes a word's first sound: diacritics and leading punctuation dropped. */
export function firstSound(w: Pick<Word, 'sound'>): string {
  return untagged(w.sound)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .toLowerCase();
}

/** Which side of the pair a word starts with, or null when it's neither (or not clearly said). */
export function sideFor(w: Word, pair: SoundPair): Side | null {
  const first = w.letters[0]?.id ?? '';
  const start = firstSound(w);
  for (const side of ['a', 'b'] as const) {
    const s = pair[side];
    if (s.written.has(first) && s.sounds.some((x) => start.startsWith(x))) return side;
  }
  return null;
}

/** Short words, so the first sound is quick to hear. */
const short = (w: Word) => w.letters.length <= 6;

/** The words for "which sound?", by side. */
export function wordsFor(words: readonly Word[], pair: SoundPair): Record<Side, Word[]> {
  const out: Record<Side, Word[]> = { a: [], b: [] };
  for (const w of words) {
    if (!short(w)) continue;
    const side = sideFor(w, pair);
    if (side) out[side].push(w);
  }
  return out;
}

export interface MinimalWord extends DeckLine {
  deck: string;
  gloss: string;
}

/** "Which one?": you hear one word of a minimal pair and pick it from the two. */
export interface WhichOne {
  kind: 'one';
  pair: SoundPair;
  a: MinimalWord;
  b: MinimalWord;
  answer: Side;
}

/** "Which sound?": you hear a word and pick which of the pair's sounds it starts with. */
export interface WhichSound {
  kind: 'sound';
  pair: SoundPair;
  word: Word;
  answer: Side;
}

export type PairQuestion = WhichOne | WhichSound;

export const audioOf = (q: PairQuestion) => (q.kind === 'sound' ? q.word.audio : q[q.answer].audio);

/** The minimal pairs the deck has recordings for. */
export function minimalPairs(
  items: readonly Item[],
  pair: SoundPair,
): { a: MinimalWord; b: MinimalWord }[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return pair.minimal.flatMap((m) => {
    const a = line(byId.get(m.a));
    const b = line(byId.get(m.b));
    return a && b
      ? [{ a: { ...a, deck: m.a, gloss: m.aGloss }, b: { ...b, deck: m.b, gloss: m.bGloss } }]
      : [];
  });
}

/** The pair you're training: the first not yet heard, or null once every pair is. */
export function currentPair(p: ArabicProgress): SoundPair | null {
  return PAIRS.find((x) => !p.echo.heard.includes(x.id)) ?? null;
}

/** Questions about one pair, about half from each side; "which one?" first where there are any. */
function pairQuestions(
  pair: SoundPair,
  words: readonly Word[],
  items: readonly Item[],
  count: number,
  rand: Rand,
): PairQuestion[] {
  const out: PairQuestion[] = [];
  const minimal = shuffle(minimalPairs(items, pair), rand).slice(
    0,
    Math.min(MAX_MINIMAL, Math.floor(count / 3)),
  );
  for (const m of minimal) out.push({ kind: 'one', pair, ...m, answer: rand() < 0.5 ? 'a' : 'b' });
  const sides = wordsFor(words, pair);
  const pools = { a: shuffle(sides.a, rand), b: shuffle(sides.b, rand) };
  let next: Side = rand() < 0.5 ? 'a' : 'b';
  while (out.length < count && (pools.a.length || pools.b.length)) {
    const side: Side = pools[next].length ? next : next === 'a' ? 'b' : 'a';
    const word = pools[side].shift() as Word;
    out.push({ kind: 'sound', pair, word, answer: side });
    next = next === 'a' ? 'b' : 'a';
  }
  return out;
}

/**
 * A round: mostly the pair you're training, with a few from pairs you've heard mixed in. Once
 * every pair is heard, a round mixes them all.
 */
export function roundQuestions(
  p: ArabicProgress,
  words: readonly Word[],
  items: readonly Item[],
  rand: Rand,
): PairQuestion[] {
  const current = currentPair(p);
  const heard = PAIRS.filter((x) => p.echo.heard.includes(x.id));
  if (!current) {
    const each = Math.ceil(ROUND / PAIRS.length) + 1;
    const all = PAIRS.flatMap((x) => pairQuestions(x, words, items, each, rand));
    return shuffle(all, rand).slice(0, ROUND);
  }
  const back = heard.length ? REVIEW_SHARE : 0;
  const own = pairQuestions(current, words, items, ROUND - back, rand);
  const old = shuffle(
    heard.flatMap((x) => pairQuestions(x, words, items, 2, rand)),
    rand,
  ).slice(0, ROUND - own.length);
  return shuffle([...own, ...old], rand);
}

/**
 * After a round: right answers on the pair you're training add to its streak and a wrong one
 * resets it; at HEARD_STREAK it's heard and the next pair opens. Answers about heard pairs
 * don't move the streak. Returns the pair just heard, if one was.
 */
export function applyRound(
  p: ArabicProgress,
  answers: readonly { question: PairQuestion; right: boolean }[],
): { next: ArabicProgress; heard: SoundPair | null } {
  const current = currentPair(p);
  let streak = p.echo.streak;
  let heard: SoundPair | null = null;
  for (const a of answers) {
    if (!current || heard || a.question.pair.id !== current.id) continue;
    streak = a.right ? streak + 1 : 0;
    if (streak >= HEARD_STREAK) heard = current;
  }
  return {
    heard,
    next: {
      ...p,
      sessions: p.sessions + 1,
      echo: {
        ...p.echo,
        streak: heard ? 0 : streak,
        heard: heard ? [...p.echo.heard, heard.id] : p.echo.heard,
        rounds: p.echo.rounds + 1,
      },
    },
  };
}
