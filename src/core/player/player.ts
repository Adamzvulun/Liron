import { useSyncExternalStore } from 'react';
import { DEFAULT_LOOK, type Look } from '../avatar/looks.ts';
import {
  MAX_NAME_LENGTH,
  type Award,
  type DayResult,
  type Profile,
  type ProgressStore,
  type Today,
  type TodaysContracts,
  type Wallet,
} from '../progress/store.ts';

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
        // The day follows the browser's time zone. If saving it fails, the last one still works.
        await store.setTimeZone(timeZone()).catch(() => {});
        const [wallet, today, profile] = await Promise.all([
          store.wallet(),
          store.today(),
          store.profile(),
        ]);
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
      } catch {
        // Shown again on the next move.
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
      set({ profile: { ...(before ?? { avatar: DEFAULT_LOOK }), displayName: clean } });
      try {
        await store.setDisplayName(clean);
        return true;
      } catch {
        set({ profile: before });
        return false;
      }
    },
    /** Saves the avatar's look (#29). Returns false, keeping the old look, if it couldn't. */
    async setAvatar(look: Look): Promise<boolean> {
      const before = state.profile;
      set({ profile: { ...(before ?? { displayName: '' }), avatar: look } });
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
