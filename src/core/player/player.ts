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
  // Purchases and chests can overlap. Each takes a ticket, and an older one's purse that
  // answers late doesn't overwrite a newer one's (the database's purse is always right).
  // Loading the wallet and the contracts take tickets too: a purse read before a purchase must
  // not undo it (review, 2026-11-19). `newestGold` is the purse last shown.
  let purseTicket = 0;
  let purseShown = 0;
  let newestGold: number | null = null;
  const newerPurse = (ticket: number, gold: number) => {
    if (ticket < purseShown) return false;
    purseShown = ticket;
    newestGold = gold;
    return true;
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    async load() {
      const ticket = ++purseTicket;
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
        // Contracts, a purchase or a chest may have moved the purse while this loaded.
        if (!newerPurse(ticket, wallet.gold) && newestGold !== null) wallet.gold = newestGold;
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
      const ticket = ++purseTicket;
      try {
        const contracts = await store.todaysContracts();
        const newer = newerPurse(ticket, contracts.gold);
        set({
          contracts,
          wallet: state.wallet && newer ? { ...state.wallet, gold: contracts.gold } : state.wallet,
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
      const ticket = ++purseTicket;
      try {
        const c = await store.openChest(id);
        const next: Partial<PlayerState> = { chests: state.chests.filter((x) => x.id !== id) };
        if (c.wallet && newerPurse(ticket, c.wallet.gold)) {
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
      } catch {
        // The shelf says it couldn't; the rest of the game carries on.
        return null;
      }
    },
    /**
     * Reads today's Market stall. Resolves false if it couldn't, leaving the stall as it was:
     * the Market says so and offers to try again, and the rest of the game carries on.
     */
    async loadMarket(): Promise<boolean> {
      try {
        set({ market: await store.market() });
        return true;
      } catch {
        return false;
      }
    },
    /**
     * Buys one of today's wares: the database takes the gold and gives the item. The purse,
     * shields and wardrobe follow. Returns null, or why it couldn't be bought.
     */
    async buy(id: string): Promise<string | null> {
      const ware = state.market?.wares.find((w) => w.id === id);
      const ticket = ++purseTicket;
      try {
        const w = await store.buyItem(id);
        const next: Partial<PlayerState> = {};
        const newer = newerPurse(ticket, w.gold);
        if (state.wallet && newer) next.wallet = { ...state.wallet, gold: w.gold, gems: w.gems };
        if (state.today && newer) next.today = { ...state.today, shields: w.shields };
        if (ware?.kind !== 'functional' && state.profile && !state.profile.owned.includes(id)) {
          next.profile = { ...state.profile, owned: [...state.profile.owned, id] };
        }
        const gold = newer ? w.gold : (state.wallet?.gold ?? w.gold);
        if (state.market) {
          next.market = {
            ...state.market,
            wares: state.market.wares.map((x) => ({
              ...x,
              owned: x.id === id ? x.kind !== 'functional' || w.shields >= 2 : x.owned,
              affordable: gold >= x.price,
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
    /**
     * Opens the roof (task 8.4): the database takes the gems and gives an empty roof. The purse
     * follows. Returns null, or why it couldn't be opened.
     */
    async openRoof(): Promise<string | null> {
      const ticket = ++purseTicket;
      try {
        const w = await store.openRoof();
        if (state.wallet && newerPurse(ticket, w.gold))
          set({ wallet: { ...state.wallet, gold: w.gold, gems: w.gems } });
        return null;
      } catch (e) {
        const m = (e as Error).message;
        if (/too few gems/.test(m)) return 'Not enough gems yet.';
        if (/already open/.test(m)) return null;
        return m;
      }
    },
    applyAward(award: Award) {
      // A save's purse is shown as it comes, but takes no ticket: a purchase or chest already on
      // its way most likely reached the database after the save, so its purse still wins when it
      // answers (third review, 2026-11-19).
      newestGold = award.gold;
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
    /** Sets the daily goal. Resolves false, keeping the old goal, if it couldn't be saved. */
    async setDailyGoal(minutes: number): Promise<boolean> {
      try {
        const { wallet, today } = await store.setDailyGoal(minutes);
        set({ wallet, today, goalReached: today.goalReachedNow ? today : state.goalReached });
        return true;
      } catch {
        return false;
      }
    },
    /** Saves the player's name (trimmed, at most 40 characters). Returns false if refused. */
    async setDisplayName(name: string): Promise<boolean> {
      const clean = name.trim().replace(/\s+/g, ' ');
      if (clean.length > MAX_NAME_LENGTH) return false;
      const before = state.profile;
      set({
        profile: {
          ...(before ?? { avatar: DEFAULT_LOOK, owned: [], title: '', guideSeen: [] }),
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
    /**
     * Reads the achievements; any just met are given, and the gems they paid show at once.
     * Resolves false if they couldn't be read, keeping what was shown.
     */
    async loadAchievements(): Promise<boolean> {
      try {
        const achievements = await store.achievements();
        set({
          achievements,
          wallet: state.wallet && { ...state.wallet, gems: achievements.gems },
          profile: state.profile && { ...state.profile, title: achievements.title },
        });
        return true;
      } catch {
        // Your House still works without them; the wall says it couldn't load.
        return false;
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
    /**
     * Remembers that the guide has shown these lines (the-guide.md §4, #407). Shown at once and
     * kept for this visit even if saving fails: at worst a line shows once more next time, and
     * the screen never waits for it.
     */
    async markGuideSeen(ids: readonly string[]): Promise<void> {
      const before = state.profile;
      const fresh = ids.filter((id) => !before?.guideSeen.includes(id));
      if (!before || fresh.length === 0) return;
      set({ profile: { ...before, guideSeen: [...before.guideSeen, ...fresh] } });
      try {
        await store.markGuideSeen(fresh);
      } catch {
        // Kept in memory; the next visit may show it again.
      }
    },
    /** Saves the avatar's look (#29). Returns false, keeping the old look, if it couldn't. */
    async setAvatar(look: Look): Promise<boolean> {
      const before = state.profile;
      set({
        profile: {
          ...(before ?? { displayName: '', owned: [], title: '', guideSeen: [] }),
          avatar: look,
        },
      });
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
    /**
     * Shows the purse the database returned after paying or spending elsewhere: a Fellowship
     * quest collected, a gift given (task 3.5). Call `purse()` before the request, so a slow
     * answer doesn't overwrite a newer purse.
     */
    purse() {
      const ticket = ++purseTicket;
      return (gold: number) => {
        if (!newerPurse(ticket, gold) || !state.wallet) return;
        set({
          wallet: { ...state.wallet, gold },
          market: state.market && {
            ...state.market,
            wares: state.market.wares.map((x) => ({ ...x, affordable: gold >= x.price })),
          },
        });
      };
    },
  };
}

export type Player = ReturnType<typeof createPlayer>;

export function usePlayer(player: Player): PlayerState {
  return useSyncExternalStore(player.subscribe, player.getSnapshot);
}
