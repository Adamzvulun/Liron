// A sending drill (#36): key a short text from the letters you've learned to hear, then see
// what the tower read and how clean your fist was. Saved: your keying speed, a send rating per
// letter (ADR 0010), XP and minutes.

import type { SubjectApi } from '../../../core/subject.ts';
import type { MorseProgress } from '../lesson/progress.ts';
import type { RunScore } from '../lesson/score.ts';
import { MORSE_WORDS } from '../words.ts';

/** Groups of this many letters, this many groups: about a minute of keying for a beginner. */
export const GROUP = 3;
export const GROUPS = 5;

/** A drill text from your letters, never the same letter three times running. */
export function drillText(letters: readonly string[], random: () => number = Math.random): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let group = '';
    while (group.length < GROUP) {
      const c = letters[Math.floor(random() * letters.length)] ?? 'K';
      if (letters.length > 1 && group.endsWith(c + c)) continue;
      group += c;
    }
    groups.push(group);
  }
  return groups.join(' ');
}

/** Words in a word drill: about as many letters as a letter drill. */
export const WORD_DRILL = 5;

/**
 * Common words you can key with the letters you've learned to hear (2 to 5 letters, the 200
 * commonest), most frequent first. Sending words follows the word drill (docs/game/morse-words.md).
 */
export function keyableWords(letters: readonly string[]): string[] {
  const have = new Set(letters);
  return MORSE_WORDS.filter(
    (w) =>
      w.kind === 'word' &&
      (w.rank ?? 999) <= 200 &&
      w.text.length >= 2 &&
      w.text.length <= 5 &&
      [...w.text].every((c) => have.has(c)),
  ).map((w) => w.text);
}

/** A word drill text: WORD_DRILL different words, or null until that many can be keyed. */
export function wordDrillText(
  letters: readonly string[],
  random: () => number = Math.random,
): string | null {
  const pool = keyableWords(letters);
  if (pool.length < WORD_DRILL) return null;
  const out: string[] = [];
  while (out.length < WORD_DRILL) {
    const [w] = pool.splice(Math.floor(random() * pool.length), 1);
    if (w) out.push(w);
  }
  return out.join(' ');
}

/** About 10 XP a minute (docs/game/economy.md): a drill is ~15 letters in a minute or so. */
export const xpForDrill = (score: RunScore) => Math.round(score.right * 0.6);

export function applyDrill(p: MorseProgress, ditMs: number): MorseProgress {
  const dit = Math.round(ditMs);
  const fastest = Math.min(dit, p.sending.fastest ?? p.sending.ditMs ?? dit);
  return { ...p, sending: { drills: p.sending.drills + 1, ditMs: dit, fastest } };
}

/** Saves a drill: state, then a send rating per letter, then XP and minutes. */
export async function reportDrill(
  api: SubjectApi,
  next: MorseProgress,
  score: RunScore,
  seconds: number,
  at = new Date(),
): Promise<void> {
  await api.saveSession({
    state: next,
    results: [...score.byChar].map(([c, t]) => ({
      skill: 'send',
      itemId: `char:${c}`,
      score: t.right / t.played,
    })),
    xp: xpForDrill(score),
    minutes: seconds / 60,
    events: [{ kind: 'drill' }, ...(score.accuracy >= 0.8 ? [{ kind: 'drill-80' }] : [])],
    at,
  });
}
