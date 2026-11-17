-- Waymark: world events (task 4.4, #336, docs/game/events.md).
-- A few weeks a year the city keeps an event: the square is dressed (in the browser, from
-- content/core/events.json), one of the day's contracts is the event's own, and finishing the
-- day's contracts gives the event's chest instead of the wooden one. Events start and end by
-- the player's local date, every year, with no deploy. Missing one takes nothing away.

---------------------------------------------------------------------------------------------
-- 1. The events, and their chests (data: content/core/events.json, content/core/chests.json)
---------------------------------------------------------------------------------------------
insert into public.chest_drops values
  ('signal-chest', 'Signal chest', 30, 70, 0.3, 1, 1, 0.35, 0.1),
  ('beacon-chest', 'Beacon chest', 30, 70, 0.3, 1, 1, 0.35, 0.1),
  ('olive-chest', 'Olive-wood chest', 30, 70, 0.3, 1, 1, 0.35, 0.1),
  ('ink-chest', 'Scribe’s chest', 30, 70, 0.3, 1, 1, 0.35, 0.1);

create table public.world_events (
  id text primary key check (id ~ '^[a-z][a-z0-9-]{1,63}$'),
  name text not null,
  -- Month and day, both ends included; an event may run over the new year (starts > ends).
  starts text not null check (starts ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  ends text not null check (ends ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  chest text not null references public.chest_drops (kind)
);
alter table public.world_events enable row level security;
revoke all on public.world_events from anon, authenticated;

insert into public.world_events (id, name, starts, ends, chest) values
  ('radio-day', 'World Radio Day', '02-10', '02-16', 'signal-chest'),
  ('amateur-radio-day', 'World Amateur Radio Day', '04-15', '04-21', 'beacon-chest'),
  ('olive-harvest', 'The Olive Harvest', '10-20', '10-26', 'olive-chest'),
  ('arabic-language-day', 'World Arabic Language Day', '12-15', '12-21', 'ink-chest');

-- The event on a day, or null. If two ever overlapped, the one that started first wins.
create function public.event_on(today date) returns text
language sql stable security definer set search_path = '' as $$
  select e.id from public.world_events e
  where case when e.starts <= e.ends
             then to_char(today, 'MM-DD') between e.starts and e.ends
             else to_char(today, 'MM-DD') >= e.starts or to_char(today, 'MM-DD') <= e.ends end
  order by e.starts
  limit 1;
$$;
revoke execute on function public.event_on(date) from public, anon, authenticated;

---------------------------------------------------------------------------------------------
-- 2. The events' contracts: offered only in their week
---------------------------------------------------------------------------------------------
alter table public.contract_templates
  add column event_id text references public.world_events (id);

insert into public.contract_templates (id, subject_id, metric, kind, target, gold, text, event_id) values
  ('event-radio-day', 'morse', 'event', 'recognition-round', 2, 20, 'World Radio Day: play 2 rounds of Instant Recognition', 'radio-day'),
  ('event-amateur-radio-day', 'morse', 'event', 'drill-80', 1, 20, 'World Amateur Radio Day: key a sending drill at 80%', 'amateur-radio-day'),
  ('event-olive-harvest', 'arabic', 'event', 'coffee', 2, 20, 'The olive harvest: practice two rounds of phrases at the coffee corner', 'olive-harvest'),
  ('event-arabic-language-day', 'arabic', 'event', 'slate', 1, 20, 'Arabic Language Day: write letters on the slate', 'arabic-language-day');

-- As before (20261114000000), but an event's contracts are never picked outside its week, and
-- in its week one of them takes the last place on the board, if its subject is one the
-- player has started (a contract for a subject never opened would be no fun).
create or replace function public.pick_contracts(uid uuid, today date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  seed text := uid::text || ':' || today::text;
  started text[];
  per integer;
  s text;
  picks text[] := '{}';
  special text;
begin
  if exists (select 1 from public.daily_contracts where user_id = uid and day = today) then
    return;
  end if;
  started := array(
    select sp.subject_id from public.subject_progress sp
    where sp.user_id = uid
      and exists (select 1 from public.contract_templates t where t.subject_id = sp.subject_id)
    order by md5(seed || sp.subject_id)
    limit 2);
  picks := picks || array(
    select t.id from public.contract_templates t
    where t.subject_id is null and t.event_id is null
      and (t.metric <> 'subjects' or cardinality(started) >= 2)
    order by md5(seed || t.id)
    limit 1);
  per := case when cardinality(started) = 1 then 2 else 1 end;
  foreach s in array started loop
    picks := picks || array(
      select t.id from public.contract_templates t
      where t.subject_id = s and t.event_id is null
        and (t.requires_kind is null or exists (
          select 1 from public.subject_events e
          where e.user_id = uid and e.subject_id = s and e.kind = t.requires_kind
            and e.day < today and e.count > 0))
      order by md5(seed || t.id)
      limit per);
  end loop;
  select t.id into special from public.contract_templates t
  where t.event_id = public.event_on(today) and t.subject_id = any (started)
  order by md5(seed || t.id)
  limit 1;
  if special is not null and cardinality(picks) > 0 then
    picks[cardinality(picks)] := special;
  end if;
  insert into public.daily_contracts (user_id, day, template_id, slot)
    select uid, today, p.id, p.n from unnest(picks) with ordinality as p(id, n)
    on conflict do nothing;
end;
$$;
revoke execute on function public.pick_contracts(uuid, date) from public, anon, authenticated;

---------------------------------------------------------------------------------------------
-- 3. The event's chest for a day's contracts
---------------------------------------------------------------------------------------------
-- As before (20261111000000), but in an event's week the day's contracts give its chest.
create or replace function public.grant_chests(uid uuid, today date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  streak integer;
begin
  -- All of today's contracts paid.
  if (select count(*) = 3 and bool_and(paid_gold is not null) from public.daily_contracts
      where user_id = uid and day = today) then
    insert into public.chests (user_id, kind, source, source_key)
      select uid,
             coalesce((select e.chest from public.world_events e
                       where e.id = public.event_on(today)), s.chest),
             'contracts', today::text
      from public.chest_sources s
      where s.source = 'contracts'
      on conflict do nothing;
  end if;
  -- Each trial passed, ever (the trial-<chapter> events, ADR 0033).
  insert into public.chests (user_id, kind, source, source_key)
    select distinct uid, s.chest, 'trial', e.subject_id || ':' || substr(e.kind, 7)
    from public.subject_events e cross join public.chest_sources s
    where e.user_id = uid and e.kind ~ '^trial-[0-9]+$' and s.source = 'trial'
    on conflict do nothing;
  -- Streak days 7, 30 and 100, once today's goal is reached. Shielded days don't count
  -- (ADR 0034), so a shield never earns one by itself.
  if exists (select 1 from public.daily_activity
             where user_id = uid and day = today and goal_reached) then
    streak := public.current_streak();
    insert into public.chests (user_id, kind, source, source_key)
      select uid, s.chest, 'streak', today::text || ':' || s.days from public.chest_sources s
      where s.source = 'streak' and s.days = streak
      on conflict do nothing;
  end if;
end;
$$;
revoke execute on function public.grant_chests(uuid, date) from public, anon, authenticated;
