import { describe, expect, it } from 'vitest';
import {
  answer,
  localDay,
  opensAt,
  standingLine,
  stepAt,
  type Meanwhile,
  type RoadChapter,
  type RoadStep,
  type Walk,
} from './road';

const step = (id: string, chapter: number, door: string): RoadStep => ({
  id,
  chapter,
  kind: 'lesson',
  title: `Title ${id}`,
  invite: `Do ${id}.`,
  door,
});

const STEPS: RoadStep[] = [
  step('a', 1, 'school'),
  step('b', 1, 'school'),
  step('c', 2, 'market'),
  step('d', 2, 'market'),
  step('e', 3, 'well'),
];
const CHAPTERS: RoadChapter[] = [1, 2, 3].map((number) => ({ number, title: `Ch ${number}` }));
const MEANWHILE: Meanwhile = { door: 'school', line: 'Review.', why: 'reviews' };

const at = (position: number) => {
  const w: Walk = { position, compass: position };
  return answer('q', STEPS, CHAPTERS, w, () => MEANWHILE);
};

describe('standingLine', () => {
  it('counts from 1, out of every step', () => {
    expect(standingLine(at(0))).toBe('Step 1 of 5');
    expect(standingLine(at(4))).toBe('Step 5 of 5');
  });

  it('says the road is walked when no step is left', () => {
    expect(standingLine(at(-1))).toBe('All 5 steps walked');
  });
});

describe('stepAt', () => {
  it('is the first step at a door, from 1', () => {
    expect(stepAt(STEPS, 'school')).toBe(1);
    expect(stepAt(STEPS, 'market')).toBe(3);
    expect(stepAt(STEPS, 'well')).toBe(5);
  });

  it('is 0 for a door the road never reaches', () => {
    expect(stepAt(STEPS, 'tower')).toBe(0);
    expect(stepAt([], 'school')).toBe(0);
  });
});

describe('opensAt', () => {
  it('names the step that first reaches a door still ahead', () => {
    expect(opensAt(at(0), STEPS, 'market')).toBe('Opens at step 3 · Title c');
    expect(opensAt(at(1), STEPS, 'well')).toBe('Opens at step 5 · Title e');
  });

  it('is null once the road stands at or past that step', () => {
    expect(opensAt(at(2), STEPS, 'market')).toBeNull();
    expect(opensAt(at(3), STEPS, 'market')).toBeNull();
    expect(opensAt(at(0), STEPS, 'school')).toBeNull();
  });

  it('is null for a door the road never reaches, or a road walked to the end', () => {
    expect(opensAt(at(0), STEPS, 'tower')).toBeNull();
    expect(opensAt(at(-1), STEPS, 'well')).toBeNull();
  });
});

describe('localDay', () => {
  it('is the local date, padded', () => {
    expect(localDay(new Date(2027, 0, 5, 23, 59))).toBe('2027-01-05');
    expect(localDay(new Date(2026, 10, 18, 0, 0))).toBe('2026-11-18');
  });

  it('defaults to today', () => {
    expect(localDay()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
