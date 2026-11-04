import { describe, expect, it } from 'vitest';
import type { SubjectInfo } from '../subject.ts';
import { todaysQuests } from './quests.ts';

const tower: SubjectInfo = {
  id: 'beacon',
  place: 'Beacon Hall',
  tagline: 't',
  guildColor: 'red',
  building: 'tower',
  quest: { text: 'Light the beacon', script: { text: 'שלום', lang: 'he', dir: 'rtl' } },
};

describe("today's quests (ADR 0019)", () => {
  it('lists each subject’s own line, linked to its building, then the daily contract', () => {
    const quests = todaysQuests([tower], 15);
    expect(quests).toEqual([
      {
        giver: 'Beacon Hall',
        text: 'Light the beacon',
        script: { text: 'שלום', lang: 'he', dir: 'rtl' },
        href: '/signal-tower',
        color: 'red',
      },
      expect.objectContaining({ giver: 'Daily contract', reward: 'The daily chest' }),
    ]);
  });

  it('promises no reward for a subject line, and skips subjects with no line or building', () => {
    const quests = todaysQuests(
      [tower, { ...tower, id: 'quiet', quest: undefined }, { ...tower, building: undefined }],
      10,
    );
    expect(quests).toHaveLength(2);
    expect(quests[0]?.reward).toBeUndefined();
  });
});
