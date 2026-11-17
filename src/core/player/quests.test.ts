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

  it('shows a guild’s compass in place of its plain line, in the compass’s order', () => {
    const inn: SubjectInfo = { ...tower, id: 'inn', place: 'The Inn', building: 'caravanserai' };
    const line = (subject: string, giver: string, extra = {}) => ({
      subject,
      giver,
      color: 'red',
      href: `/${subject}?open=door`,
      text: `Do the next thing at ${giver}.`,
      progress: 'Step 3 of 74',
      quiet: false,
      started: true,
      ...extra,
    });
    const quests = todaysQuests([tower, inn], 15, [
      line('inn', 'The Inn', { waiting: 'The road goes on tomorrow: Milestone 2.' }),
      line('beacon', 'Beacon Hall', { quiet: true }),
    ]);
    expect(quests.slice(0, 2)).toEqual([
      {
        key: 'inn',
        giver: 'The Inn',
        text: 'Do the next thing at The Inn.',
        progress: 'Step 3 of 74',
        note: 'The road goes on tomorrow: Milestone 2.',
        href: '/inn?open=door',
        color: 'red',
      },
      {
        key: 'beacon',
        giver: 'Beacon Hall',
        text: 'Do the next thing at Beacon Hall.',
        progress: 'Step 3 of 74',
        quiet: true,
        href: '/beacon?open=door',
        color: 'red',
      },
    ]);
    // A guild whose road isn't loaded keeps its plain line, after the compass.
    expect(todaysQuests([tower, inn], 15, [line('inn', 'The Inn')]).map((q) => q.giver)).toEqual([
      'The Inn',
      'Beacon Hall',
      'Daily goal',
    ]);
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
