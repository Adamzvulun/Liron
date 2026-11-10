-- Waymark: the echo well's contracts and achievements (E14, #197). Applies to dev on merge and
-- to prod on release (ADR 0018).
--
-- The well sends `pairs-round` for each round of ear training, `heard-<pair>` once when a pair
-- is heard (twenty right in a row), and `shadow-sentence` counting the sentences shadowed.

insert into public.subject_event_kinds (subject_id, kind, daily_cap) values
  ('arabic', 'pairs-round', 100),
  ('arabic', 'shadow-sentence', 100),
  ('arabic', 'heard-hah-heh', 1),
  ('arabic', 'heard-ain-hamza', 1),
  ('arabic', 'heard-khah-hah', 1),
  ('arabic', 'heard-ghain-khah', 1),
  ('arabic', 'heard-sad-seen', 1),
  ('arabic', 'heard-dad-dal', 1),
  ('arabic', 'heard-tah-teh', 1),
  ('arabic', 'heard-qaf-kaf', 1);

insert into public.contract_templates (id, subject_id, metric, kind, target, gold, text) values
  ('arabic-echo', 'arabic', 'event', 'pairs-round', 2, 15, 'Play 2 rounds at the echo well'),
  ('arabic-shadow', 'arabic', 'event', 'shadow-sentence', 5, 15, 'Shadow 5 sentences at the echo well');

-- A new condition: `event-total`, every `kind` event ever sent in `subject`, added up (the
-- `events` condition counts how many different kinds were sent).
alter table public.achievements drop constraint achievements_condition_check;
alter table public.achievements add constraint achievements_condition_check check (
  condition ->> 'kind' in ('any-trial', 'streak', 'contracts', 'full-boards', 'chests',
                           'two-subjects', 'levels', 'events', 'event-total', 'hours', 'minutes')
  and jsonb_typeof(condition -> 'n') = 'number');

insert into public.achievements (id, condition, gems, title) values
  ('sharp-ears', '{"kind": "events", "subject": "arabic", "kinds": ["heard-hah-heh", "heard-ain-hamza", "heard-khah-hah", "heard-ghain-khah", "heard-sad-seen", "heard-dad-dal", "heard-tah-teh", "heard-qaf-kaf"], "n": 8}', 3, null),
  ('echo', '{"kind": "event-total", "subject": "arabic", "kind_of": "shadow-sentence", "n": 100}', 3, null);

-- As before (20261118000000), with `event-total`.
create or replace function public.achievement_count(uid uuid, c jsonb) returns integer
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
  when 'event-total' then
    return coalesce((select sum(count) from public.subject_events
            where user_id = uid and subject_id = c ->> 'subject' and kind = c ->> 'kind_of'), 0);
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
