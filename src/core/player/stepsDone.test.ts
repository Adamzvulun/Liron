import { describe, expect, it } from 'vitest';
import type { CompassLine } from './compass.ts';
import { stepWatcher } from './stepsDone.ts';

const line = (subject: string, progress?: string) => ({ subject, progress }) as CompassLine;

describe('steps done since the last look at the square', () => {
  it('the first look lights nothing; a moved step lights its guild once', () => {
    const look = stepWatcher();
    expect(look([line('morse', 'Step 3 of 74'), line('arabic', 'Step 1 of 274')])).toEqual([]);
    expect(look([line('morse', 'Step 4 of 74'), line('arabic', 'Step 1 of 274')])).toEqual([
      'morse',
    ]);
    expect(look([line('morse', 'Step 4 of 74'), line('arabic', 'Step 1 of 274')])).toEqual([]);
  });

  it('ignores errands, which have no step', () => {
    const look = stepWatcher();
    look([line('market')]);
    expect(look([line('market')])).toEqual([]);
  });

  it('a finished road counts as a move', () => {
    const look = stepWatcher();
    look([line('morse', 'Step 74 of 74')]);
    expect(look([line('morse', 'The Silent Beacon: the road is walked')])).toEqual(['morse']);
  });
});
