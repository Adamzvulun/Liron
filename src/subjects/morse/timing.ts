// Morse timing (#30, ADR 0009). Pure maths, no audio, so it can be unit-tested.
//
// PARIS standard: a word is 50 units ("PARIS " incl. the word gap), so one unit (a dit) lasts
// 1.2 / wpm seconds. Dah = 3 units, gap inside a character = 1, between characters = 3,
// between words = 7.
//
// Farnsworth: characters keep their own speed; only the gaps between characters and words are
// stretched so the whole text averages the slower effective speed. Formula from the ARRL
// ("A Standard for Morse Timing Using the Farnsworth Technique", Jon Bloom KE3Z, QEX 1990):
//   total extra delay per word  ta = (60c − 37.2s) / (s·c)  seconds
//   character gap = 3·ta/19, word gap = 7·ta/19
// where c is the character speed and s the effective speed, in wpm.

import { codeFor, sendable } from './code.ts';

export interface Speed {
  /** Character speed in wpm (PARIS). Default 20. */
  charWpm: number;
  /** Effective (Farnsworth) speed in wpm. At or above charWpm means standard spacing. */
  effWpm?: number;
}

/** Length of one unit (a dit) in seconds. */
export function ditSeconds(wpm: number): number {
  if (!(wpm > 0)) throw new RangeError(`wpm must be positive, got ${wpm}`);
  return 1.2 / wpm;
}

/** Gaps between characters and between words, in seconds. */
export function gapSeconds({ charWpm, effWpm = charWpm }: Speed): { char: number; word: number } {
  const dit = ditSeconds(charWpm);
  if (effWpm >= charWpm) return { char: 3 * dit, word: 7 * dit };
  if (!(effWpm > 0)) throw new RangeError(`effWpm must be positive, got ${effWpm}`);
  const ta = (60 * charWpm - 37.2 * effWpm) / (effWpm * charWpm);
  return { char: (3 * ta) / 19, word: (7 * ta) / 19 };
}

/** One key-down: a tone from `at` for `dur` seconds (both relative to the start). */
export interface Tone {
  at: number;
  dur: number;
}

/** Where a character sits in the sound, for highlighting and for scoring copy later. */
export interface PlayedChar {
  char: string;
  at: number;
  end: number;
}

export interface Schedule {
  tones: Tone[];
  chars: PlayedChar[];
  /** From the first tone's start to the last tone's end. */
  duration: number;
}

/**
 * Turns text into key-down times. Spaces (any run of whitespace) are word gaps; characters we
 * don't teach are skipped. A prosign in angle brackets (`<AR>`) is one character. No trailing gap.
 */
export function schedule(text: string, speed: Speed): Schedule {
  const dit = ditSeconds(speed.charWpm);
  const gaps = gapSeconds(speed);
  const tones: Tone[] = [];
  const chars: PlayedChar[] = [];
  let t = 0;
  let pendingGap = 0;

  for (const word of text.trim().split(/\s+/)) {
    for (const char of sendable(word)) {
      const code = codeFor(char);
      if (!code) continue;
      t += pendingGap;
      const start = t;
      [...code].forEach((el, i) => {
        if (i > 0) t += dit;
        const dur = el === '-' ? 3 * dit : dit;
        tones.push({ at: t, dur });
        t += dur;
      });
      chars.push({ char: char.toUpperCase(), at: start, end: t });
      pendingGap = gaps.char;
    }
    if (chars.length) pendingGap = gaps.word;
  }
  return { tones, chars, duration: t };
}
