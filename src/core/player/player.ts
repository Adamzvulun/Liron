import { useSyncExternalStore } from 'react';
import type { Award, DayResult, ProgressStore, Today, Wallet } from '../progress/store.ts';

/** What the level-up card shows. Several level-ups before it's dismissed merge into one. */
export type LevelUpInfo = Pick<
  Award,
  'level' | 'levelBefore' | 'xpEarned' | 'goldEarned' | 'gemsEarned'
>;

export interface PlayerState {
  /** null while loading. */
  wallet: Wallet | null;
  today: Today | null;
  error: string | null;
  /** The level-up waiting to be celebrated, if any. */
  levelUp: LevelUpInfo | null;
  /** The daily goal just reached, waiting to be celebrated, if any. */
  goalReached: DayResult | null;
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
    error: null,
    levelUp: null,
    goalReached: null,
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
        const [wallet, today] = await Promise.all([store.wallet(), store.today()]);
        set({ wallet, today, error: null });
      } catch (e) {
        fail(e);
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
