import { describe, expect, it } from 'vitest';
import pack from '../../../content/arabic/road.json' with { type: 'json' };
import type { RoadContext } from '../../core/road.ts';
import { PAIRS } from './echo/pairs.ts';
import { LETTERS } from './letters.ts';
import { NEW_PROGRESS, type ArabicProgress } from './progress.ts';
import { REGULARS } from './questline.ts';
import { SLATE_IDS } from './ranks.ts';
import {
  ARABIC_CHECKS,
  ARABIC_DOORS,
  ARABIC_ROAD,
  ARABIC_ROAD_CHAPTERS,
  arabicDone,
  arabicRoad,
  roadFor,
} from './road.ts';

const TODAY = '2026-11-16';
const ctx: RoadContext = { today: TODAY, partner: 'ready', licensee: true, due: 0 };
const lettersTo = (lesson: number) => LETTERS.filter((l) => l.lesson <= lesson).map((l) => l.id);
const slateTo = (lesson: number) => lettersTo(lesson).filter((id) => SLATE_IDS.includes(id));
const SLATE: Record<string, number> = {
  'the-slate': 1,
  'a-line-of-letters': 3,
  'two-lines-of-letters': 6,
  'the-whole-slate': 8,
};
const PHRASES = [
  'at-the-door',
  'please-and-thanks',
  'counting',
  'questions',
  'at-the-shop',
  'getting-to-know-you',
  'at-the-coffee-corner',
  'which-way',
  'today-and-tomorrow',
];
const WELL = [
  'the-echo-well',
  'a-catch-in-the-throat',
  'two-rough-sounds',
  'deeper-still',
  'the-heavy-s',
  'the-heavy-d',
  'the-heavy-t',
  'three-ways-to-say-it',
];

/** The smallest change to saved progress that finishes a step. */
function finish(p: ArabicProgress, id: string): ArabicProgress {
  const chat = (c: Partial<ArabicProgress['chat']>) => ({ ...p, chat: { ...p.chat, ...c } });
  const [family, n] = id.split(':');
  if (family === 'lesson') {
    const k = Number(n);
    // Passing a lesson moves you to the next, whose letters you then meet.
    return k >= 8
      ? { ...p, done: true, met: lettersTo(8) }
      : { ...p, lesson: k + 1, met: lettersTo(k + 1) };
  }
  if (id === 'trial:1') return { ...p, guest: true };
  if (family === 'pass') {
    const wc = Number(n) - 1;
    const last = wc >= REGULARS.length;
    const words = Array.from({ length: 30 }, (_, i) => `w:${wc}:${i}`);
    return {
      ...p,
      words: {
        ...p.words,
        chapter: last ? wc : wc + 1,
        done: last,
        met: [...p.words.met, ...words],
      },
    };
  }
  if (family === 'trial') {
    return { ...p, words: { ...p.words, trials: [...p.words.trials, Number(n)] } };
  }
  if (id.startsWith('rank-')) return { ...p, ranks: [...p.ranks, id.slice(5)] };
  if (id in SLATE) return { ...p, written: slateTo(SLATE[id] ?? 0) };
  if (PHRASES.includes(id)) return { ...p, phraseSet: PHRASES.indexOf(id) + 2 };
  if (WELL.includes(id)) {
    return {
      ...p,
      echo: { ...p.echo, heard: PAIRS.slice(0, WELL.indexOf(id) + 1).map((x) => x.id) },
    };
  }
  const by: Record<string, () => ArabicProgress> = {
    // A first session meets the first lesson's letters.
    'a-few-letters': () => ({ ...p, sessions: 1, met: lettersTo(1) }),
    'the-fountain': () => ({ ...p, only: { ...p.only, listen: 1 } }),
    'the-storyteller': () => ({ ...p, only: { ...p.only, read: 1 } }),
    'innkeepers-table': () => ({ ...p, words: { ...p.words, sessions: 1 } }),
    'sit-with-salim': () => chat({ chats: 1 }),
    'in-hassans-voice': () => ({ ...p, echo: { ...p.echo, shadowed: 5 } }),
    'three-lines': () => chat({ best: 3 }),
    'twenty-evenings': () => chat({ chats: 20 }),
    'a-whole-evening': () => chat({ best: 8 }),
    'five-old-friends': () => chat({ met: { 2: 5, 3: 5, 4: 5, 5: 5, 6: 5 } }),
  };
  const change = by[id];
  if (!change) throw new Error(`the test can't finish ${id}`);
  return change();
}

/** Progress with every step before `id` finished, in order. */
function upTo(id?: string): ArabicProgress {
  let p = NEW_PROGRESS;
  for (const step of ARABIC_ROAD) {
    if (step.id === id) break;
    if (!arabicDone(step, p)) p = finish(p, step.id);
  }
  return p;
}

describe('The Long Road In as a road', () => {
  it('has a check for every written step, and a step for every check', () => {
    const written = pack.items.filter((i) => i.type === 'road-step').map((i) => i.id.slice(5));
    expect([...written].sort()).toEqual(Object.keys(ARABIC_CHECKS).sort());
  });

  it('is 274 steps in 114 chapters until the finale is built', () => {
    expect(ARABIC_ROAD).toHaveLength(274);
    expect(new Set(ARABIC_ROAD.map((s) => s.id)).size).toBe(274);
    expect(ARABIC_ROAD_CHAPTERS).toHaveLength(114);
    expect(arabicRoad(null, ctx)).toMatchObject({ steps: 274, chapters: 114 });
  });

  it('passes every word chapter and faces every regular’s trial once, in order', () => {
    const numbers = REGULARS.map((r) => r.number);
    const of = (family: string) =>
      ARABIC_ROAD.filter((s) => s.id.startsWith(`${family}:`)).map((s) =>
        Number(s.id.split(':')[1]),
      );
    expect(of('pass')).toEqual(numbers);
    expect(of('trial')).toEqual([1, ...numbers]);
    expect(of('lesson')).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('keeps chapters in order, and every step has a title, an invite and a real door', () => {
    let chapter = 1;
    for (const step of ARABIC_ROAD) {
      expect(step.chapter, step.id).toBeGreaterThanOrEqual(chapter);
      chapter = step.chapter;
      expect(step.title).not.toBe('');
      expect(step.invite).toMatch(/[.?]$/);
      expect(ARABIC_DOORS).toContain(step.door);
    }
    expect(ARABIC_ROAD.filter((s) => !s.beat).map((s) => s.id)).toEqual(['a-few-letters']);
  });

  it('walks from the first step to the last: one next step at every point, open to do', () => {
    let p = NEW_PROGRESS;
    const early: string[] = [];
    ARABIC_ROAD.forEach((step, i) => {
      if (arabicDone(step, p)) {
        early.push(step.id);
        return;
      }
      const here = arabicRoad(p, ctx);
      expect(here.position?.index, step.id).toBe(i);
      expect(here.now, step.id).toMatchObject({ kind: 'step', index: i });
      p = finish(p, step.id);
      for (const before of ARABIC_ROAD.slice(0, i + 1)) {
        if (!arabicDone(before, p)) throw new Error(`${before.id} came undone after ${step.id}`);
      }
    });
    // Words met pass 1,000 and 2,000 on the way: those two marks are reached by walking.
    expect(early).toEqual(['a-thousand-words', 'two-thousand-words']);
    expect(arabicRoad(p, ctx).position).toBeNull();
  });

  it('gives a new player three things on day one, then waits for tomorrow and moves on', () => {
    let p = NEW_PROGRESS;
    for (const id of ['a-few-letters', 'at-the-door', 'the-slate']) {
      expect(arabicRoad(p, ctx).now).toMatchObject({ step: { id } });
      p = finish(p, id);
    }
    // One good session today: the second has to be on a later day.
    p = { ...p, streak: 1, passDay: TODAY };
    const here = arabicRoad(p, ctx);
    expect(here.position?.step.id).toBe('lesson:1');
    expect(here.waiting).toMatchObject({
      reason: 'tomorrow',
      line: 'The road goes on tomorrow: Milestone 1.',
    });
    expect(here.now).toMatchObject({ kind: 'step', step: { id: 'the-fountain' } });
    // Tomorrow the lesson is the next step again.
    expect(arabicRoad(p, { ...ctx, today: '2026-11-17' }).now).toMatchObject({
      step: { id: 'lesson:1' },
    });
  });

  it('on a word chapter’s waiting day, sends you to sit with its regular', () => {
    const p0 = upTo('pass:13');
    const p = { ...p0, words: { ...p0.words, streak: 1, passDay: TODAY } };
    const here = arabicRoad(p, ctx);
    expect(here.position?.step.id).toBe('pass:13');
    expect(here.waiting?.reason).toBe('tomorrow');
    expect(here.now).toMatchObject({
      kind: 'meanwhile',
      why: 'regular',
      door: 'chat',
      line: 'Tonight: sit with Abu Sami while the words settle.',
    });
    // Reviews due come first; with nobody at the table, a station of the day.
    expect(arabicRoad(p, { ...ctx, due: 1 }).now).toMatchObject({
      why: 'reviews',
      door: 'words',
      line: 'Tonight: 1 review is due. Keep what you’ve learned.',
    });
    expect(arabicRoad(p, { ...ctx, partner: 'off' }).now).toMatchObject({ why: 'station' });
    expect(arabicRoad(p, { ...ctx, contractDoor: 'echo', partner: 'spent' }).now).toMatchObject({
      why: 'contract',
      door: 'echo',
    });
  });

  it('moves past a talk the regulars can’t have today, and says why', () => {
    const p = upTo('sit-with-salim');
    const spent = arabicRoad(p, { ...ctx, partner: 'spent' });
    expect(spent.position?.step.id).toBe('sit-with-salim');
    expect(spent.waiting).toMatchObject({
      reason: 'spent',
      line: 'The regulars have talked enough for one day. Tomorrow: Sit with Salim.',
    });
    expect(spent.now).toMatchObject({ step: { id: 'pass:2' } });
    const off = arabicRoad(p, { ...ctx, partner: 'off' });
    expect(off.waiting?.line).toBe('Nobody is at the table on this site yet.');
    expect(off.now).toMatchObject({ step: { id: 'pass:2' } });
  });

  it('never offers a rank the player can’t take yet', () => {
    // Three Lines is waiting (no partner), so Neighbor is not open: the road goes on with words.
    const p = upTo('three-lines');
    expect(arabicRoad(p, { ...ctx, partner: 'off' }).now).toMatchObject({
      step: { id: 'pass:12' },
    });
  });

  it('leaves the deck’s steps out of the road of a player without the deck', () => {
    const own = roadFor(false);
    expect(own.some((s) => s.needs === 'deck')).toBe(false);
    expect(own.map((s) => s.id).slice(0, 4)).toEqual([
      'a-few-letters',
      'the-slate',
      'lesson:1',
      'the-fountain',
    ]);
    const here = arabicRoad(null, { ...ctx, licensee: false });
    expect(here.steps).toBe(own.length);
    expect(here.now).toMatchObject({ step: { id: 'a-few-letters' } });
  });

  it('after the last step, names something for every day, never the same two days running', () => {
    const p = upTo();
    let last = '';
    const doors = new Set<string>();
    for (let d = 1; d <= 30; d++) {
      const today = `2027-03-${String(d).padStart(2, '0')}`;
      const now = arabicRoad(p, { ...ctx, today }).now;
      if (now.kind !== 'meanwhile') throw new Error('a finished road has no step');
      expect(now.line).toMatch(/^Tonight: /);
      expect(now.door).not.toBe(last);
      last = now.door;
      doors.add(now.door);
    }
    expect([...doors].sort()).toEqual([
      'chat',
      'echo',
      'listen',
      'phrases',
      'read',
      'words',
      'write',
    ]);
  });
});
