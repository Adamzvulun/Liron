import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK } from '../avatar/looks.ts';
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

describe('loading at once (#137)', () => {
  it('keeps the contracts’ purse when they answer before the wallet', async () => {
    let answerWallet = () => {};
    const base = memoryStore();
    const store = {
      ...base,
      // The wallet answers last, with gold read before the contracts paid.
      wallet: () =>
        new Promise<Awaited<ReturnType<typeof base.wallet>>>((res) => {
          answerWallet = () => void base.wallet().then((w) => res({ ...w, gold: 5 }));
        }),
      todaysContracts: async () => ({ day: 'd', contracts: [], paidNow: [], gold: 35 }),
    };
    const player = createPlayer(store, () => 'UTC');
    const loading = player.load();
    await player.loadContracts();
    answerWallet();
    await loading;
    expect(player.getSnapshot().wallet?.gold).toBe(35);
  });
});

describe('the player’s chests (ADR 0033)', () => {
  it('loads chests with the contracts, and opening one pays it and takes it off the shelf', async () => {
    const chest = { id: 'c1', kind: 'brass', source: 'trial' as const, sourceKey: 'morse:1' };
    const base = memoryStore();
    const store = {
      ...base,
      chests: async () => [chest],
      openChest: async () => ({
        kind: 'brass',
        gold: 50,
        gems: 1,
        item: 'cloak',
        itemGold: 0,
        shield: true,
        shieldGold: 0,
        wallet: { gold: 50, gems: 1, shields: 1 },
      }),
    };
    const player = createPlayer(store, () => 'UTC');
    await player.load();
    await player.loadContracts();
    expect(player.getSnapshot().chests).toEqual([chest]);
    const contents = await player.openChest('c1');
    expect(contents).toMatchObject({ gold: 50, item: 'cloak' });
    const s = player.getSnapshot();
    expect(s.chests).toEqual([]);
    expect(s.wallet).toMatchObject({ gold: 50, gems: 1 });
    expect(s.today?.shields).toBe(1);
    expect(s.profile?.owned).toEqual(['cloak']);
  });

  it('reports a chest that fails to open and keeps it on the shelf', async () => {
    const chest = { id: 'c1', kind: 'wooden', source: 'contracts' as const, sourceKey: 'd' };
    const store = { ...memoryStore(), chests: async () => [chest] };
    const player = createPlayer(store, () => 'UTC');
    await player.load();
    await player.loadContracts();
    expect(await player.openChest('c1')).toBeNull();
    expect(player.getSnapshot()).toMatchObject({ chests: [chest], error: expect.any(String) });
  });
});

describe('the Market (#49)', () => {
  const ware = (id: string, kind: 'gear' | 'functional', price: number) => ({
    id,
    kind,
    slot: kind === 'gear' ? 'head' : null,
    rarity: 'common',
    price,
    owned: false,
    affordable: true,
  });
  const stall = {
    day: '2026-11-09',
    wares: [ware('tarboosh', 'gear', 60), ware('streak-shield', 'functional', 120)],
  };

  it('buys a ware: the purse, the wardrobe and the stall follow', async () => {
    const store = {
      ...memoryStore(),
      market: async () => stall,
      buyItem: async () => ({ gold: 70, gems: 0, shields: 0 }),
    };
    const player = createPlayer(store, () => 'UTC');
    await player.load();
    await player.loadMarket();
    expect(await player.buy('tarboosh')).toBeNull();
    const s = player.getSnapshot();
    expect(s.wallet?.gold).toBe(70);
    expect(s.profile?.owned).toEqual(['tarboosh']);
    expect(s.market?.wares.map((w) => [w.id, w.owned, w.affordable])).toEqual([
      ['tarboosh', true, true],
      ['streak-shield', false, false],
    ]);
  });

  it('says plainly why a ware could not be bought', async () => {
    const store = {
      ...memoryStore(),
      market: async () => stall,
      buyItem: async () => {
        throw new Error('Couldn’t buy it: too little gold');
      },
    };
    const player = createPlayer(store, () => 'UTC');
    await player.load();
    await player.loadMarket();
    expect(await player.buy('tarboosh')).toBe('Not enough gold yet.');
    expect(player.getSnapshot().profile?.owned).toEqual([]);
  });
});

describe('the player’s name', () => {
  it('loads with the profile, saves trimmed, and refuses names over 40 characters', async () => {
    const store = memoryStore();
    await store.setDisplayName('Adam');
    const player = createPlayer(store, () => 'UTC');
    await player.load();
    expect(player.getSnapshot().profile).toEqual({
      displayName: 'Adam',
      avatar: DEFAULT_LOOK,
      owned: [],
    });
    expect(await player.setDisplayName('  Adam   Zvulun ')).toBe(true);
    expect(player.getSnapshot().profile).toEqual({
      displayName: 'Adam Zvulun',
      avatar: DEFAULT_LOOK,
      owned: [],
    });
    expect(await store.profile()).toEqual({
      displayName: 'Adam Zvulun',
      avatar: DEFAULT_LOOK,
      owned: [],
    });
    expect(await player.setDisplayName('x'.repeat(41))).toBe(false);
    expect(player.getSnapshot().profile).toEqual({
      displayName: 'Adam Zvulun',
      avatar: DEFAULT_LOOK,
      owned: [],
    });
  });

  it('puts the old name back if saving fails', async () => {
    const store = memoryStore();
    const player = createPlayer(
      { ...store, setDisplayName: () => Promise.reject(new Error('offline')) },
      () => 'UTC',
    );
    await player.load();
    expect(await player.setDisplayName('Adam')).toBe(false);
    expect(player.getSnapshot().profile).toEqual({
      displayName: '',
      avatar: DEFAULT_LOOK,
      owned: [],
    });
  });
});

describe('the player’s look', () => {
  it('saves a new look and keeps the old one if saving fails', async () => {
    const store = memoryStore();
    const player = createPlayer(store, () => 'UTC');
    await player.load();
    const look = { ...DEFAULT_LOOK, hair: 'curly' as const };
    expect(await player.setAvatar(look)).toBe(true);
    expect((await store.profile()).avatar).toEqual(look);

    const offline = createPlayer(
      { ...store, setAvatar: () => Promise.reject(new Error('offline')) },
      () => 'UTC',
    );
    await offline.load();
    expect(await offline.setAvatar(DEFAULT_LOOK)).toBe(false);
    expect(offline.getSnapshot().profile?.avatar).toEqual(look);
  });
});
