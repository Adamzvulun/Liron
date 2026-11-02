import type { SubjectProgress } from '../subject.ts';

/** Where progress is kept. Supabase in the app, memory in tests. Not used by subjects directly. */
export interface ProgressStore {
  /** Adds XP and minutes to a subject, to today and to the wallet, together. */
  record(subjectId: string, xp: number, minutes: number): Promise<void>;
  summary(subjectId: string): Promise<SubjectProgress>;
  loadState(subjectId: string): Promise<object | null>;
  saveState(subjectId: string, state: object): Promise<void>;
}

/** An in-memory store, for tests and for trying a subject without an account. */
export function memoryStore(): ProgressStore & { wallet: { xp: number } } {
  const subjects = new Map<string, SubjectProgress & { state: object | null }>();
  const get = (id: string) => {
    let s = subjects.get(id);
    if (!s) subjects.set(id, (s = { xp: 0, minutes: 0, state: null }));
    return s;
  };
  const wallet = { xp: 0 };
  return {
    wallet,
    async record(id, xp, minutes) {
      const s = get(id);
      s.xp += xp;
      s.minutes += minutes;
      wallet.xp += xp;
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
