import { parseLook } from '../avatar/looks.ts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Award,
  Chest,
  Contract,
  DayResult,
  MarketStall,
  ProgressStore,
  Today,
} from './store.ts';
import { REVIEW_STATE } from './store.ts';
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
  streak_shields?: number;
  shielded_days?: number;
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
  shields: r.streak_shields ?? 0,
  shieldedDays: r.shielded_days ?? 0,
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
      }>('todays_contracts', {}, 'load today’s contracts');
      return { day: r.day, contracts: r.contracts, paidNow: r.paid_now, gold: r.gold };
    },
    async chests() {
      const { data, error } = await client
        .from('chests')
        .select('id, kind, source, source_key')
        .is('opened_at', null)
        .order('granted_at')
        .returns<{ id: string; kind: string; source: Chest['source']; source_key: string }[]>();
      if (error) throw new Error(`Couldn't read your chests: ${error.message}`);
      return (data ?? []).map((c) => ({
        id: c.id,
        kind: c.kind,
        source: c.source,
        sourceKey: c.source_key,
      }));
    },
    async openChest(id) {
      const r = await call<{
        kind: string;
        gold: number;
        gems: number;
        item: string | null;
        item_gold: number;
        shield: boolean;
        shield_gold: number;
        wallet?: { gold: number; gems: number; streak_shields: number };
      }>('open_chest', { p_chest: id }, 'open the chest');
      return {
        kind: r.kind,
        gold: r.gold,
        gems: r.gems,
        item: r.item,
        itemGold: r.item_gold,
        shield: r.shield,
        shieldGold: r.shield_gold,
        wallet: r.wallet && {
          gold: r.wallet.gold,
          gems: r.wallet.gems,
          shields: r.wallet.streak_shields,
        },
      };
    },
    async market() {
      return call<MarketStall>('market_today', {}, 'open the Market');
    },
    async buyItem(id) {
      const r = await call<{ wallet: { gold: number; gems: number; streak_shields: number } }>(
        'buy_item',
        { p_item: id },
        'buy it',
      );
      return { gold: r.wallet.gold, gems: r.wallet.gems, shields: r.wallet.streak_shields };
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
      return toToday(await call<TodayRow>('today_status', {}, 'read today’s progress'));
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
      const [{ data, error }, items] = await Promise.all([
        client.from('profiles').select('display_name, avatar, title, guide_seen').maybeSingle<{
          display_name: string;
          avatar: unknown;
          title: string | null;
          guide_seen: string[] | null;
        }>(),
        client.from('owned_items').select('item_id').returns<{ item_id: string }[]>(),
      ]);
      if (error) throw new Error(`Couldn't read your profile: ${error.message}`);
      if (items.error) throw new Error(`Couldn't read what you own: ${items.error.message}`);
      const owned = (items.data ?? []).map((r) => r.item_id);
      return {
        displayName: data?.display_name ?? '',
        avatar: parseLook(data?.avatar, new Set(owned)),
        owned,
        title: data?.title ?? '',
        guideSeen: data?.guide_seen ?? [],
      };
    },
    async achievements() {
      const r = await call<{
        title: string | null;
        gems: number | null;
        achievements: { id: string; progress: number; target: number; earned_at: string | null }[];
      }>('my_achievements', {}, 'read your achievements');
      return {
        title: r.title ?? '',
        gems: r.gems ?? 0,
        achievements: r.achievements.map((a) => ({
          id: a.id,
          progress: a.progress,
          target: a.target,
          earnedAt: a.earned_at,
        })),
      };
    },
    async setTitle(title) {
      await call('set_title', { p_title: title }, 'wear that title');
    },
    async setAvatar(look) {
      const { data } = await client.auth.getSession();
      const id = data.session?.user.id;
      if (!id) throw new Error("Couldn't save your look: not signed in");
      const { error } = await client.from('profiles').update({ avatar: look }).eq('id', id);
      if (error) throw new Error(`Couldn't save your look: ${error.message}`);
    },
    async markGuideSeen(ids) {
      if (ids.length === 0) return;
      await call('guide_mark', { p_ids: [...ids] }, 'remember what the guide showed');
    },
    home: () => call<unknown>('my_home', {}, 'read your home'),
    async homeHeld() {
      const raw = await call<unknown>('my_home_held', {}, 'read your home');
      return Array.isArray(raw)
        ? raw.filter((x): x is string => typeof x === 'string').slice(0, 200)
        : [];
    },
    async saveHome(layout) {
      await call('save_home', { p_layout: layout }, 'save your home');
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
    async practiced() {
      const { data, error } = await client
        .from('subject_progress')
        .select('subject_id, updated_at')
        .order('updated_at', { ascending: false });
      if (error) throw new Error(`Couldn't read what was practiced last: ${error.message}`);
      return (data as { subject_id?: string }[]).flatMap((r) => r.subject_id ?? []);
    },
    async loadState(subjectId) {
      const data = await row(subjectId);
      // A row can exist with the default empty state; that means "never saved".
      return data && Object.keys(data.state).length > 0 ? data.state : null;
    },
    async cardSummary(subjectId) {
      const rows = await everyRow<{ item_id: string; interval: unknown; reps: unknown }>(
        (from, to) =>
          client
            .from('review_cards')
            .select('item_id, interval:card->scheduled_days, reps:card->reps')
            .eq('subject_id', subjectId)
            .order('item_id')
            .range(from, to),
      );
      return rows.map((r) => ({
        itemId: r.item_id,
        interval: Number(r.interval) || 0,
        reps: Number(r.reps) || 0,
      }));
    },
    async reviewsSince(subjectId, since) {
      const rows = await everyRow<{ item_id: string }>((from, to) =>
        client
          .from('review_log')
          .select('item_id')
          .eq('subject_id', subjectId)
          .gte('reviewed_at', since.toISOString())
          .order('id')
          .range(from, to),
      );
      return rows.map((r) => r.item_id);
    },
    async activity() {
      const rows = await everyRow<{ day: string; minutes: number }>((from, to) =>
        client
          .from('daily_activity')
          .select('day, minutes')
          .gt('minutes', 0)
          .order('day')
          .range(from, to),
      );
      return rows.map((r) => ({ day: r.day, minutes: r.minutes }));
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
    async dueCards(subjectId, now, limit, dayEnd = now, only) {
      const at = now.toISOString();
      const end = dayEnd.toISOString();
      if (only?.length === 0) return [];
      const query = () => {
        const q = client.from('review_cards').select('item_id, due').eq('subject_id', subjectId);
        return only ? q.in('item_id', [...only]) : q;
      };
      let { data, error } = await query()
        .or(`due.lte."${at}",and(state.eq.${REVIEW_STATE},due.lte."${end}")`)
        .order('due')
        .limit(limit);
      // Should the server ever refuse the day-end filter, what's due right now still loads.
      if (error) ({ data, error } = await query().lte('due', at).order('due').limit(limit));
      if (error) throw new Error(`Couldn't read due ${subjectId} reviews: ${error.message}`);
      return (data as { item_id: string; due: string }[]).map((r) => ({
        itemId: r.item_id,
        due: new Date(r.due),
      }));
    },
    // Reviews and results reach the database only inside a session (ADR 0031): since the rewards
    // were hardened (2026-11-15), record_review and record_result can't be called on their own.
    async saveReview() {
      throw new Error('Reviews are saved with saveSession (ADR 0031)');
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
    async saveResult() {
      throw new Error('Results are saved with saveSession (ADR 0031)');
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

/** The server sends at most 1000 rows at once (Supabase's default), so longer lists come in pages. */
const PAGE = 1000;

async function everyRow<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(`Couldn't read the ledger: ${error.message}`);
    const got = (data ?? []) as T[];
    rows.push(...got);
    if (got.length < PAGE) return rows;
  }
}
