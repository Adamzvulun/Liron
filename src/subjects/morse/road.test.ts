import { describe, expect, it } from 'vitest';
import pack from '../../../content/morse/road.json' with { type: 'json' };
import type { RoadContext } from '../../core/road.ts';
import { MORSE_CHARS } from './code.ts';
import { NEW_PROGRESS, type MorseProgress } from './lesson/progress.ts';
import {
  MORSE_CHECKS,
  MORSE_DOORS,
  MORSE_ROAD,
  MORSE_ROAD_CHAPTERS,
  morseDone,
  morseRoad,
} from './road.ts';
import { PROSIGNS } from './words.ts';

const ctx: RoadContext = { today: '2026-11-16', partner: 'ready', licensee: true, due: 0 };
const KOCH = MORSE_CHARS.map((c) => c.char);

/** The smallest change to saved progress that finishes a step. */
function finish(p: MorseProgress, id: string): MorseProgress {
  const drills = (n: number) => ({ ...p, sending: { ...p.sending, drills: n } });
  const fast = (ms: number) => ({ ...p, sending: { ...p.sending, ditMs: ms, fastest: ms } });
  const contacts = (n: number) => ({ ...p, radio: { ...p.radio, contacts: n } });
  const rank = (r: string) => ({ ...p, ranks: [...p.ranks, r] });
  const trial = (t: string) => ({ ...p, rankTrials: [...p.rankTrials, t] });
  if (id.startsWith('lamp:')) return { ...p, unlocked: KOCH.indexOf(id.slice(5)) + 1 };
  if (id.startsWith('trial:')) return { ...p, trials: [...p.trials, Number(id.slice(6))] };
  if (id.startsWith('rank-')) return rank(id.slice(5));
  const by: Record<string, () => MorseProgress> = {
    'first-sounds': () => ({ ...p, runs: 1 }),
    'warm-key': () => drills(1),
    'lamp-fades': () => ({ ...p, recognition: { ...p.recognition, rounds: 1 } }),
    'logbook-words': () => ({ ...p, words: { ...p.words, rounds: 1 } }),
    'steadier-hand': () => drills(4),
    'operators-chair': () => drills(8),
    'list-of-stations': () => ({ ...p, rush: { ...p.rush, runs: 1 } }),
    'nine-minutes-past': () => drills(12),
    'one-more-night': () => drills(16),
    'twenty-messages': () => drills(20),
    'fifteen-wpm': () => fast(80),
    'lamp-signal': () => trial('lamp-signal'),
    'four-signs': () => ({ ...p, prosigns: PROSIGNS.map((s) => s.id) }),
    'far-station': () => trial('far-station'),
    'own-call': () => ({ ...p, radio: { ...p.radio, call: 'W1AW', name: 'ADAM', qth: 'HAIFA' } }),
    'first-on-air': () => contacts(1),
    'words-by-ear': () => ({ ...p, words: { ...p.words, rounds: 10 } }),
    'night-watch': () => trial('night-watch'),
    'three-in-log': () => contacts(3),
    'six-in-log': () => contacts(6),
    'ten-in-log': () => contacts(10),
    'no-repeats': () => ({ ...p, radio: { ...p.radio, cleanFast: true } }),
    'thirty-by-ear': () => ({ ...p, rush: { ...p.rush, topWpm: 30 } }),
    'thirty-by-hand': () => fast(40),
  };
  const change = by[id];
  if (!change) throw new Error(`the test can't finish ${id}`);
  return change();
}

/** Progress with every step before `id` finished, in order. */
function upTo(id?: string): MorseProgress {
  let p = NEW_PROGRESS;
  for (const step of MORSE_ROAD) {
    if (step.id === id) break;
    p = finish(p, step.id);
  }
  return p;
}

describe('The Silent Beacon as a road', () => {
  it('has a check for every written step, and a step for every check', () => {
    const written = pack.items.filter((i) => i.type === 'road-step').map((i) => i.id.slice(5));
    expect([...written].sort()).toEqual(Object.keys(MORSE_CHECKS).sort());
  });

  it('is 74 steps in 10 chapters until the finale is built', () => {
    expect(MORSE_ROAD).toHaveLength(74);
    expect(MORSE_ROAD_CHAPTERS.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(MORSE_ROAD.map((s) => s.id)).size).toBe(74);
    expect(morseRoad(null, ctx)).toMatchObject({ steps: 74, chapters: 10 });
  });

  it('lights every lamp once, in Koch order, after the first two sounds', () => {
    const lamps = MORSE_ROAD.filter((s) => s.id.startsWith('lamp:')).map((s) => s.id.slice(5));
    expect(lamps).toEqual(KOCH.slice(2));
  });

  it('keeps chapters in order, and every step has a title, an invite and a real door', () => {
    let chapter = 1;
    for (const step of MORSE_ROAD) {
      expect(step.chapter).toBeGreaterThanOrEqual(chapter);
      chapter = step.chapter;
      expect(step.title).not.toBe('');
      expect(step.invite).toMatch(/[.?]$/);
      expect(MORSE_DOORS).toContain(step.door);
    }
    // Every step but the very first has a line of story.
    expect(MORSE_ROAD.filter((s) => !s.beat).map((s) => s.id)).toEqual([
      'first-sounds',
      'lamp-signal',
      'night-watch',
    ]);
  });

  it('walks from the first step to the last: one next step at every point, open to do', () => {
    let p = NEW_PROGRESS;
    MORSE_ROAD.forEach((step, i) => {
      const here = morseRoad(p, ctx);
      expect(here.position?.index, step.id).toBe(i);
      // The compass points at the same step: it is open by the game's own rules.
      expect(here.now, step.id).toMatchObject({ kind: 'step', index: i });
      p = finish(p, step.id);
      // Never backwards: everything up to here stays done.
      for (const before of MORSE_ROAD.slice(0, i + 1)) {
        expect(morseDone(before, p), `${before.id} after ${step.id}`).toBe(true);
      }
    });
    expect(morseRoad(p, ctx).position).toBeNull();
  });

  it('says where a step sits in its chapter', () => {
    const here = morseRoad(upTo('warm-key'), ctx);
    expect(here.position).toMatchObject({
      chapter: { number: 1, title: 'Embers' },
      inChapter: 4,
      ofChapter: 10,
    });
    expect(here.now).toMatchObject({ step: { door: 'sending', title: 'The Warm Key' } });
  });

  it('finds later steps already done for a player who did them first', () => {
    const p = { ...NEW_PROGRESS, sending: { drills: 20, ditMs: 90, fastest: 90 } };
    expect(morseRoad(p, ctx).position?.step.id).toBe('first-sounds');
    const done = MORSE_ROAD.filter((s) => morseDone(s, p)).map((s) => s.id);
    expect(done).toEqual([
      'warm-key',
      'steadier-hand',
      'operators-chair',
      'nine-minutes-past',
      'one-more-night',
      'twenty-messages',
    ]);
  });

  it('a slower drill later never undoes a speed step', () => {
    const p = finish(upTo('fifteen-wpm'), 'fifteen-wpm');
    const slower = { ...p, sending: { ...p.sending, ditMs: 140 } };
    expect(morseRoad(slower, ctx).position?.step.id).toBe('lamp-signal');
  });

  it('holds the next lamp behind a chapter’s trial', () => {
    const p = upTo('trial:1');
    expect(morseRoad(p, ctx).now).toMatchObject({ step: { id: 'trial:1', door: 'trial' } });
  });

  it('after the last step, names something for every day, never the same two days running', () => {
    const p = upTo();
    let last = '';
    for (let d = 1; d <= 30; d++) {
      const today = `2027-03-${String(d).padStart(2, '0')}`;
      const now = morseRoad(p, { ...ctx, today }).now;
      if (now.kind !== 'meanwhile') throw new Error('a finished road has no step');
      expect(now.why).toBe('station');
      expect(now.line).toMatch(/^Tonight: /);
      expect(now.door).not.toBe(last);
      last = now.door;
    }
  });

  it('puts due reviews first, then a contract, when the road is done', () => {
    const p = upTo();
    expect(morseRoad(p, { ...ctx, due: 3 }).now).toMatchObject({
      why: 'reviews',
      door: 'koch',
      line: 'Tonight: 3 sounds are due for review on the stair.',
    });
    expect(morseRoad(p, { ...ctx, contractDoor: 'radio' }).now).toMatchObject({
      why: 'contract',
      door: 'radio',
    });
  });
});
