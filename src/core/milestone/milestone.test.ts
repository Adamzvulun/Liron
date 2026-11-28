import { describe, expect, it } from 'vitest';
import arabic from '../../../content/arabic/milestone.json' with { type: 'json' };
import morse from '../../../content/morse/milestone.json' with { type: 'json' };
import { canDoPercent, milestoneDue, probePercent, STATEMENTS } from './milestone.ts';

describe('when the milestone check is offered', () => {
  const due = (today: string, anchor: string | null, offeredOn: string | null = null) =>
    milestoneDue({ today, anchor, offeredOn });

  it('waits 28 days from the last check, or from the first day of practice', () => {
    expect(due('2026-11-28', '2026-11-01')).toBe(false);
    expect(due('2026-11-29', '2026-11-01')).toBe(true);
  });
  it('is never offered to a player with no practice yet', () => {
    expect(due('2027-01-01', null)).toBe(false);
  });
  it('is not offered again for 7 days after it was offered', () => {
    expect(due('2026-12-05', '2026-11-01', '2026-12-01')).toBe(false);
    expect(due('2026-12-08', '2026-11-01', '2026-12-01')).toBe(true);
  });
});

describe('scoring', () => {
  it('turns can-do answers into a percent', () => {
    expect(canDoPercent([2, 2, 2, 2, 2, 2])).toBe(100);
    expect(canDoPercent([0, 0, 0, 0, 0, 0])).toBe(0);
    expect(canDoPercent([2, 1, 0, 2, 1, 0])).toBe(50);
  });
  it('turns a probe into a percent, or nothing when none was asked', () => {
    expect(probePercent(4, 6)).toBe(67);
    expect(probePercent(0, 0)).toBeNull();
  });
});

describe('the statements', () => {
  it.each([
    ['arabic', arabic],
    ['morse', morse],
  ])('%s has six, each ending in a full stop', (_, pack) => {
    const s = (pack.items[0]?.data as { statements: string[] }).statements;
    expect(s).toHaveLength(STATEMENTS);
    expect(s.every((x) => x.startsWith('I can ') && x.endsWith('.'))).toBe(true);
  });
});
