import type { SubjectProgress } from '../subject.ts';
import type { ScheduledReview, StoredCard } from '../srs/scheduler.ts';
import {
  addDays,
  dailyChest,
  DEFAULT_DAILY_GOAL,
  levelForXp,
  rewardsFor,
  streakFrom,
} from './economy.ts';

/** The player's XP and currencies. */
export interface Wallet {
  xp: number;
  gold: number;
  gems: number;
}

/** Today's progress towards the daily goal, and the streak. */
export interface Today {
  /** The player's local date, YYYY-MM-DD. */
  day: string;
  minutes: number;
  goalMinutes: number;
  goalReached: boolean;
  streak: number;
}

/** Today, plus whether this call reached the goal and what the daily chest paid. */
export interface DayResult extends Today {
  goalReachedNow: boolean;
  chestGold: number;
  chestGems: number;
}

/** What one recorded award did: the wallet afterwards, what was earned, any level-up, today. */
export interface Award extends Wallet {
  xpEarned: number;
  goldEarned: number;
  gemsEarned: number;
  levelBefore: number;
  level: number;
  today: DayResult;
}

/** Where progress is kept. Supabase in the app, memory in tests. Not used by subjects directly. */
export interface ProgressStore {
  /** Adds XP and minutes to a subject, to today and to the wallet; pays gold, gems, chests. */
  record(subjectId: string, xp: number, minutes: number): Promise<Award>;
  wallet(): Promise<Wallet>;
  today(): Promise<Today>;
  /** Changes the daily goal; lowering it below today's minutes reaches today's goal at once. */
  setDailyGoal(minutes: number): Promise<{ wallet: Wallet; today: DayResult }>;
  /** The IANA time zone that decides when the player's day starts. */
  setTimeZone(zone: string): Promise<void>;
  summary(subjectId: string): Promise<SubjectProgress>;
  loadState(subjectId: string): Promise<object | null>;
  saveState(subjectId: string, state: object): Promise<void>;
  /** Stored FSRS cards for the given items (missing items have never been reviewed). */
  reviewCards(subjectId: string, itemIds: readonly string[]): Promise<Map<string, StoredCard>>;
  /** Items due at `now`, most overdue first. */
  dueCards(subjectId: string, now: Date, limit: number): Promise<{ itemId: string; due: Date }[]>;
  /** Saves a review: the card's new state and the log entry, together. */
  saveReview(
    subjectId: string,
    itemId: string,
    review: ScheduledReview,
    reviewedAt: Date,
  ): Promise<void>;
}

/** An in-memory store with the same rules as the database, for tests. */
export function memoryStore(
  clock: { today: () => string } = { today: () => new Date().toISOString().slice(0, 10) },
): ProgressStore & { travel(days: number): void; reviewLog: readonly object[] } {
  const subjects = new Map<string, SubjectProgress & { state: object | null }>();
  const get = (id: string) => {
    let s = subjects.get(id);
    if (!s) subjects.set(id, (s = { xp: 0, minutes: 0, state: null }));
    return s;
  };
  const wallet: Wallet = { xp: 0, gold: 0, gems: 0 };
  const days = new Map<string, { minutes: number; reached: boolean }>();
  const cards = new Map<string, { due: Date; card: StoredCard }>(); // key: subject/item
  const reviewLog: { subjectId: string; itemId: string; rating: number; at: Date }[] = [];
  let goal = DEFAULT_DAILY_GOAL;
  let offset = 0;
  const todayIs = () => addDays(clock.today(), offset);
  const goalDays = () => [...days].filter(([, d]) => d.reached).map(([day]) => day);
  const status = (): Today => {
    const day = todayIs();
    const d = days.get(day);
    return {
      day,
      minutes: d?.minutes ?? 0,
      goalMinutes: goal,
      goalReached: d?.reached ?? false,
      streak: streakFrom(goalDays(), day),
    };
  };
  const checkGoal = (): DayResult => {
    const d = days.get(todayIs());
    let chest = { gold: 0, gems: 0 };
    const now = Boolean(d && !d.reached && d.minutes >= goal);
    if (d && now) {
      d.reached = true;
      chest = dailyChest(status().streak);
      wallet.gold += chest.gold;
      wallet.gems += chest.gems;
    }
    return { ...status(), goalReachedNow: now, chestGold: chest.gold, chestGems: chest.gems };
  };
  return {
    reviewLog,
    travel(n) {
      offset += n;
    },
    async reviewCards(subjectId, itemIds) {
      const found = new Map<string, StoredCard>();
      for (const id of itemIds) {
        const c = cards.get(`${subjectId}/${id}`);
        if (c) found.set(id, structuredClone(c.card));
      }
      return found;
    },
    async dueCards(subjectId, now, limit) {
      return [...cards]
        .filter(([key, c]) => key.startsWith(`${subjectId}/`) && c.due <= now)
        .sort(([, a], [, b]) => a.due.getTime() - b.due.getTime())
        .slice(0, limit)
        .map(([key, c]) => ({ itemId: key.slice(subjectId.length + 1), due: c.due }));
    },
    async saveReview(subjectId, itemId, review, reviewedAt) {
      cards.set(`${subjectId}/${itemId}`, { due: review.due, card: structuredClone(review.card) });
      reviewLog.push({ subjectId, itemId, rating: review.rating, at: reviewedAt });
    },
    async record(id, xp, minutes) {
      const s = get(id);
      s.xp += xp;
      s.minutes += minutes;
      const day = todayIs();
      const d = days.get(day) ?? { minutes: 0, reached: false };
      d.minutes = Math.min(1440, d.minutes + minutes);
      days.set(day, d);
      const before = wallet.xp;
      const earned = rewardsFor(before, before + xp);
      wallet.xp += xp;
      wallet.gold += earned.gold;
      wallet.gems += earned.gems;
      const today = checkGoal();
      return {
        ...wallet,
        xpEarned: xp,
        goldEarned: earned.gold,
        gemsEarned: earned.gems,
        levelBefore: levelForXp(before),
        level: levelForXp(wallet.xp),
        today,
      };
    },
    async wallet() {
      return { ...wallet };
    },
    async today() {
      return status();
    },
    async setDailyGoal(minutes) {
      goal = minutes;
      const today = checkGoal();
      return { wallet: { ...wallet }, today };
    },
    async setTimeZone() {},
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
