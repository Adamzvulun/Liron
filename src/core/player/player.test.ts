import { describe, expect, it } from 'vitest';
import { memoryStore } from '../progress/store.ts';
import { subjectApi } from '../progress/subjectApi.ts';
import { createPlayer } from './player.ts';

describe('player', () => {
  it('loads the wallet, follows awards and holds a level-up until it is dismissed', async () => {
    const store = memoryStore();
    const player = createPlayer(store, () => 'Asia/Jerusalem');
    let changes = 0;
    player.subscribe(() => changes++);
    await player.load();
    expect(player.getSnapshot()).toMatchObject({
      wallet: { xp: 0, gold: 0, gems: 0 },
      today: { minutes: 0, goalMinutes: 15, goalReached: false, streak: 0 },
      error: null,
      levelUp: null,
      goalReached: null,
    });

    const morse = subjectApi({ id: 'morse' }, store, player.applyAward);
    await morse.awardXP(10);
    expect(player.getSnapshot().levelUp).toBeNull();
    await morse.awardXP(40); // 50 XP: level 3
    await morse.awardXP(5); // no level-up: the celebration stays, covering levels 1 -> 3
    const s = player.getSnapshot();
    expect(s.wallet?.xp).toBe(55);
    expect(s.levelUp).toMatchObject({ levelBefore: 1, level: 3 });
    player.dismissLevelUp();
    expect(player.getSnapshot().levelUp).toBeNull();
    expect(changes).toBe(5);
  });

  it('merges two level-ups that arrive before the first is celebrated', async () => {
    const store = memoryStore();
    const player = createPlayer(store);
    const morse = subjectApi({ id: 'morse' }, store, player.applyAward);
    await morse.awardXP(20); // level 2: 4 + 10 gold
    await morse.awardXP(120); // level 5: 24 + 15 + 20 + 25 gold, 1 gem
    expect(player.getSnapshot().levelUp).toMatchObject({
      levelBefore: 1,
      level: 5,
      xpEarned: 140,
      goldEarned: 98,
      gemsEarned: 1,
    });
  });

  it('reports a wallet that fails to load', async () => {
    const store = { ...memoryStore(), wallet: () => Promise.reject(new Error('offline')) };
    // A failing time-zone save doesn't block loading.
    store.setTimeZone = () => Promise.reject(new Error('ignored'));
    const player = createPlayer(store);
    await player.load();
    expect(player.getSnapshot()).toMatchObject({ wallet: null, error: 'offline' });
  });

  it('celebrates the daily goal once, follows the streak and lets the goal change', async () => {
    const store = memoryStore({ today: () => '2026-11-02' });
    const player = createPlayer(store);
    await player.load();
    const morse = subjectApi({ id: 'morse' }, store, player.applyAward);

    await morse.recordPractice(10);
    expect(player.getSnapshot().goalReached).toBeNull();
    await morse.recordPractice(5);
    expect(player.getSnapshot().goalReached).toMatchObject({
      day: '2026-11-02',
      minutes: 15,
      goalReachedNow: true,
      streak: 1,
      chestGold: 20,
      chestGems: 0,
    });
    player.dismissGoal();
    await morse.recordPractice(5); // already reached today: no second chest
    expect(player.getSnapshot().goalReached).toBeNull();
    expect(player.getSnapshot().wallet?.gold).toBe(20);

    // Six more goal days: the 7th day's chest holds a gem.
    for (let d = 2; d <= 7; d++) {
      store.travel(1);
      await morse.recordPractice(15);
    }
    expect(player.getSnapshot().today?.streak).toBe(7);
    expect(player.getSnapshot().goalReached).toMatchObject({ chestGems: 1 });

    // Lowering the goal below today's minutes reaches it at once.
    store.travel(1);
    await morse.recordPractice(6);
    await player.setDailyGoal(5);
    expect(player.getSnapshot().today).toMatchObject({
      goalMinutes: 5,
      goalReached: true,
      streak: 8,
    });

    // Missing a day resets the streak.
    store.travel(2);
    await player.load();
    expect(player.getSnapshot().today?.streak).toBe(0);
  });
});

describe('the player’s name', () => {
  it('loads with the profile, saves trimmed, and refuses names over 40 characters', async () => {
    const store = memoryStore();
    await store.setDisplayName('Adam');
    const player = createPlayer(store, () => 'UTC');
    await player.load();
    expect(player.getSnapshot().profile).toEqual({ displayName: 'Adam' });
    expect(await player.setDisplayName('  Adam   Zvulun ')).toBe(true);
    expect(player.getSnapshot().profile).toEqual({ displayName: 'Adam Zvulun' });
    expect(await store.profile()).toEqual({ displayName: 'Adam Zvulun' });
    expect(await player.setDisplayName('x'.repeat(41))).toBe(false);
    expect(player.getSnapshot().profile).toEqual({ displayName: 'Adam Zvulun' });
  });

  it('puts the old name back if saving fails', async () => {
    const store = memoryStore();
    const player = createPlayer(
      { ...store, setDisplayName: () => Promise.reject(new Error('offline')) },
      () => 'UTC',
    );
    await player.load();
    expect(await player.setDisplayName('Adam')).toBe(false);
    expect(player.getSnapshot().profile).toEqual({ displayName: '' });
  });
});
