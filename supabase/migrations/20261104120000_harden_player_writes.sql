-- Waymark: closes the write-path holes found in the 2026-11-04 security review
-- (docs/process/reviews/2026-11-04-security.md). Applies to dev on merge and to prod on release
-- (ADR 0018).
--
-- 1. Rewards are written only by the database functions, never directly through the Data API.
--    The functions become `security definer` (they act only on auth.uid()'s rows), and the
--    signed-in role loses insert/update on the tables they write.
-- 2. The daily chest is paid once per player per day, recorded in its own table, so re-writing
--    daily_activity can never pay it twice.
-- 3. record_progress takes only known subjects and caps XP per day; the time zone can change at
--    most once every 20 hours, so hopping zones can't make two "todays" in one real day.
-- 4. The licensed deck (ADR 0011) is readable only by its licensees, never by any signed-in
--    account; anonymous sign-ins are refused.

---------------------------------------------------------------------------------------------
-- 1. No direct writes to the economy.
---------------------------------------------------------------------------------------------
drop policy "own profile: create" on public.profiles;
drop policy "own wallet: create" on public.wallets;
drop policy "own wallet: update" on public.wallets;
drop policy "own activity: create" on public.daily_activity;
drop policy "own activity: update" on public.daily_activity;
drop policy "own progress: create" on public.subject_progress;
drop policy "own progress: update" on public.subject_progress;

revoke insert, update on public.profiles, public.wallets, public.daily_activity,
  public.subject_progress from authenticated;
-- The profile keeps what the player edits directly: their name and their look.
grant update (display_name, avatar) on public.profiles to authenticated;
alter table public.profiles
  add constraint profiles_avatar_size check (pg_column_size(avatar) < 4096);
alter table public.subject_progress
  add constraint subject_progress_state_size check (pg_column_size(state) < 65536);

-- The subjects that exist (src/subjects/registry.ts). A new subject adds itself here.
create table public.subjects (id text primary key check (id ~ '^[a-z][a-z0-9-]{1,31}$'));
insert into public.subjects (id) values ('morse'), ('arabic'), ('example');
alter table public.subjects enable row level security;
revoke all on public.subjects from anon, authenticated;

create function public.require_subject(p_subject text) returns void
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.subjects where id = p_subject) then
    raise exception 'unknown subject: %', p_subject using errcode = '22023';
  end if;
end;
$$;
revoke execute on function public.require_subject(text) from public, anon, authenticated;

---------------------------------------------------------------------------------------------
-- 2. The daily chest, once per player per day.
---------------------------------------------------------------------------------------------
create table public.daily_chests (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  gold integer not null,
  gems integer not null,
  paid_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.daily_chests enable row level security;
create policy "own chests: read" on public.daily_chests for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.daily_chests from anon, authenticated;
grant select on public.daily_chests to authenticated;

-- Days already reached were already paid (at the old rates: 20 gold; gems not reconstructed).
insert into public.daily_chests (user_id, day, gold, gems)
  select user_id, day, 20, 0 from public.daily_activity where goal_reached
  on conflict do nothing;

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

create or replace function public.set_daily_goal(p_minutes integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  day_status jsonb;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  update public.profiles set daily_goal_minutes = p_minutes where id = auth.uid();
  day_status := public.check_daily_goal();
  return day_status || jsonb_build_object('wallet', (
    select jsonb_build_object('xp', w.xp, 'gold', w.gold, 'gems', w.gems)
    from public.wallets w where w.user_id = auth.uid()
  ));
end;
$$;

---------------------------------------------------------------------------------------------
-- 3. Time zones and record_progress.
---------------------------------------------------------------------------------------------
alter table public.profiles add column time_zone_set_at timestamptz;

-- The first change is free (accounts start on UTC); after that, one change per 20 hours.
-- A refused change is quietly ignored: the app sends the browser's zone on every visit.
create or replace function public.set_time_zone(p_zone text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_zone) then
    raise exception 'unknown time zone: %', p_zone using errcode = '22023';
  end if;
  update public.profiles set time_zone = p_zone, time_zone_set_at = now()
    where id = auth.uid() and time_zone <> p_zone
      and (time_zone_set_at is null or time_zone_set_at < now() - interval '20 hours');
end;
$$;

-- At most this much XP counts per player per day: about 5 hours of real learning
-- (docs/game/economy.md: ~10 XP a minute).
create or replace function public.record_progress(p_subject text, p_xp integer, p_minutes integer)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  daily_xp_cap constant integer := 3000;
  today date;
  xp_today integer;
  xp_given integer;
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
  perform public.require_subject(p_subject);
  today := public.player_today();

  -- Lock the wallet row first, so two awards at once can't both pay the same level-up or
  -- both fit under the daily cap.
  insert into public.wallets (user_id) values (uid) on conflict do nothing;
  select xp into xp_before from public.wallets where user_id = uid for update;
  select coalesce(sum(xp), 0) into xp_today
    from public.daily_activity where user_id = uid and day = today;
  xp_given := greatest(0, least(p_xp, daily_xp_cap - xp_today));

  insert into public.subject_progress as sp (user_id, subject_id, xp, minutes)
    values (uid, p_subject, xp_given, p_minutes)
    on conflict (user_id, subject_id) do update
      set xp = sp.xp + excluded.xp, minutes = sp.minutes + excluded.minutes;

  insert into public.daily_activity as da (user_id, day, xp, minutes)
    values (uid, today, xp_given, p_minutes)
    on conflict (user_id, day) do update
      set xp = da.xp + excluded.xp, minutes = least(1440, da.minutes + excluded.minutes);

  xp_after := xp_before + xp_given;
  lvl_before := public.level_for_xp(xp_before);
  lvl_after := public.level_for_xp(xp_after);
  gold_earned := (xp_after / 5 - xp_before / 5)
    + 5 * ((lvl_after * (lvl_after + 1)) / 2 - (lvl_before * (lvl_before + 1)) / 2);
  gems_earned := lvl_after / 5 - lvl_before / 5;
  update public.wallets
    set xp = xp_after, gold = gold + gold_earned, gems = gems + gems_earned
    where user_id = uid;

  day_status := public.check_daily_goal();
  select xp, gold, gems into w from public.wallets where user_id = uid;

  return jsonb_build_object(
    'xp', w.xp, 'gold', w.gold, 'gems', w.gems,
    'xp_earned', xp_given, 'gold_earned', gold_earned, 'gems_earned', gems_earned,
    'level_before', lvl_before, 'level', lvl_after
  ) || jsonb_build_object('today', day_status);
end;
$$;

create or replace function public.save_subject_state(p_subject text, p_state jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'state must be a JSON object' using errcode = '22023';
  end if;
  perform public.require_subject(p_subject);
  insert into public.subject_progress as sp (user_id, subject_id, state)
    values (uid, p_subject, p_state)
    on conflict (user_id, subject_id) do update set state = excluded.state;
end;
$$;

---------------------------------------------------------------------------------------------
-- 4. The licensed deck: licensees only.
---------------------------------------------------------------------------------------------
-- Written only with the secret key (dashboard or scripts), never through the Data API.
create table public.content_licensees (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.content_licensees enable row level security;
revoke all on public.content_licensees from anon, authenticated;

-- Sign-ups are invite-only (ADR 0016) and Adam is the only account on both projects, so the
-- accounts that exist now are the licensee. Anyone who joins later is not, until added by hand.
insert into public.content_licensees (user_id) select id from auth.users on conflict do nothing;

-- A project with no accounts yet (prod before Adam's first sign-in) would otherwise have no
-- licensee: the first account ever created becomes it. Later accounts don't.
create function public.first_account_is_licensee() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.content_licensees) then
    insert into public.content_licensees (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.first_account_is_licensee() from public, anon, authenticated;
create trigger on_auth_user_created_licensee after insert on auth.users
  for each row execute function public.first_account_is_licensee();

create function public.is_content_licensee() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and exists (select 1 from public.content_licensees where user_id = auth.uid())
$$;
revoke execute on function public.is_content_licensee() from public, anon;
grant execute on function public.is_content_licensee() to authenticated;

drop policy "signed-in users read content" on public.content_items;
drop policy "signed-in users read lessons" on public.content_lessons;
drop policy "signed-in users read private media" on storage.objects;
create policy "licensees read content" on public.content_items for select to authenticated
  using ((select public.is_content_licensee()));
create policy "licensees read lessons" on public.content_lessons for select to authenticated
  using ((select public.is_content_licensee()));
create policy "licensees read private media" on storage.objects for select to authenticated
  using (bucket_id = 'private-media' and (select public.is_content_licensee()));

-- The bucket stays private even if it was ever changed by hand.
update storage.buckets set public = false where id = 'private-media';

---------------------------------------------------------------------------------------------
-- Execute rights for the functions replaced above (create or replace keeps them, but be explicit).
---------------------------------------------------------------------------------------------
revoke execute on function public.check_daily_goal(), public.set_daily_goal(integer),
  public.set_time_zone(text), public.record_progress(text, integer, integer),
  public.save_subject_state(text, jsonb) from public, anon;
grant execute on function public.check_daily_goal(), public.set_daily_goal(integer),
  public.set_time_zone(text), public.record_progress(text, integer, integer),
  public.save_subject_state(text, jsonb) to authenticated;
