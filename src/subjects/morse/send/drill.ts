// A sending drill (#36): key a short text from the letters you've learned to hear, then see
// what the tower read and how clean your fist was. Saved: your keying speed, a send rating per
// letter (ADR 0010), XP and minutes.

import type { SubjectApi } from '../../../core/subject.ts';
import type { MorseProgress } from '../lesson/progress.ts';
import type { RunScore } from '../lesson/score.ts';

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

/** About 10 XP a minute (docs/game/economy.md): a drill is ~15 letters in a minute or so. */
export const xpForDrill = (score: RunScore) => Math.round(score.right * 0.6);

export function applyDrill(p: MorseProgress, ditMs: number): MorseProgress {
  return { ...p, sending: { drills: p.sending.drills + 1, ditMs: Math.round(ditMs) } };
}

/** Saves a drill: state, then a send rating per letter, then XP and minutes. */
export async function reportDrill(
  api: SubjectApi,
  next: MorseProgress,
  score: RunScore,
  seconds: number,
  at = new Date(),
): Promise<void> {
  await api.saveState(next);
  for (const [c, t] of score.byChar) {
    await api.recordResult('send', `char:${c}`, t.right / t.played, { at });
  }
  const xp = xpForDrill(score);
  if (xp > 0) await api.awardXP(xp);
  await api.recordPractice(seconds / 60);
}
