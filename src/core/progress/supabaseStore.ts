import { parseLook } from '../avatar/looks.ts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Award, Contract, DayResult, ProgressStore, Today } from './store.ts';
import type { StoredRating } from '../rating/ratings.ts';

interface RatingRow {
  rating: number;
  rd: number;
  volatility: number;
  games: number;
  rated_at: string;
}

const RATING_COLUMNS = 'rating, rd, volatility, games, rated_at';

const toRating = (r: RatingRow): StoredRating => ({
  rating: Number(r.rating),
  rd: Number(r.rd),
  volatility: Number(r.volatility),
  games: Number(r.games),
  ratedAt: new Date(r.rated_at),
});

const ratingArg = (r: StoredRating) => ({
  rating: r.rating,
  rd: r.rd,
  volatility: r.volatility,
  games: r.games,
});

interface TodayRow {
  day: string;
  minutes: number;
  goal_minutes: number;
  goal_reached: boolean;
  streak: number;
  goal_reached_now?: boolean;
  chest_gold?: number;
  chest_gems?: number;
}

const toToday = (r: TodayRow): Today => ({
  day: r.day,
  minutes: r.minutes,
  goalMinutes: r.goal_minutes,
  goalReached: r.goal_reached,
  streak: r.streak,
});

const toDayResult = (r: TodayRow): DayResult => ({
  ...toToday(r),
  goalReachedNow: r.goal_reached_now ?? false,
  chestGold: r.chest_gold ?? 0,
  chestGems: r.chest_gems ?? 0,
});

interface AwardRow {
  xp: number;
  gold: number;
  gems: number;
  xp_earned: number;
  gold_earned: number;
  gems_earned: number;
  level_before: number;
  level: number;
  today: TodayRow;
}

const toAward = (r: AwardRow): Award => ({
  xp: Number(r.xp),
  gold: r.gold,
  gems: r.gems,
  xpEarned: r.xp_earned,
  goldEarned: r.gold_earned,
  gemsEarned: r.gems_earned,
  levelBefore: r.level_before,
  level: r.level,
  today: toDayResult(r.today),
});

/**
 * Progress kept in Supabase. Writes go through the database functions (ADR 0019, 0020, 0021),
 * which update the subject, today, the wallet and the streak in one transaction. Reads rely on
 * row-level security: a user only ever sees their own rows.
 */
export function supabaseStore(client: SupabaseClient): ProgressStore {
  const call = async <T>(fn: string, args: object, what: string): Promise<T> => {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw new Error(`Couldn't ${what}: ${error.message}`);
    return data as T;
  };
  const row = async (subjectId: string) => {
    const { data, error } = await client
      .from('subject_progress')
      .select('xp, minutes, state')
      .eq('subject_id', subjectId)
      .maybeSingle<{ xp: number; minutes: number; state: object }>();
    if (error) throw new Error(`Couldn't read ${subjectId} progress: ${error.message}`);
    return data;
  };
  return {
    async record(subjectId, xp, minutes) {
      return toAward(
        await call<AwardRow>(
          'record_progress',
          { p_subject: subjectId, p_xp: xp, p_minutes: minutes },
          `save ${subjectId} progress`,
        ),
      );
    },
    async todaysContracts() {
      const r = await call<{
        day: string;
        contracts: Contract[];
        paid_now: string[];
        gold: number;
      }>('todays_contracts', {}, "load today's contracts");
      return { day: r.day, contracts: r.contracts, paidNow: r.paid_now, gold: r.gold };
    },
    async saveSession(subjectId, session) {
      const r = await call<{ duplicate: boolean; award: AwardRow | null }>(
        'save_session',
        {
          p_subject: subjectId,
          p_session: session.sessionId,
          p_state: session.state,
          p_reviews: session.reviews.map(({ itemId, review, reviewedAt }) => ({
            item: itemId,
            rating: review.rating,
            reviewed_at: reviewedAt.toISOString(),
            due: review.due.toISOString(),
            state: review.state,
            card: review.card,
            log: review.log,
          })),
          p_results: session.results.map(({ skill, itemId, score, learner, item }) => ({
            skill,
            item: itemId,
            score,
            rated_at: learner.ratedAt.toISOString(),
            learner: ratingArg(learner),
            item_rating: ratingArg(item),
          })),
          p_xp: session.xp,
          p_minutes: session.minutes,
          p_events: session.events,
        },
        `save the ${subjectId} session`,
      );
      return { duplicate: r.duplicate, award: r.award ? toAward(r.award) : null };
    },
    async wallet() {
      const { data, error } = await client
        .from('wallets')
        .select('xp, gold, gems')
        .maybeSingle<{ xp: number; gold: number; gems: number }>();
      if (error) throw new Error(`Couldn't read the wallet: ${error.message}`);
      return { xp: Number(data?.xp ?? 0), gold: data?.gold ?? 0, gems: data?.gems ?? 0 };
    },
    async today() {
      return toToday(await call<TodayRow>('today_status', {}, "read today's progress"));
    },
    async setDailyGoal(minutes) {
      const r = await call<TodayRow & { wallet: { xp: number; gold: number; gems: number } }>(
        'set_daily_goal',
        { p_minutes: minutes },
        'change the daily goal',
      );
      return {
        wallet: { xp: Number(r.wallet.xp), gold: r.wallet.gold, gems: r.wallet.gems },
        today: toDayResult(r),
      };
    },
    async setTimeZone(zone) {
      await call('set_time_zone', { p_zone: zone }, 'save the time zone');
    },
    async profile() {
      const { data, error } = await client
        .from('profiles')
        .select('display_name, avatar')
        .maybeSingle<{ display_name: string; avatar: unknown }>();
      if (error) throw new Error(`Couldn't read your profile: ${error.message}`);
      return { displayName: data?.display_name ?? '', avatar: parseLook(data?.avatar) };
    },
    async setAvatar(look) {
      const { data } = await client.auth.getSession();
      const id = data.session?.user.id;
      if (!id) throw new Error("Couldn't save your look: not signed in");
      const { error } = await client.from('profiles').update({ avatar: look }).eq('id', id);
      if (error) throw new Error(`Couldn't save your look: ${error.message}`);
    },
    async setDisplayName(name) {
      // Row-level security limits the update to the signed-in player's own profile.
      const { data } = await client.auth.getSession();
      const id = data.session?.user.id;
      if (!id) throw new Error("Couldn't save your name: not signed in");
      const { error } = await client.from('profiles').update({ display_name: name }).eq('id', id);
      if (error) throw new Error(`Couldn't save your name: ${error.message}`);
    },
    async summary(subjectId) {
      const data = await row(subjectId);
      return { xp: Number(data?.xp ?? 0), minutes: data?.minutes ?? 0 };
    },
    async loadState(subjectId) {
      const data = await row(subjectId);
      // A row can exist with the default empty state; that means "never saved".
      return data && Object.keys(data.state).length > 0 ? data.state : null;
    },
    async reviewCards(subjectId, itemIds) {
      const found = new Map<string, Record<string, unknown>>();
      if (itemIds.length === 0) return found;
      const { data, error } = await client
        .from('review_cards')
        .select('item_id, card')
        .eq('subject_id', subjectId)
        .in('item_id', [...itemIds]);
      if (error) throw new Error(`Couldn't read ${subjectId} reviews: ${error.message}`);
      for (const r of data as { item_id: string; card: Record<string, unknown> }[]) {
        found.set(r.item_id, r.card);
      }
      return found;
    },
    async dueCards(subjectId, now, limit) {
      const { data, error } = await client
        .from('review_cards')
        .select('item_id, due')
        .eq('subject_id', subjectId)
        .lte('due', now.toISOString())
        .order('due')
        .limit(limit);
      if (error) throw new Error(`Couldn't read due ${subjectId} reviews: ${error.message}`);
      return (data as { item_id: string; due: string }[]).map((r) => ({
        itemId: r.item_id,
        due: new Date(r.due),
      }));
    },
    async saveReview(subjectId, itemId, review, reviewedAt) {
      await call(
        'record_review',
        {
          p_subject: subjectId,
          p_item: itemId,
          p_rating: review.rating,
          p_reviewed_at: reviewedAt.toISOString(),
          p_due: review.due.toISOString(),
          p_state: review.state,
          p_card: review.card,
          p_log: review.log,
        },
        `save a ${subjectId} review`,
      );
    },
    async skillRatings(subjectId) {
      const { data, error } = await client
        .from('skill_ratings')
        .select(`skill, ${RATING_COLUMNS}`)
        .eq('subject_id', subjectId);
      if (error) throw new Error(`Couldn't read ${subjectId} ratings: ${error.message}`);
      return new Map(
        (data as (RatingRow & { skill: string })[]).map((r) => [r.skill, toRating(r)]),
      );
    },
    async itemRatings(subjectId, skill, itemIds) {
      if (itemIds.length === 0) return new Map();
      const { data, error } = await client
        .from('item_ratings')
        .select(`item_id, ${RATING_COLUMNS}`)
        .eq('subject_id', subjectId)
        .eq('skill', skill)
        .in('item_id', [...itemIds]);
      if (error) throw new Error(`Couldn't read ${subjectId} item ratings: ${error.message}`);
      return new Map(
        (data as (RatingRow & { item_id: string })[]).map((r) => [r.item_id, toRating(r)]),
      );
    },
    async saveResult(subjectId, skill, itemId, score, learner, item) {
      await call(
        'record_result',
        {
          p_subject: subjectId,
          p_skill: skill,
          p_item: itemId,
          p_score: score,
          p_rated_at: learner.ratedAt.toISOString(),
          p_learner: ratingArg(learner),
          p_item_rating: ratingArg(item),
        },
        `save a ${subjectId} result`,
      );
    },
    async saveState(subjectId, state) {
      await call(
        'save_subject_state',
        { p_subject: subjectId, p_state: state },
        `save ${subjectId} state`,
      );
    },
  };
}
