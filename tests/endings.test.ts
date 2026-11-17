import { describe, expect, it } from 'vitest';
import { ARABIC_BEFORE_FINALE, endingsSql, MORSE_BEFORE_FINALE } from '../scripts/endings.ts';
import { morseRoad } from '../src/subjects/morse/road.ts';
import { arabicRoad } from '../src/subjects/arabic/road.ts';

// v3.0's prepared test account (VERSIONS.md): its saved progress stands one step before each
// finale, so the compass on the dev site points straight at it.
const ctx = { today: '2027-03-01', partner: 'ready' as const, licensee: true, due: 0 };

describe('the prepared account for the endings', () => {
  it('stands at Forty Winters, the last step of the Silent Beacon', () => {
    const a = morseRoad(MORSE_BEFORE_FINALE, ctx);
    expect(a.now).toMatchObject({ kind: 'step', step: { id: 'forty-winters' } });
    expect(a.position?.index).toBe(a.steps - 1);
  });

  it('stands at The Stranger at the Gate, the last step of the Long Road In', () => {
    const a = arabicRoad(ARABIC_BEFORE_FINALE, ctx);
    expect(a.now).toMatchObject({ kind: 'step', step: { id: 'stranger-at-the-gate' } });
    expect(a.position?.index).toBe(a.steps - 1);
  });

  it('writes SQL for one account, quoted', () => {
    const sql = endingsSql("o'neil@example.com");
    expect(sql).toContain("where email = 'o''neil@example.com'");
    expect(sql.match(/insert into public\.subject_progress/g)).toHaveLength(2);
    expect(sql).toContain('DEV PROJECT ONLY');
  });
});
