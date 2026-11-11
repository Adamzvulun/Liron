import { describe, expect, it } from 'vitest';
import type { SubjectInfo } from '../subject.ts';
import { contractQuests, shieldNote, todaysQuests } from './quests.ts';

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
      expect.objectContaining({ giver: 'Daily goal', reward: 'The daily chest' }),
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

  it('tracks a started questline in place of its plain line (#47)', () => {
    const status = {
      questline: 'The Silent Beacon',
      chapter: 'Chapter 1: Embers',
      done: 8,
      total: 8,
      unit: 'lamps',
      next: 'Trial: The Gatekeeper',
    };
    const [line] = todaysQuests([tower], 15, new Map([['beacon', status]]));
    expect(line).toEqual({
      giver: 'Beacon Hall',
      text: 'The Silent Beacon, Chapter 1: Embers',
      progress: '8/8 lamps · Trial: The Gatekeeper',
      href: '/signal-tower',
      color: 'red',
    });
    const [plain] = todaysQuests(
      [tower],
      15,
      new Map([['beacon', { ...status, next: undefined }]]),
    );
    expect(plain?.progress).toBe('8/8 lamps');
  });

  it("lists each of today's contracts on the board, and a summary in the HUD (#46)", () => {
    const today = {
      day: '2026-11-09',
      gold: 50,
      paidNow: [],
      contracts: [
        {
          id: 'habit',
          subject: null,
          text: 'Finish 3 sessions today',
          progress: 1,
          target: 3,
          gold: 10,
          paid: false,
        },
        {
          id: 'b1',
          subject: 'beacon',
          text: 'Light it',
          progress: 1,
          target: 1,
          gold: 20,
          paid: true,
        },
      ],
    };
    expect(contractQuests([tower], today, true)).toEqual([
      expect.objectContaining({
        key: 'habit',
        giver: 'Habit contract',
        progress: '1/3',
        reward: '10 gold',
        href: '/notice-board',
        done: false,
      }),
      expect.objectContaining({
        key: 'b1',
        giver: 'Beacon Hall contract',
        progress: 'Done',
        href: '/signal-tower',
        color: 'red',
        done: true,
      }),
    ]);
    expect(contractQuests([tower], today, false)).toEqual([
      expect.objectContaining({ text: '1 of 2 done today', reward: '10 gold left to earn' }),
    ]);
    expect(contractQuests([tower], null, false)).toEqual([]);
  });

  it('says when a streak shield saved the streak (ADR 0034)', () => {
    expect(shieldNote({ streak: 12, shieldedDays: 0 })).toBeNull();
    expect(shieldNote({ streak: 12, shieldedDays: 1 })).toBe(
      'A streak shield saved your 12-day streak',
    );
    expect(shieldNote({ streak: 5, shieldedDays: 2 })).toBe(
      '2 streak shields saved your 5-day streak',
    );
  });
});
