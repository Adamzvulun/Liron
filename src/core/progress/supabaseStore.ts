import type { SupabaseClient } from '@supabase/supabase-js';
import type { Award, DayResult, ProgressStore, Today } from './store.ts';

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
      const r = await call<{
        xp: number;
        gold: number;
        gems: number;
        xp_earned: number;
        gold_earned: number;
        gems_earned: number;
        level_before: number;
        level: number;
        today: TodayRow;
      }>(
        'record_progress',
        { p_subject: subjectId, p_xp: xp, p_minutes: minutes },
        `save ${subjectId} progress`,
      );
      const award: Award = {
        xp: Number(r.xp),
        gold: r.gold,
        gems: r.gems,
        xpEarned: r.xp_earned,
        goldEarned: r.gold_earned,
        gemsEarned: r.gems_earned,
        levelBefore: r.level_before,
        level: r.level,
        today: toDayResult(r.today),
      };
      return award;
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
    async saveState(subjectId, state) {
      await call(
        'save_subject_state',
        { p_subject: subjectId, p_state: state },
        `save ${subjectId} state`,
      );
    },
  };
}
