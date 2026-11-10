import { useSyncExternalStore } from 'react';
import { DEFAULT_LOOK, type Look } from '../avatar/looks.ts';
import {
  MAX_NAME_LENGTH,
  type Award,
  type Chest,
  type ChestContents,
  type DayResult,
  type MarketStall,
  type Profile,
  type ProgressStore,
  type Today,
  type TodaysContracts,
  type Wallet,
} from '../progress/store.ts';
import type { MyAchievements } from '../achievements/achievements.ts';

/** What the level-up card shows. Several level-ups before it's dismissed merge into one. */
export type LevelUpInfo = Pick<
  Award,
  'level' | 'levelBefore' | 'xpEarned' | 'goldEarned' | 'gemsEarned'
>;

export interface PlayerState {
  /** null while loading. */
  wallet: Wallet | null;
  today: Today | null;
  profile: Profile | null;
  error: string | null;
  /** The level-up waiting to be celebrated, if any. */
  levelUp: LevelUpInfo | null;
  /** The daily goal just reached, waiting to be celebrated, if any. */
  goalReached: DayResult | null;
  /** Today's contracts (ADR 0032); null until loaded. */
  contracts: TodaysContracts | null;
  /** Unopened chests (ADR 0033), oldest first; empty until loaded. */
  chests: Chest[];
  /** Today's Market stall (#49); null until the Market is visited. */
  market: MarketStall | null;
  /** The player's achievements (#177); null until Your House is visited. */
  achievements: MyAchievements | null;
}

/** The browser's time zone, e.g. "Asia/Jerusalem". */
export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * The signed-in player's wallet, day and streak, kept current as awards come in. The platform
 * passes `applyAward` to every subject's API (ADR 0019), so the HUD updates and level-ups and
 * daily goals are celebrated wherever they happen.
 */
export function createPlayer(store: ProgressStore, timeZone: () => string = browserTimeZone) {
  let state: PlayerState = {
    wallet: null,
    today: null,
    profile: null,
    error: null,
    levelUp: null,
    goalReached: null,
    contracts: null,
    chests: [],
    market: null,
    achievements: null,
  };
  const listeners = new Set<() => void>();
  const set = (next: Partial<PlayerState>) => {
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  };
  const fail = (e: unknown) => set({ error: (e as Error).message });
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    async load() {
      try {
        // The day follows the browser's time zone, so today waits for it (if saving it fails,
        // the last one still works). The wallet and profile don't: they load meanwhile (#137).
        const [wallet, today, profile] = await Promise.all([
          store.wallet(),
          store
            .setTimeZone(timeZone())
            .catch(() => {})
            .then(() => store.today()),
          store.profile(),
        ]);
        // Contracts may have paid gold while this loaded; their purse is the newer one.
        if (state.contracts) wallet.gold = state.contracts.gold;
        set({ wallet, today, profile, error: null });
      } catch (e) {
        fail(e);
      }
    },
    /**
     * Loads today's contracts; finished ones are paid on the way, so the purse follows. A
     * failure leaves the board as it was: contracts never block the rest of the game.
     */
    async loadContracts() {
      try {
        const contracts = await store.todaysContracts();
        set({
          contracts,
          wallet: state.wallet ? { ...state.wallet, gold: contracts.gold } : state.wallet,
        });
        // Claiming contracts also grants any chests now earned (ADR 0033).
        set({ chests: await store.chests() });
      } catch {
        // Shown again on the next move.
      }
    },
    /**
     * Opens a chest: the database rolls and pays it. The purse, shields and wardrobe follow,
     * and the chest leaves the shelf. Returns what it held, or null if it couldn't be opened.
     */
    async openChest(id: string): Promise<ChestContents | null> {
      try {
        const c = await store.openChest(id);
        const next: Partial<PlayerState> = { chests: state.chests.filter((x) => x.id !== id) };
        if (c.wallet) {
          if (state.wallet) {
            next.wallet = { ...state.wallet, gold: c.wallet.gold, gems: c.wallet.gems };
          }
          if (state.today) next.today = { ...state.today, shields: c.wallet.shields };
        }
        if (c.item && !c.itemGold && state.profile && !state.profile.owned.includes(c.item)) {
          next.profile = { ...state.profile, owned: [...state.profile.owned, c.item] };
        }
        set(next);
        return c;
      } catch (e) {
        fail(e);
        return null;
      }
    },
    /** Reads today's Market stall. A failure leaves the stall as it was. */
    async loadMarket() {
      try {
        set({ market: await store.market() });
      } catch (e) {
        fail(e);
      }
    },
    /**
     * Buys one of today's wares: the database takes the gold and gives the item. The purse,
     * shields and wardrobe follow. Returns null, or why it couldn't be bought.
     */
    async buy(id: string): Promise<string | null> {
      const ware = state.market?.wares.find((w) => w.id === id);
      try {
        const w = await store.buyItem(id);
        const next: Partial<PlayerState> = {};
        if (state.wallet) next.wallet = { ...state.wallet, gold: w.gold, gems: w.gems };
        if (state.today) next.today = { ...state.today, shields: w.shields };
        if (ware?.kind !== 'functional' && state.profile && !state.profile.owned.includes(id)) {
          next.profile = { ...state.profile, owned: [...state.profile.owned, id] };
        }
        if (state.market) {
          next.market = {
            ...state.market,
            wares: state.market.wares.map((x) => ({
              ...x,
              owned: x.id === id ? x.kind !== 'functional' || w.shields >= 2 : x.owned,
              affordable: w.gold >= x.price,
            })),
          };
        }
        set(next);
        return null;
      } catch (e) {
        const m = (e as Error).message;
        if (/too little gold/.test(m)) return 'Not enough gold yet.';
        if (/already owned/.test(m)) return 'You already have this.';
        if (/not for sale today/.test(m)) return 'That’s gone; the stall has new wares today.';
        return m;
      }
    },
    applyAward(award: Award) {
      const wallet = { xp: award.xp, gold: award.gold, gems: award.gems };
      // An uncelebrated level-up stays until it's dismissed; a second one merges into it.
      const prev = state.levelUp;
      let levelUp = prev;
      if (award.level > award.levelBefore) {
        levelUp = prev
          ? {
              level: award.level,
              levelBefore: prev.levelBefore,
              xpEarned: prev.xpEarned + award.xpEarned,
              goldEarned: prev.goldEarned + award.goldEarned,
              gemsEarned: prev.gemsEarned + award.gemsEarned,
            }
          : award;
      }
      set({
        wallet,
        today: award.today,
        levelUp,
        goalReached: award.today.goalReachedNow ? award.today : state.goalReached,
      });
    },
    async setDailyGoal(minutes: number) {
      try {
        const { wallet, today } = await store.setDailyGoal(minutes);
        set({ wallet, today, goalReached: today.goalReachedNow ? today : state.goalReached });
      } catch (e) {
        fail(e);
      }
    },
    /** Saves the player's name (trimmed, at most 40 characters). Returns false if refused. */
    async setDisplayName(name: string): Promise<boolean> {
      const clean = name.trim().replace(/\s+/g, ' ');
      if (clean.length > MAX_NAME_LENGTH) return false;
      const before = state.profile;
      set({
        profile: {
          ...(before ?? { avatar: DEFAULT_LOOK, owned: [], title: '' }),
          displayName: clean,
        },
      });
      try {
        await store.setDisplayName(clean);
        return true;
      } catch {
        set({ profile: before });
        return false;
      }
    },
    /** Reads the achievements; any just met are given, and the gems they paid show at once. */
    async loadAchievements() {
      try {
        const achievements = await store.achievements();
        set({
          achievements,
          wallet: state.wallet && { ...state.wallet, gems: achievements.gems },
          profile: state.profile && { ...state.profile, title: achievements.title },
        });
      } catch {
        // Your House still works without them; the wall says it couldn't load.
        set({ achievements: null });
      }
    },
    /** Wears an earned title, or none with ''. Returns false, keeping the old one, if refused. */
    async setTitle(title: string): Promise<boolean> {
      const before = state.profile;
      if (before) set({ profile: { ...before, title } });
      try {
        await store.setTitle(title);
        return true;
      } catch {
        set({ profile: before });
        return false;
      }
    },
    /** Saves the avatar's look (#29). Returns false, keeping the old look, if it couldn't. */
    async setAvatar(look: Look): Promise<boolean> {
      const before = state.profile;
      set({ profile: { ...(before ?? { displayName: '', owned: [], title: '' }), avatar: look } });
      try {
        await store.setAvatar(look);
        return true;
      } catch {
        set({ profile: before });
        return false;
      }
    },
    dismissLevelUp() {
      set({ levelUp: null });
    },
    dismissGoal() {
      set({ goalReached: null });
    },
  };
}

export type Player = ReturnType<typeof createPlayer>;

export function usePlayer(player: Player): PlayerState {
  return useSyncExternalStore(player.subscribe, player.getSnapshot);
}
