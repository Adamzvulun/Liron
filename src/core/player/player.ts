import { useSyncExternalStore } from 'react';
import type { Award, ProgressStore, Wallet } from '../progress/store.ts';

export interface PlayerState {
  /** null while loading. */
  wallet: Wallet | null;
  error: string | null;
  /** The level-up waiting to be celebrated, if any. */
  levelUp: Award | null;
}

/**
 * The signed-in player's wallet, kept current as awards come in. The platform passes
 * `applyAward` to every subject's API (ADR 0019), so the HUD updates and level-ups are
 * celebrated wherever XP is earned.
 */
export function createPlayer(store: ProgressStore) {
  let state: PlayerState = { wallet: null, error: null, levelUp: null };
  const listeners = new Set<() => void>();
  const set = (next: Partial<PlayerState>) => {
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    async load() {
      try {
        set({ wallet: await store.wallet(), error: null });
      } catch (e) {
        set({ error: (e as Error).message });
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
              ...award,
              levelBefore: prev.levelBefore,
              xpEarned: prev.xpEarned + award.xpEarned,
              goldEarned: prev.goldEarned + award.goldEarned,
              gemsEarned: prev.gemsEarned + award.gemsEarned,
            }
          : award;
      }
      set({ wallet, levelUp });
    },
    dismissLevelUp() {
      set({ levelUp: null });
    },
  };
}

export type Player = ReturnType<typeof createPlayer>;

export function usePlayer(player: Player): PlayerState {
  return useSyncExternalStore(player.subscribe, player.getSnapshot);
}
