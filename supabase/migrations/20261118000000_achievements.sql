-- Waymark: achievements, gems and titles (#177, ADR 0035). Applies to dev on merge and to prod
-- on release (ADR 0018).
--
-- An achievement is a row of data (content/core/achievements.json; a test keeps the two equal).
-- The database checks each one from what it already records, pays its gems once, and the
-- titles some of them unlock are the only titles a player can wear.

-- The rush's call copied at 30 wpm or faster (Overspeed).
insert into public.subject_event_kinds (subject_id, kind, daily_cap) values
  ('morse', 'rush-30', 1);

create table public.achievements (
  id text primary key check (id ~ '^[a-z][a-z0-9-]{1,63}$'),
  -- {kind, n, ...}: what is counted, and how many it takes. See achievement_count.
  condition jsonb not null check (
    condition ->> 'kind' in ('any-trial', 'streak', 'contracts', 'full-boards', 'chests',
                             'two-subjects', 'levels', 'events', 'hours', 'minutes')
    and jsonb_typeof(condition -> 'n') = 'number'),
  gems integer not null check (gems between 1 and 5),
  -- The title it unlocks, if any.
  title text check (char_length(title) between 1 and 40)
);
alter table public.achievements enable row level security;
revoke all on public.achievements from anon, authenticated;

create table public.player_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null references public.achievements (id),
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
alter table public.player_achievements enable row level security;
create policy "own achievements: read" on public.player_achievements for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.player_achievements from anon, authenticated;
grant select on public.player_achievements to authenticated;

insert into public.achievements (id, condition, gems, title) values
  ('first-light', '{"kind": "any-trial", "n": 1}', 1, null),
  ('week-of-embers', '{"kind": "streak", "n": 7}', 1, null),
  ('long-burn', '{"kind": "streak", "n": 30}', 3, 'the Steadfast'),
  ('hundred-days', '{"kind": "streak", "n": 100}', 5, 'the Unbroken'),
  ('contractor', '{"kind": "contracts", "n": 10}', 1, null),
  ('board-regular', '{"kind": "contracts", "n": 100}', 3, 'the Reliable'),
  ('full-board', '{"kind": "full-boards", "n": 10}', 2, null),
  ('chest-hunter', '{"kind": "chests", "n": 10}', 1, null),
  ('two-guilds', '{"kind": "two-subjects", "n": 2}', 1, null),
  ('polyglot', '{"kind": "levels", "subjects": ["arabic", "morse"], "n": 5}', 2, 'the Wayfarer'),
  ('beacon-relit', '{"kind": "events", "subject": "morse", "kinds": ["trial-1", "trial-2", "trial-3", "trial-4", "trial-5"], "n": 5}', 3, 'Keeper of the Beacon'),
  ('no-agn', '{"kind": "events", "subject": "morse", "kinds": ["words-perfect"], "n": 1}', 2, null),
  ('overspeed', '{"kind": "events", "subject": "morse", "kinds": ["rush-30"], "n": 1}', 2, 'the Quick-Eared'),
  ('seat-at-the-table', '{"kind": "events", "subject": "arabic", "kinds": ["trial-2", "trial-3", "trial-4", "trial-5", "trial-6", "trial-7", "trial-8", "trial-9", "trial-10", "trial-11"], "n": 10}', 3, 'Friend of the House'),
  ('night-owl', '{"kind": "hours", "from": 22, "to": 4, "n": 5}', 1, null),
  ('early-bird', '{"kind": "hours", "from": 4, "to": 7, "n": 5}', 1, null),
  ('thousand-minutes', '{"kind": "minutes", "n": 1000}', 3, 'the Diligent');

-- How far a player is toward a condition: met once it reaches condition.n.
--   any-trial     trials of any kind passed (trial-<anything> events)
--   streak        the current streak (a streak once reached is kept by the achievement)
--   contracts     daily contracts paid
--   full-boards   days with all 3 contracts paid
--   chests        chests opened
--   two-subjects  the most subjects practiced on one day
--   levels        the lowest level among `subjects`
--   events        how many of `kinds` were ever sent in `subject`
--   hours         days with a session saved between `from` and `to` o'clock, the player's time
--                 (wrapping past midnight; a night counts as the day it started)
--   minutes       minutes practiced in all
create function public.achievement_count(uid uuid, c jsonb) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  zone text;
  h_from integer;
  h_to integer;
begin
  case c ->> 'kind'
  when 'any-trial' then
    return (select count(distinct (subject_id, kind)) from public.subject_events
            where user_id = uid and kind like 'trial-%');
  when 'streak' then
    return public.current_streak();
  when 'contracts' then
    return (select count(*) from public.daily_contracts
            where user_id = uid and paid_gold is not null);
  when 'full-boards' then
    return (select count(*) from (
              select day from public.daily_contracts
              where user_id = uid and paid_gold is not null
              group by day having count(*) >= 3) d);
  when 'chests' then
    return (select count(*) from public.chests where user_id = uid and opened_at is not null);
  when 'two-subjects' then
    return coalesce((select max(n) from (
              select count(distinct subject_id) as n from public.subject_events
              where user_id = uid and kind = 'session' group by day) d), 0);
  when 'levels' then
    return coalesce((
      select min(case when sp.xp is null then 0 else public.level_for_xp(sp.xp) end)
      from jsonb_array_elements_text(c -> 'subjects') s(id)
      left join public.subject_progress sp on sp.user_id = uid and sp.subject_id = s.id), 0);
  when 'events' then
    return (select count(distinct kind) from public.subject_events
            where user_id = uid and subject_id = c ->> 'subject'
              and kind in (select jsonb_array_elements_text(c -> 'kinds')));
  when 'hours' then
    select time_zone into zone from public.profiles where id = uid;
    h_from := (c ->> 'from')::integer;
    h_to := (c ->> 'to')::integer;
    return (
      select count(distinct (l - make_interval(hours => case when h_from > h_to then h_to else 0 end))::date)
      from (select s.saved_at at time zone coalesce(zone, 'UTC') as l
            from public.saved_sessions s where s.user_id = uid) t
      where case when h_from > h_to
                 then extract(hour from l) >= h_from or extract(hour from l) < h_to
                 else extract(hour from l) >= h_from and extract(hour from l) < h_to end);
  when 'minutes' then
    return coalesce((select sum(minutes) from public.daily_activity where user_id = uid), 0);
  else
    return 0;
  end case;
exception when invalid_parameter_value then
  return 0; -- an unknown time zone: nothing counts until it's fixed
end;
$$;
revoke execute on function public.achievement_count(uuid, jsonb) from public, anon, authenticated;

-- Gives every achievement now met and pays its gems, once. Returns the ids given now.
create function public.grant_achievements(uid uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  a record;
  hit boolean;
  given text[] := '{}';
begin
  for a in select * from public.achievements
           where id not in (select achievement_id from public.player_achievements
                            where user_id = uid) loop
    if public.achievement_count(uid, a.condition) >= (a.condition ->> 'n')::integer then
      insert into public.player_achievements (user_id, achievement_id)
        values (uid, a.id) on conflict do nothing
        returning true into hit;
      if coalesce(hit, false) then
        update public.wallets set gems = gems + a.gems where user_id = uid;
        given := given || a.id;
      end if;
      hit := false;
    end if;
  end loop;
  return given;
end;
$$;
revoke execute on function public.grant_achievements(uuid) from public, anon, authenticated;

-- As before (20261117000000), then gives any achievement now earned: it runs after every save,
-- board opening and contract claim.
create or replace function public.grant_milestones(uid uuid) returns text[]
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
      when 'rank' then exists (
        select 1 from public.subject_events
        where user_id = uid and subject_id = i.milestone ->> 'subject'
          and kind = 'rank-' || (i.milestone ->> 'rank'))
      else false
    end;
    if met then
      insert into public.owned_items (user_id, item_id, source)
        values (uid, i.id, 'milestone') on conflict do nothing;
      given := given || i.id;
    end if;
  end loop;
  perform public.grant_achievements(uid);
  return given;
end;
$$;

-- The player's achievements for Your House: gives any now met (a chest opened since the last
-- save counts at once), then says which are earned, how far along the rest are, the title worn
-- and the gems held.
create function public.my_achievements() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  perform public.grant_achievements(uid);
  return jsonb_build_object(
    'title', (select title from public.profiles where id = uid),
    'gems', (select gems from public.wallets where user_id = uid),
    'achievements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'progress', least(public.achievement_count(uid, a.condition),
                          (a.condition ->> 'n')::integer),
        'target', (a.condition ->> 'n')::integer,
        'earned_at', p.earned_at) order by a.id)
      from public.achievements a
      left join public.player_achievements p on p.achievement_id = a.id and p.user_id = uid),
      '[]'::jsonb));
end;
$$;
revoke execute on function public.my_achievements() from public, anon;
grant execute on function public.my_achievements() to authenticated;

-- Titles: none by default (the HUD then shows the level's title), else one you've earned.
alter table public.profiles alter column title set default '';
update public.profiles set title = '' where title = 'Traveller';

create function public.set_title(p_title text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  t text := coalesce(p_title, '');
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if t <> '' and not exists (
    select 1 from public.player_achievements p
    join public.achievements a on a.id = p.achievement_id
    where p.user_id = uid and a.title = t) then
    raise exception 'that title is not yours yet' using errcode = '22023';
  end if;
  update public.profiles set title = t where id = uid;
  return t;
end;
$$;
revoke execute on function public.set_title(text) from public, anon;
grant execute on function public.set_title(text) to authenticated;
