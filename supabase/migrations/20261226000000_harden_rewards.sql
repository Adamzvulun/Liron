-- Waymark: harden the rewards before friends join (M5; report §4au, HANDOFF 7a). Applies to dev
-- on merge and to prod on release (ADR 0018). Each of these let a player cheat only for
-- themselves; none touched anyone else's data.
--
-- 1. Trials and ranks in order. A trial's chest, a rank's gear and the achievements counted from
--    them could be claimed by saving trial-N or rank-<id> without the ones before it. Now an event
--    kind may name the event it requires, and save_session counts it only once the player has
--    that one. A numeric trial requires the trial before it (a trigger fills that in, so later
--    migrations that register trial-N are covered); each rank requires the rank below it. The
--    Morse trials 6-12, which have no lessons, are no longer registered.
-- 2. The review and rating tables are written only by save_session, through functions no player
--    can call on their own, which cap the JSON's size. Signed-in users kept insert and update grants from before save_session
--    (ADR 0031) did those writes, so a player could fill the free database.
-- 3. A time-zone change may not move the player's day backward, so it can't repair a missed
--    streak day. Someone flying west gets the new zone once its date catches up (a few hours).

---------------------------------------------------------------------------------------------
-- 1. Events that require another
---------------------------------------------------------------------------------------------
alter table public.subject_event_kinds add column requires text
  check (requires is null or requires ~ '^[a-z][a-z0-9-]{1,31}$');

-- trial-N requires trial-(N-1), unless the row names something else.
create function public.event_kind_requires() returns trigger
language plpgsql set search_path = '' as $$
declare
  n integer := (substring(new.kind from '^trial-([0-9]{1,6})$'))::integer;
begin
  if new.requires is null and n > 1 then
    new.requires := 'trial-' || (n - 1);
  end if;
  return new;
end;
$$;
revoke execute on function public.event_kind_requires() from public, anon, authenticated;

create trigger subject_event_kinds_requires before insert on public.subject_event_kinds
  for each row execute function public.event_kind_requires();

delete from public.subject_event_kinds
  where subject_id = 'morse' and kind ~ '^trial-([6-9]|1[0-2])$';

update public.subject_event_kinds
  set requires = 'trial-' || ((substring(kind from '^trial-([0-9]{1,6})$'))::integer - 1)
  where kind ~ '^trial-[0-9]{1,6}$' and (substring(kind from '^trial-([0-9]{1,6})$'))::integer > 1;

update public.subject_event_kinds k set requires = r.requires
  from (values
    ('morse', 'rank-keyer', 'rank-listener'),
    ('morse', 'rank-operator', 'rank-keyer'),
    ('morse', 'rank-telegraphist', 'rank-operator'),
    ('morse', 'rank-signal-master', 'rank-telegraphist'),
    ('morse', 'rank-ghost', 'rank-signal-master'),
    ('arabic', 'rank-traveler', 'rank-guest'),
    ('arabic', 'rank-neighbor', 'rank-traveler'),
    ('arabic', 'rank-friend', 'rank-neighbor'),
    ('arabic', 'rank-local', 'rank-friend'),
    ('arabic', 'rank-storyteller', 'rank-local')
  ) as r (subject_id, kind, requires)
  where k.subject_id = r.subject_id and k.kind = r.kind;

-- Trials passed or ranks taken before their event kind was registered (trials 2-11 shipped a day
-- before it) left no event, and the order rule would now hold every later one back. Once, fill in
-- what each player's saved progress already records: Arabic's Painted Sign (`guest`, trial 1),
-- `words.trials` and `ranks`, Morse's `trials` and `ranks`. Only registered kinds, only where no
-- event exists yet; the chests and gear they earned arrive with the next save.
create function public.backfill_ordered_events() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  added integer;
begin
  insert into public.subject_events (user_id, day, subject_id, kind, count)
  select distinct p.user_id, (now() at time zone coalesce(pr.time_zone, 'UTC'))::date,
    p.subject_id, t.kind, 1
  from public.subject_progress p
  left join public.profiles pr on pr.id = p.user_id
  cross join lateral (
    select 'trial-' || value as kind from jsonb_array_elements_text(
      case
        when p.subject_id = 'arabic' and jsonb_typeof(p.state->'words'->'trials') = 'array'
          then p.state->'words'->'trials'
        when p.subject_id = 'morse' and jsonb_typeof(p.state->'trials') = 'array'
          then p.state->'trials'
        else '[]'::jsonb
      end) as value
    where value ~ '^[0-9]{1,6}$'
    union
    select 'trial-1' where p.subject_id = 'arabic' and p.state->>'guest' = 'true'
    union
    select 'rank-' || value from jsonb_array_elements_text(
      case when jsonb_typeof(p.state->'ranks') = 'array' then p.state->'ranks' else '[]'::jsonb end
    ) as value
    where value ~ '^[a-z][a-z0-9-]{0,25}$'
  ) as t
  where exists (
      select 1 from public.subject_event_kinds k
      where k.subject_id = p.subject_id and k.kind = t.kind)
    and not exists (
      select 1 from public.subject_events e
      where e.user_id = p.user_id and e.subject_id = p.subject_id and e.kind = t.kind)
  on conflict do nothing;
  get diagnostics added = row_count;
  return added;
end;
$$;
revoke execute on function public.backfill_ordered_events() from public, anon, authenticated;
select public.backfill_ordered_events();

-- save_session as in 20261109000000_daily_contracts.sql, with two changes in the events loop:
-- trials are taken in number order (the rest keep theirs), and a kind that requires another
-- counts only once the player has had that one, on any day or earlier in this save.
create or replace function public.save_session(
  p_subject text,
  p_session uuid,
  p_state jsonb,
  p_reviews jsonb,
  p_results jsonb,
  p_xp integer,
  p_minutes integer,
  p_events jsonb default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  reviews jsonb := coalesce(p_reviews, '[]'::jsonb);
  results jsonb := coalesce(p_results, '[]'::jsonb);
  events jsonb := coalesce(p_events, '[]'::jsonb);
  xp integer := coalesce(p_xp, 0);
  minutes integer := coalesce(p_minutes, 0);
  r jsonb;
  fresh integer;
  award jsonb := null;
  today date;
  n integer;
  cap integer;
  need text;
  paid text[];
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_session is null then
    raise exception 'a session id is required' using errcode = '22023';
  end if;
  perform public.require_subject(p_subject);
  if jsonb_typeof(reviews) <> 'array' or jsonb_typeof(results) <> 'array'
     or jsonb_typeof(events) <> 'array' then
    raise exception 'reviews, results and events must be JSON arrays' using errcode = '22023';
  end if;
  if jsonb_array_length(reviews) > 200 or jsonb_array_length(results) > 200
     or jsonb_array_length(events) > 50 then
    raise exception 'at most 200 reviews, 200 results and 50 events a session'
      using errcode = '22023';
  end if;

  insert into public.saved_sessions (user_id, session_id, subject_id)
    values (uid, p_session, p_subject)
    on conflict do nothing;
  get diagnostics fresh = row_count;
  if fresh = 0 then
    return jsonb_build_object('duplicate', true, 'award', null, 'contracts_paid', '[]'::jsonb);
  end if;

  if p_state is not null then
    perform public.save_subject_state(p_subject, p_state);
  end if;
  for r in select value from jsonb_array_elements(reviews) loop
    perform public.record_review(
      p_subject, r->>'item', (r->>'rating')::integer, (r->>'reviewed_at')::timestamptz,
      (r->>'due')::timestamptz, (r->>'state')::integer, r->'card', r->'log');
  end loop;
  for r in select value from jsonb_array_elements(results) loop
    perform public.record_result(
      p_subject, r->>'skill', r->>'item', (r->>'score')::real, (r->>'rated_at')::timestamptz,
      r->'learner', r->'item_rating');
  end loop;

  -- Events: the platform's `session`, then the subject's own, each up to its daily cap.
  today := public.player_today();
  insert into public.subject_events as e (user_id, day, subject_id, kind, count)
    values (uid, today, p_subject, 'session', 1)
    on conflict (user_id, day, subject_id, kind) do update set count = least(100, e.count + 1);
  for r in
    select x.value from jsonb_array_elements(events) with ordinality as x (value, i)
    order by coalesce((substring(x.value->>'kind' from '^trial-([0-9]{1,6})$'))::integer, 0), x.i
  loop
    n := case when jsonb_typeof(r->'count') = 'number' then (r->>'count')::integer else 1 end;
    select k.daily_cap, k.requires into cap, need from public.subject_event_kinds k
      where k.subject_id = p_subject and k.kind = r->>'kind';
    if cap is not null and n between 1 and 100
       and (need is null or exists (
         select 1 from public.subject_events e
         where e.user_id = uid and e.subject_id = p_subject and e.kind = need)) then
      insert into public.subject_events as e (user_id, day, subject_id, kind, count)
        values (uid, today, p_subject, r->>'kind', least(cap, n))
        on conflict (user_id, day, subject_id, kind)
          do update set count = least(cap, e.count + excluded.count);
    end if;
    cap := null;
    need := null;
  end loop;

  if xp > 0 or minutes > 0 then
    award := public.record_progress(p_subject, xp, minutes);
  end if;

  -- Contracts last, so this session's minutes and events count.
  perform public.pick_contracts(uid, today);
  paid := public.claim_contracts(uid, today);
  if award is not null and cardinality(paid) > 0 then
    award := award || jsonb_build_object(
      'gold', (select w.gold from public.wallets w where w.user_id = uid));
  end if;
  return jsonb_build_object('duplicate', false, 'award', award, 'contracts_paid', to_jsonb(paid));
end;
$$;

---------------------------------------------------------------------------------------------
-- 2. Review and rating tables: written only by the functions, and their JSON capped
---------------------------------------------------------------------------------------------
revoke insert, update, delete on public.review_cards, public.review_log, public.skill_ratings,
  public.item_ratings, public.rating_log from authenticated;

-- An FSRS card or log entry is about 250 bytes; 2 kB leaves room. Not valid: rows already saved
-- aren't checked again, new ones are.
alter table public.review_cards add constraint review_cards_card_size
  check (pg_column_size(card) <= 2048) not valid;
alter table public.review_log add constraint review_log_log_size
  check (pg_column_size(log) <= 2048) not valid;

-- As in 20261103000000_spaced_repetition.sql, but security definer (it writes only the caller's
-- rows) and with the size cap.
create or replace function public.record_review(
  p_subject text, p_item text, p_rating integer, p_reviewed_at timestamptz,
  p_due timestamptz, p_state integer, p_card jsonb, p_log jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  perform public.require_subject(p_subject);
  if p_reviewed_at > now() + interval '1 day' then
    raise exception 'review time is in the future' using errcode = '22023';
  end if;
  if jsonb_typeof(p_card) <> 'object' or jsonb_typeof(p_log) <> 'object' then
    raise exception 'card and log must be JSON objects' using errcode = '22023';
  end if;
  if pg_column_size(p_card) > 2048 or pg_column_size(p_log) > 2048 then
    raise exception 'card and log must be at most 2 kB each' using errcode = '22023';
  end if;
  insert into public.review_cards as rc (user_id, subject_id, item_id, due, state, card)
    values (uid, p_subject, p_item, p_due, p_state, p_card)
    on conflict (user_id, subject_id, item_id) do update
      set due = excluded.due, state = excluded.state, card = excluded.card;
  insert into public.review_log (user_id, subject_id, item_id, rating, reviewed_at, log)
    values (uid, p_subject, p_item, p_rating, p_reviewed_at, p_log);
end;
$$;

-- Its numbers are already bounded by the tables' checks; it only becomes security definer.
alter function public.record_result(text, text, text, real, timestamptz, jsonb, jsonb)
  security definer;

-- Both are called only by save_session (which runs as their owner), never by a player directly:
-- otherwise a loop of calls could still fill the logs, and set any rating it liked.
revoke execute on function public.record_review(text, text, integer, timestamptz, timestamptz,
  integer, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.record_result(text, text, text, real, timestamptz, jsonb, jsonb)
  from public, anon, authenticated;

---------------------------------------------------------------------------------------------
-- 3. A time-zone change never moves the player's day backward
---------------------------------------------------------------------------------------------
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
      and (time_zone_set_at is null or time_zone_set_at < now() - interval '20 hours')
      and (now() at time zone p_zone)::date >= public.player_today();
end;
$$;
