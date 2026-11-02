import type { SubjectProgress } from '../subject.ts';
import { levelForXp, rewardsFor } from './economy.ts';

/** The player's XP and currencies. */
export interface Wallet {
  xp: number;
  gold: number;
  gems: number;
}

/** What one recorded award did: the wallet afterwards, what was earned, and any level-up. */
export interface Award extends Wallet {
  xpEarned: number;
  goldEarned: number;
  gemsEarned: number;
  levelBefore: number;
  level: number;
}

/** Where progress is kept. Supabase in the app, memory in tests. Not used by subjects directly. */
export interface ProgressStore {
  /** Adds XP and minutes to a subject, to today and to the wallet, and pays gold and gems. */
  record(subjectId: string, xp: number, minutes: number): Promise<Award>;
  wallet(): Promise<Wallet>;
  summary(subjectId: string): Promise<SubjectProgress>;
  loadState(subjectId: string): Promise<object | null>;
  saveState(subjectId: string, state: object): Promise<void>;
}

/** An in-memory store with the same rules as the database, for tests. */
export function memoryStore(): ProgressStore {
  const subjects = new Map<string, SubjectProgress & { state: object | null }>();
  const get = (id: string) => {
    let s = subjects.get(id);
    if (!s) subjects.set(id, (s = { xp: 0, minutes: 0, state: null }));
    return s;
  };
  const wallet: Wallet = { xp: 0, gold: 0, gems: 0 };
  return {
    async record(id, xp, minutes) {
      const s = get(id);
      s.xp += xp;
      s.minutes += minutes;
      const before = wallet.xp;
      const earned = rewardsFor(before, before + xp);
      wallet.xp += xp;
      wallet.gold += earned.gold;
      wallet.gems += earned.gems;
      return {
        ...wallet,
        xpEarned: xp,
        goldEarned: earned.gold,
        gemsEarned: earned.gems,
        levelBefore: levelForXp(before),
        level: levelForXp(wallet.xp),
      };
    },
    async wallet() {
      return { ...wallet };
    },
    async summary(id) {
      const { xp, minutes } = get(id);
      return { xp, minutes };
    },
    async loadState(id) {
      const { state } = get(id);
      return state === null ? null : structuredClone(state);
    },
    async saveState(id, state) {
      get(id).state = structuredClone(state);
    },
  };
}
