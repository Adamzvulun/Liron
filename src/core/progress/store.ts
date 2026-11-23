import { DEFAULT_LOOK, type Look } from '../avatar/looks.ts';
import type { SubjectProgress } from '../subject.ts';
import type { ScheduledReview, StoredCard } from '../srs/scheduler.ts';
import type { StoredRating } from '../rating/ratings.ts';
import type { Layout } from '../home/layout.ts';
import { ACHIEVEMENTS, type MyAchievements } from '../achievements/achievements.ts';
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
  /** Streak shields held, 0 to 2 (ADR 0034). */
  shields: number;
  /** Missed days just before today that a shield covered. */
  shieldedDays: number;
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

/** A finished session, worked out and ready to save in one go (ADR 0031). */
export interface SessionWrite {
  /** Made by the app when the session ends; the same id is never applied twice. */
  sessionId: string;
  /** The subject's new state, or null to leave it as it is. */
  state: object | null;
  reviews: { itemId: string; review: ScheduledReview; reviewedAt: Date }[];
  results: {
    skill: string;
    itemId: string;
    score: number;
    learner: StoredRating;
    item: StoredRating;
  }[];
  xp: number;
  minutes: number;
  /** Moments for daily contracts (ADR 0032). */
  events: { kind: string; count: number }[];
}

/** One of today's contracts on the Notice Board (ADR 0032). */
export interface Contract {
  id: string;
  /** The subject it's for, or null for a habit contract. */
  subject: string | null;
  text: string;
  progress: number;
  target: number;
  gold: number;
  paid: boolean;
}

/** Today's contracts, with any paid just now and the wallet's gold after paying them. */
export interface TodaysContracts {
  day: string;
  contracts: Contract[];
  paidNow: string[];
  gold: number;
}

/** An unopened reward chest (ADR 0033): what kind, and what earned it. */
export interface Chest {
  id: string;
  /** wooden, brass or jeweled (content/core/chests.json). */
  kind: string;
  source: 'contracts' | 'trial' | 'streak';
  /** contracts: the day; trial: "subject:chapter"; streak: "day:days". */
  sourceKey: string;
}

/** What an opened chest held, rolled and paid by the database. */
export interface ChestContents {
  kind: string;
  gold: number;
  gems: number;
  /** Gear given, or (with itemGold) gear already owned, paid as its price in gold. */
  item: string | null;
  itemGold: number;
  /** A streak shield, or (with shieldGold) its price in gold when already holding 2. */
  shield: boolean;
  shieldGold: number;
  /** The wallet afterwards (absent when the chest was already open). */
  wallet?: { gold: number; gems: number; shields: number };
}

/** One of the Market's wares today (ADR 0033, #49). */
export interface Ware {
  id: string;
  kind: 'gear' | 'color' | 'functional' | 'furniture' | 'style';
  /** The gear slot; null for colors, functional items and furniture. */
  slot: string | null;
  rarity: string;
  price: number;
  /** Owned already (a streak shield: holding 2, the most you can). */
  owned: boolean;
  affordable: boolean;
}

/** The Market's stall today: 5 wares, the same for everyone. */
export interface MarketStall {
  day: string;
  wares: Ware[];
}

/** The player's own profile fields the app shows. */
export interface Profile {
  /** The name the player chose; empty until they choose one. */
  displayName: string;
  /** How the player's avatar looks (#28, #29). */
  avatar: Look;
  /** Ids of the items the player owns (ADR 0033). */
  owned: string[];
  /** The title worn under the name (#177); '' for none, when the level's title shows. */
  title: string;
  /** Ids of the guide's lines the player has been shown (the-guide.md §4, #407). */
  guideSeen: string[];
}

/** Names are 1-40 characters after trimming (the database checks the length too). */
export const MAX_NAME_LENGTH = 40;

/** FSRS's state number for a card in long-term review (0 new, 1 learning, 2 review, 3 relearning). */
export const REVIEW_STATE = 2;

/** A card as the ledger reads it: FSRS's interval in days, and how many reviews it has had. */
export interface CardSummary {
  itemId: string;
  interval: number;
  reps: number;
}

/** Where progress is kept. Supabase in the app, memory in tests. Not used by subjects directly. */
export interface ProgressStore {
  /** Adds XP and minutes to a subject, to today and to the wallet; pays gold, gems, chests. */
  record(subjectId: string, xp: number, minutes: number): Promise<Award>;
  wallet(): Promise<Wallet>;
  /** Today's contracts (picked once a day); finished ones are paid first (ADR 0032). */
  todaysContracts(): Promise<TodaysContracts>;
  /** The player's unopened chests, oldest first (ADR 0033). */
  chests(): Promise<Chest[]>;
  /** Opens a chest: the database rolls and pays it, once. */
  openChest(id: string): Promise<ChestContents>;
  /** Today's Market stall (#49). */
  market(): Promise<MarketStall>;
  /** Buys one of today's wares: the database takes the gold and gives the item, or refuses. */
  buyItem(id: string): Promise<{ gold: number; gems: number; shields: number }>;
  profile(): Promise<Profile>;
  setDisplayName(name: string): Promise<void>;
  setAvatar(look: Look): Promise<void>;
  /** Adds ids to what the guide has shown the player; ids already there stay once (#407). */
  markGuideSeen(ids: readonly string[]): Promise<void>;
  /**
   * The player's room as saved (task 7.3): read it with `parseLayout`, and show the starter
   * room when it is null or unreadable. Kept raw so the store doesn't load the home's rules.
   */
  home(): Promise<unknown>;
  /** Saves the whole room; the database refuses it, saving nothing, if any rule fails. */
  saveHome(layout: Layout): Promise<void>;
  /** The player's achievements (#177): any now met are given first, and their gems paid. */
  achievements(): Promise<MyAchievements>;
  /** Wears an earned title, or none with ''; the database refuses one not earned. */
  setTitle(title: string): Promise<void>;
  today(): Promise<Today>;
  /** Changes the daily goal; lowering it below today's minutes reaches today's goal at once. */
  setDailyGoal(minutes: number): Promise<{ wallet: Wallet; today: DayResult }>;
  /** The IANA time zone that decides when the player's day starts. */
  setTimeZone(zone: string): Promise<void>;
  summary(subjectId: string): Promise<SubjectProgress>;
  /** The subjects with saved progress, the one practiced most recently first. */
  practiced(): Promise<string[]>;
  loadState(subjectId: string): Promise<object | null>;
  saveState(subjectId: string, state: object): Promise<void>;
  /** Stored FSRS cards for the given items (missing items have never been reviewed). */
  reviewCards(subjectId: string, itemIds: readonly string[]): Promise<Map<string, StoredCard>>;
  /**
   * Items due at `now`, most overdue first. A card in long-term review (FSRS state 2) that falls
   * due by `dayEnd` counts as due too, so a word answered last night is due this morning.
   */
  dueCards(
    subjectId: string,
    now: Date,
    limit: number,
    dayEnd?: Date,
    /** Only these items; all of the subject's when left out. */
    only?: readonly string[],
  ): Promise<{ itemId: string; due: Date }[]>;
  /** Every card of a subject, with its interval and review count (docs/game/ledger.md). */
  cardSummary(subjectId: string): Promise<CardSummary[]>;
  /** The item of each review of a subject since `since`: one entry per review. */
  reviewsSince(subjectId: string, since: Date): Promise<string[]>;
  /** The minutes practiced on each day that has any, every subject together. */
  activity(): Promise<{ day: string; minutes: number }[]>;
  /** Saves a review: the card's new state and the log entry, together. */
  saveReview(
    subjectId: string,
    itemId: string,
    review: ScheduledReview,
    reviewedAt: Date,
  ): Promise<void>;
  /** The learner's stored ratings in this subject, by skill. */
  skillRatings(subjectId: string): Promise<Map<string, StoredRating>>;
  /** Stored ratings of the given items in one skill. */
  itemRatings(
    subjectId: string,
    skill: string,
    itemIds: readonly string[],
  ): Promise<Map<string, StoredRating>>;
  /** Saves one result: both new ratings and the log entry, together. */
  saveResult(
    subjectId: string,
    skill: string,
    itemId: string,
    score: number,
    learner: StoredRating,
    item: StoredRating,
  ): Promise<void>;
  /**
   * Saves a whole session in one transaction (ADR 0031). A session id seen before applies
   * nothing and returns `duplicate: true`. `award` is null when there was no XP or time.
   */
  saveSession(
    subjectId: string,
    session: SessionWrite,
  ): Promise<{ duplicate: boolean; award: Award | null }>;
}

/** An in-memory store with the same rules as the database, for tests. */
export function memoryStore(
  clock: { today: () => string } = { today: () => new Date().toISOString().slice(0, 10) },
): ProgressStore & {
  travel(days: number): void;
  /** Gives an achievement, as the database would once its condition is met. */
  earnAchievement(id: string): void;
  reviewLog: readonly object[];
  ratingLog: readonly object[];
} {
  const subjects = new Map<string, SubjectProgress & { state: object | null; at: number }>();
  // Counts writes, so `practiced` knows which subject was saved last.
  let tick = 0;
  const get = (id: string) => {
    let s = subjects.get(id);
    if (!s) subjects.set(id, (s = { xp: 0, minutes: 0, state: null, at: 0 }));
    return s;
  };
  const wallet: Wallet = { xp: 0, gold: 0, gems: 0 };
  let home: Layout | null = null;
  const profile: Profile = {
    displayName: '',
    avatar: DEFAULT_LOOK,
    owned: [],
    title: '',
    guideSeen: [],
  };
  /** Achievement ids earned, with when; tests give them through `earnAchievement`. */
  const achieved = new Map<string, string>();
  const days = new Map<string, { minutes: number; reached: boolean }>();
  const cards = new Map<string, { due: Date; card: StoredCard }>(); // key: subject/item
  const reviewLog: { subjectId: string; itemId: string; rating: number; at: Date }[] = [];
  const skillRatings = new Map<string, StoredRating>(); // key: subject/skill
  const itemRatings = new Map<string, StoredRating>(); // key: subject/skill/item
  const ratingLog: { subjectId: string; skill: string; itemId: string; score: number }[] = [];
  const savedSessions = new Set<string>();
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
      // Shields are bought and won only through the database (schema tests); none here.
      shields: 0,
      shieldedDays: 0,
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
  const store: ProgressStore & {
    travel(days: number): void;
    earnAchievement(id: string): void;
    reviewLog: readonly object[];
    ratingLog: readonly object[];
  } = {
    reviewLog,
    ratingLog,
    // Contracts are picked and paid only by the database (schema tests); none here.
    async todaysContracts() {
      return { day: todayIs(), contracts: [], paidNow: [], gold: wallet.gold };
    },
    // Chests too are granted and rolled only by the database (schema tests).
    async chests() {
      return [];
    },
    async openChest() {
      throw new Error('Chests open only in the database');
    },
    // The Market sells only through the database (schema tests).
    async market() {
      return { day: todayIs(), wares: [] };
    },
    async buyItem() {
      throw new Error('The Market sells only through the database');
    },
    async saveSession(subjectId, s) {
      if (savedSessions.has(s.sessionId)) return { duplicate: true, award: null };
      savedSessions.add(s.sessionId);
      if (s.state) await store.saveState(subjectId, s.state);
      for (const r of s.reviews)
        await store.saveReview(subjectId, r.itemId, r.review, r.reviewedAt);
      for (const r of s.results)
        await store.saveResult(subjectId, r.skill, r.itemId, r.score, r.learner, r.item);
      const award =
        s.xp > 0 || s.minutes > 0 ? await store.record(subjectId, s.xp, s.minutes) : null;
      return { duplicate: false, award };
    },
    async skillRatings(subjectId) {
      const found = new Map<string, StoredRating>();
      for (const [key, r] of skillRatings) {
        if (key.startsWith(`${subjectId}/`)) found.set(key.slice(subjectId.length + 1), { ...r });
      }
      return found;
    },
    async itemRatings(subjectId, skill, itemIds) {
      const found = new Map<string, StoredRating>();
      for (const id of itemIds) {
        const r = itemRatings.get(`${subjectId}/${skill}/${id}`);
        if (r) found.set(id, { ...r });
      }
      return found;
    },
    async saveResult(subjectId, skill, itemId, score, learner, item) {
      skillRatings.set(`${subjectId}/${skill}`, { ...learner });
      itemRatings.set(`${subjectId}/${skill}/${itemId}`, { ...item });
      ratingLog.push({ subjectId, skill, itemId, score });
    },
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
    async dueCards(subjectId, now, limit, dayEnd = now, only) {
      const isDue = (c: { due: Date; card: StoredCard }) =>
        c.due <= now || (Number(c.card.state) === REVIEW_STATE && c.due <= dayEnd);
      const asked = only && new Set(only.map((i) => `${subjectId}/${i}`));
      return [...cards]
        .filter(
          ([key, c]) => key.startsWith(`${subjectId}/`) && (!asked || asked.has(key)) && isDue(c),
        )
        .sort(([, a], [, b]) => a.due.getTime() - b.due.getTime())
        .slice(0, limit)
        .map(([key, c]) => ({ itemId: key.slice(subjectId.length + 1), due: c.due }));
    },
    async cardSummary(subjectId) {
      return [...cards]
        .filter(([key]) => key.startsWith(`${subjectId}/`))
        .map(([key, c]) => ({
          itemId: key.slice(subjectId.length + 1),
          interval: Number(c.card.scheduled_days) || 0,
          reps: Number(c.card.reps) || 0,
        }));
    },
    async reviewsSince(subjectId, since) {
      return reviewLog
        .filter((r) => r.subjectId === subjectId && r.at >= since)
        .map((r) => r.itemId);
    },
    async activity() {
      return [...days]
        .filter(([, d]) => d.minutes > 0)
        .map(([day, d]) => ({ day, minutes: d.minutes }));
    },
    async saveReview(subjectId, itemId, review, reviewedAt) {
      cards.set(`${subjectId}/${itemId}`, { due: review.due, card: structuredClone(review.card) });
      reviewLog.push({ subjectId, itemId, rating: review.rating, at: reviewedAt });
    },
    async practiced() {
      return [...subjects]
        .filter(([, s]) => s.at > 0)
        .sort(([, a], [, b]) => b.at - a.at)
        .map(([id]) => id);
    },
    async record(id, xp, minutes) {
      const s = get(id);
      s.at = ++tick;
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
    async profile() {
      // Fresh copies, as the database gives: a caller changing one changes nothing kept.
      return structuredClone(profile);
    },
    async setDisplayName(name) {
      profile.displayName = name;
    },
    async setAvatar(look) {
      profile.avatar = structuredClone(look);
    },
    async markGuideSeen(ids) {
      profile.guideSeen = [...new Set([...profile.guideSeen, ...ids])].sort();
    },
    async home() {
      return home === null ? null : structuredClone(home);
    },
    async saveHome(layout) {
      home = structuredClone(layout);
    },
    async achievements() {
      return {
        title: profile.title,
        gems: wallet.gems,
        achievements: ACHIEVEMENTS.map((a) => ({
          id: a.id,
          progress: achieved.has(a.id) ? a.condition.n : 0,
          target: a.condition.n,
          earnedAt: achieved.get(a.id) ?? null,
        })),
      };
    },
    earnAchievement(id) {
      // Paid once, as the database pays an achievement's gems when it is given.
      if (achieved.has(id)) return;
      achieved.set(id, new Date().toISOString());
      wallet.gems += ACHIEVEMENTS.find((a) => a.id === id)?.gems ?? 0;
    },
    async setTitle(title) {
      if (title && !ACHIEVEMENTS.some((a) => a.title === title && achieved.has(a.id)))
        throw new Error('That title is not yours yet');
      profile.title = title;
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
      get(id).at = ++tick;
      get(id).state = structuredClone(state);
    },
  };
  return store;
}
