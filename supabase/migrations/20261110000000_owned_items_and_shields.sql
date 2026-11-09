-- Waymark: owned items, milestone gear and streak shields (ADR 0033, ADR 0034, #48). Applies to
-- dev on merge and to prod on release (ADR 0018).
--
-- What a player owns lives here, written only by database functions (ADR 0029). The catalogue
-- is data (content/core/items.json, copied here; a test keeps them equal). Gear with a
-- milestone is given when the milestone is met. Streak shields are a count on the wallet: one
-- covers one missed day, used up the next time the streak is read, and only if the player holds
-- enough to cover the whole gap.

---------------------------------------------------------------------------------------------
-- 1. The catalogue
---------------------------------------------------------------------------------------------
create table public.items (
  id text primary key check (id ~ '^[a-z][a-z0-9-]{1,63}$'),
  kind text not null check (kind in ('gear', 'color', 'functional')),
  slot text check (slot in ('head', 'torso', 'legs', 'feet', 'hand', 'back')),
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'functional')),
  price integer not null check (price between 1 and 10000),
  -- How it's earned without buying it: subject-level (subject, level), streak (days),
  -- contracts (count) or trial (chapter). Null: chests and the Market only.
  milestone jsonb,
  check ((kind = 'gear') = (slot is not null))
);
alter table public.items enable row level security;
revoke all on public.items from anon, authenticated;

insert into public.items (id, kind, slot, rarity, price, milestone) values
  ('headset', 'gear', 'head', 'rare', 180, '{"kind": "subject-level", "subject": "morse", "level": 5}'),
  ('cloak', 'gear', 'back', 'rare', 180, '{"kind": "streak", "days": 7}'),
  ('boots', 'gear', 'feet', 'common', 60, '{"kind": "contracts", "count": 10}'),
  ('breeches', 'gear', 'legs', 'common', 60, '{"kind": "trial", "chapter": 1}'),
  ('streak-shield', 'functional', null, 'functional', 120, null);

create table public.owned_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.items (id),
  source text not null check (source in ('milestone', 'chest', 'market')),
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table public.owned_items enable row level security;
create policy "own items: read" on public.owned_items for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.owned_items from anon, authenticated;
grant select on public.owned_items to authenticated;

---------------------------------------------------------------------------------------------
-- 2. Trial events: a subject sends trial-<chapter> with the save that passes a trial
---------------------------------------------------------------------------------------------
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  select s.id, 'trial-' || n, 1
  from public.subjects s cross join generate_series(1, 12) n
  where s.id in ('morse', 'arabic');

---------------------------------------------------------------------------------------------
-- 3. Streak shields
---------------------------------------------------------------------------------------------
alter table public.wallets add column streak_shields integer not null default 0
  check (streak_shields between 0 and 2);
alter table public.daily_activity add column shielded boolean not null default false;

-- Covers the days missed since the last goal (or shielded) day, up to yesterday, if the player
-- holds a shield for each; otherwise uses none. Returns how many were used.
create function public.use_streak_shields(uid uuid, today date) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  last_kept date;
  missed integer;
  held integer;
begin
  select max(day) into last_kept from public.daily_activity
    where user_id = uid and day < today and (goal_reached or shielded);
  if last_kept is null then
    return 0;
  end if;
  missed := (today - 1) - last_kept;
  if missed <= 0 then
    return 0;
  end if;
  update public.wallets set streak_shields = streak_shields - missed
    where user_id = uid and streak_shields >= missed
    returning streak_shields into held;
  if held is null then
    return 0;
  end if;
  insert into public.daily_activity (user_id, day, shielded)
    select uid, d::date, true
    from generate_series(last_kept + 1, today - 1, interval '1 day') d
    on conflict (user_id, day) do update set shielded = true;
  return missed;
end;
$$;
revoke execute on function public.use_streak_shields(uuid, date) from public, anon, authenticated;

-- Consecutive kept days ending today (or yesterday while today is open), counting only goal
-- days: a shielded day keeps the streak alive but doesn't add to it.
create or replace function public.current_streak() returns integer
language sql stable security invoker set search_path = '' as $$
  with t as (select public.player_today() as today),
  anchor as (
    select case when exists (
      select 1 from public.daily_activity, t
      where user_id = auth.uid() and day = t.today and goal_reached
    ) then t.today else t.today - 1 end as day
    from t
  ),
  kept as (
    select da.goal_reached, (anchor.day - da.day) as back,
           row_number() over (order by da.day desc) - 1 as n
    from public.daily_activity da, anchor
    where da.user_id = auth.uid() and (da.goal_reached or da.shielded) and da.day <= anchor.day
  )
  -- Kept days, newest first, are consecutive exactly while "days back" equals the row number.
  select count(*) filter (where goal_reached)::integer from kept where back = n
$$;

-- Today's progress for the HUD. Uses any shields first, and says how many the player holds and
-- how many days just before today a shield covered.
drop function public.today_status();
create function public.today_status() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := public.player_today();
  covered integer := 0;
  d date := today - 1;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  perform public.use_streak_shields(uid, today);
  while exists (select 1 from public.daily_activity
                where user_id = uid and day = d and shielded and not goal_reached) loop
    covered := covered + 1;
    d := d - 1;
  end loop;
  return (
    select jsonb_build_object(
      'day', today,
      'minutes', coalesce(da.minutes, 0),
      'goal_minutes', p.daily_goal_minutes,
      'goal_reached', coalesce(da.goal_reached, false),
      'streak', public.current_streak(),
      'streak_shields', coalesce(w.streak_shields, 0),
      'shielded_days', covered
    )
    from public.profiles p
    left join public.daily_activity da on da.user_id = uid and da.day = today
    left join public.wallets w on w.user_id = uid
    where p.id = uid
  );
end;
$$;
revoke execute on function public.today_status() from public, anon;
grant execute on function public.today_status() to authenticated;

-- As before (20261104120000), but shields are used before the streak is counted.
create or replace function public.check_daily_goal() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := public.player_today();
  streak integer;
  paid boolean;
  chest_gold integer := 0;
  chest_gems integer := 0;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  perform public.use_streak_shields(uid, today);
  update public.daily_activity da set goal_reached = true
    from public.profiles p
    where da.user_id = uid and da.day = today and p.id = uid
      and not da.goal_reached and da.minutes >= p.daily_goal_minutes;
  if exists (select 1 from public.daily_activity
             where user_id = uid and day = today and goal_reached) then
    streak := public.current_streak();
    chest_gold := 20;
    chest_gems := case when streak % 7 = 0 then 1 else 0 end;
    insert into public.daily_chests (user_id, day, gold, gems)
      values (uid, today, chest_gold, chest_gems)
      on conflict do nothing
      returning true into paid;
    if coalesce(paid, false) then
      update public.wallets set gold = gold + chest_gold, gems = gems + chest_gems
        where user_id = uid;
    else
      chest_gold := 0;
      chest_gems := 0;
    end if;
  end if;
  return jsonb_build_object(
    'goal_reached_now', coalesce(paid, false),
    'chest_gold', chest_gold, 'chest_gems', chest_gems
  ) || public.today_status();
end;
$$;

---------------------------------------------------------------------------------------------
-- 4. Milestone gear
---------------------------------------------------------------------------------------------
-- Gives each catalogue item whose milestone the player has met and doesn't own yet. Returns the
-- ids given now. Runs after every save and when the board opens (via claim_contracts).
create function public.grant_milestones(uid uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  i record;
  met boolean;
  given text[] := '{}';
begin
  for i in select * from public.items
           where milestone is not null
             and id not in (select item_id from public.owned_items where user_id = uid) loop
    met := case i.milestone ->> 'kind'
      when 'subject-level' then exists (
        select 1 from public.subject_progress
        where user_id = uid and subject_id = i.milestone ->> 'subject'
          and public.level_for_xp(xp) >= (i.milestone ->> 'level')::integer)
      when 'streak' then public.current_streak() >= (i.milestone ->> 'days')::integer
      when 'contracts' then (
        select count(*) from public.daily_contracts
        where user_id = uid and paid_gold is not null) >= (i.milestone ->> 'count')::integer
      when 'trial' then exists (
        select 1 from public.subject_events
        where user_id = uid and kind = 'trial-' || (i.milestone ->> 'chapter'))
      else false
    end;
    if met then
      insert into public.owned_items (user_id, item_id, source)
        values (uid, i.id, 'milestone') on conflict do nothing;
      given := given || i.id;
    end if;
  end loop;
  return given;
end;
$$;
revoke execute on function public.grant_milestones(uuid) from public, anon, authenticated;

-- As before (20261109000000), then gives any milestone gear now earned.
create or replace function public.claim_contracts(uid uuid, today date) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  c record;
  paid text[] := '{}';
  hit boolean;
begin
  for c in select * from public.contract_progress(uid, today) loop
    if not c.paid and c.progress >= c.target then
      update public.daily_contracts set paid_gold = c.gold, paid_at = now()
        where user_id = uid and day = today and template_id = c.id and paid_gold is null
        returning true into hit;
      if coalesce(hit, false) then
        update public.wallets set gold = gold + c.gold where user_id = uid;
        paid := paid || c.id;
      end if;
      hit := false;
    end if;
  end loop;
  perform public.grant_milestones(uid);
  return paid;
end;
$$;
revoke execute on function public.claim_contracts(uuid, date) from public, anon, authenticated;
