-- Waymark: daily goal, streak and the daily chest (issue #20, ADR 0021). Rates: docs/game/economy.md.
-- The same rules live in src/core/progress/economy.ts; tests check they agree.

-- A day counts for the streak once its minutes reach the goal that applied at that moment.
-- Stored, so changing the goal later never rewrites past days.
alter table public.daily_activity add column goal_reached boolean not null default false;

update public.daily_activity da set goal_reached = true
  from public.profiles p
  where p.id = da.user_id and da.minutes >= p.daily_goal_minutes;

-- Today, in the signed-in player's time zone (UTC if the zone name is unknown).
create function public.player_today() returns date
language plpgsql stable security invoker set search_path = '' as $$
declare
  zone text;
begin
  select time_zone into zone from public.profiles where id = auth.uid();
  return (now() at time zone coalesce(zone, 'UTC'))::date;
exception when invalid_parameter_value then
  return (now() at time zone 'UTC')::date;
end;
$$;

-- Consecutive goal days ending today, or ending yesterday while today is still open.
create function public.current_streak() returns integer
language sql stable security invoker set search_path = '' as $$
  with t as (select public.player_today() as today),
  anchor as (
    select case when exists (
      select 1 from public.daily_activity, t
      where user_id = auth.uid() and day = t.today and goal_reached
    ) then t.today else t.today - 1 end as day
    from t
  ),
  goal_days as (
    select (anchor.day - da.day) as back,
           row_number() over (order by da.day desc) - 1 as n
    from public.daily_activity da, anchor
    where da.user_id = auth.uid() and da.goal_reached and da.day <= anchor.day
  )
  -- Goal days, newest first, are consecutive exactly while "days back" equals the row number.
  select count(*)::integer from goal_days where back = n
$$;

-- Today's progress for the HUD.
create function public.today_status() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'day', t.today,
    'minutes', coalesce(da.minutes, 0),
    'goal_minutes', p.daily_goal_minutes,
    'goal_reached', coalesce(da.goal_reached, false),
    'streak', public.current_streak()
  )
  from (select public.player_today() as today) t
  join public.profiles p on p.id = auth.uid()
  left join public.daily_activity da on da.user_id = auth.uid() and da.day = t.today
$$;

-- Marks today as reached once its minutes reach the goal, and pays the daily chest:
-- 20 gold, plus 1 gem on every 7th day of a streak. Safe to call any time; pays once a day.
create function public.check_daily_goal() returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := public.player_today();
  reached boolean;
  streak integer;
  chest_gold integer := 0;
  chest_gems integer := 0;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  update public.daily_activity da set goal_reached = true
    from public.profiles p
    where da.user_id = uid and da.day = today and p.id = uid
      and not da.goal_reached and da.minutes >= p.daily_goal_minutes
    returning true into reached;
  streak := public.current_streak();
  if coalesce(reached, false) then
    chest_gold := 20;
    chest_gems := case when streak % 7 = 0 then 1 else 0 end;
    update public.wallets set gold = gold + chest_gold, gems = gems + chest_gems
      where user_id = uid;
  end if;
  return jsonb_build_object(
    'goal_reached_now', coalesce(reached, false),
    'chest_gold', chest_gold, 'chest_gems', chest_gems
  ) || public.today_status();
end;
$$;

-- Daily goal, from the HUD. Lowering it below today's minutes reaches today's goal at once.
create function public.set_daily_goal(p_minutes integer) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  day_status jsonb;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  update public.profiles set daily_goal_minutes = p_minutes where id = auth.uid();
  day_status := public.check_daily_goal(); -- its own statement, so the wallet below sees the chest
  return day_status || jsonb_build_object('wallet', (
    select jsonb_build_object('xp', w.xp, 'gold', w.gold, 'gems', w.gems)
    from public.wallets w where w.user_id = auth.uid()
  ));
end;
$$;

-- The app sends the browser's time zone, so "today" is the player's own day.
create function public.set_time_zone(p_zone text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_zone) then
    raise exception 'unknown time zone: %', p_zone using errcode = '22023';
  end if;
  update public.profiles set time_zone = p_zone where id = auth.uid() and time_zone <> p_zone;
end;
$$;

-- record_progress (ADR 0019, 0020) now also reaches the daily goal and reports today.
create or replace function public.record_progress(p_subject text, p_xp integer, p_minutes integer)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date;
  xp_before bigint;
  xp_after bigint;
  lvl_before integer;
  lvl_after integer;
  gold_earned integer;
  gems_earned integer;
  w record;
  day_status jsonb;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_xp is null or p_minutes is null or p_xp < 0 or p_minutes < 0
     or p_xp > 10000 or p_minutes > 240 or (p_xp = 0 and p_minutes = 0) then
    raise exception 'invalid amounts: xp %, minutes %', p_xp, p_minutes using errcode = '22023';
  end if;
  today := public.player_today();

  insert into public.subject_progress as sp (user_id, subject_id, xp, minutes)
    values (uid, p_subject, p_xp, p_minutes)
    on conflict (user_id, subject_id) do update
      set xp = sp.xp + excluded.xp, minutes = sp.minutes + excluded.minutes;

  insert into public.daily_activity as da (user_id, day, xp, minutes)
    values (uid, today, p_xp, p_minutes)
    on conflict (user_id, day) do update
      set xp = da.xp + excluded.xp, minutes = least(1440, da.minutes + excluded.minutes);

  -- Lock the wallet row so two awards at once can't both pay the same level-up.
  insert into public.wallets (user_id) values (uid) on conflict do nothing;
  select xp into xp_before from public.wallets where user_id = uid for update;
  xp_after := xp_before + p_xp;
  lvl_before := public.level_for_xp(xp_before);
  lvl_after := public.level_for_xp(xp_after);
  gold_earned := (xp_after / 5 - xp_before / 5)
    + 5 * ((lvl_after * (lvl_after + 1)) / 2 - (lvl_before * (lvl_before + 1)) / 2);
  gems_earned := lvl_after / 5 - lvl_before / 5;
  update public.wallets
    set xp = xp_after, gold = gold + gold_earned, gems = gems + gems_earned
    where user_id = uid;

  day_status := public.check_daily_goal(); -- pays the chest into the same wallet
  select xp, gold, gems into w from public.wallets where user_id = uid;

  return jsonb_build_object(
    'xp', w.xp, 'gold', w.gold, 'gems', w.gems,
    'xp_earned', p_xp, 'gold_earned', gold_earned, 'gems_earned', gems_earned,
    'level_before', lvl_before, 'level', lvl_after
  ) || jsonb_build_object('today', day_status);
end;
$$;

revoke execute on function public.player_today(), public.current_streak(), public.today_status(),
  public.check_daily_goal(), public.set_daily_goal(integer), public.set_time_zone(text)
  from public, anon;
grant execute on function public.player_today(), public.current_streak(), public.today_status(),
  public.check_daily_goal(), public.set_daily_goal(integer), public.set_time_zone(text)
  to authenticated;
