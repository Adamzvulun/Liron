import { describe, expect, it } from 'vitest';
import { EVENTS, eventOn, type WorldEvent } from './events.ts';

// The same calendar rule as the database's event_on (supabase/tests: world events).

describe('the event on a day', () => {
  it('follows the calendar, both ends included, every year', () => {
    expect(eventOn('2027-02-09')).toBeNull();
    expect(eventOn('2027-02-10')?.id).toBe('radio-day');
    expect(eventOn('2031-02-16')?.id).toBe('radio-day');
    expect(eventOn('2027-02-17')).toBeNull();
    expect(eventOn('2027-12-18')?.id).toBe('arabic-language-day');
    expect(eventOn(undefined)).toBeNull();
  });

  it('runs over the new year', () => {
    const newYear: WorldEvent = {
      id: 'new-year',
      name: 'New Year',
      from: '12-30',
      to: '01-02',
      chest: 'brass',
      colors: ['#fff', '#000'],
      line: '',
    };
    expect(eventOn('2027-12-31', [newYear])?.id).toBe('new-year');
    expect(eventOn('2028-01-02', [newYear])?.id).toBe('new-year');
    expect(eventOn('2028-01-03', [newYear])).toBeNull();
  });

  it('has three or four events through the year, none overlapping, each a week', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(3);
    const days = new Map<string, string>();
    for (const e of EVENTS) {
      const start = new Date(`2027-${e.from}T00:00:00Z`);
      for (let d = 0; d < 7; d += 1) {
        const day = new Date(start.getTime() + d * 86_400_000).toISOString().slice(0, 10);
        expect(eventOn(day)?.id).toBe(e.id);
        expect(days.has(day)).toBe(false);
        days.set(day, e.id);
      }
      expect(e.colors.length).toBeGreaterThanOrEqual(2);
    }
  });
});
