import { describe, expect, it } from 'vitest';
import { memoryStore } from '../progress/store.ts';
import { subjectApi } from '../progress/subjectApi.ts';
import { createPlayer } from './player.ts';

describe('player', () => {
  it('loads the wallet, follows awards and holds a level-up until it is dismissed', async () => {
    const store = memoryStore();
    const player = createPlayer(store);
    let changes = 0;
    player.subscribe(() => changes++);
    await player.load();
    expect(player.getSnapshot()).toEqual({
      wallet: { xp: 0, gold: 0, gems: 0 },
      error: null,
      levelUp: null,
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
    const player = createPlayer(store);
    await player.load();
    expect(player.getSnapshot()).toMatchObject({ wallet: null, error: 'offline' });
  });
});
