-- Waymark: subject events and daily contracts (ADR 0032, #46). Applies to dev on merge and to
-- prod on release (ADR 0018).
--
-- Subjects report moments that matter (a Koch run at 90%, a letters session) as named events,
-- sent with the session save, so they are saved all or nothing with it (ADR 0031). Contract
-- templates are data (content/*/contracts.json, copied here; a test keeps them equal). Each day
-- the database picks a player's 3 contracts, counts their progress and pays gold once.

---------------------------------------------------------------------------------------------
-- 1. Events
---------------------------------------------------------------------------------------------
-- The kinds each subject may report, with a daily cap. Other kinds are ignored, so a subject
-- can't fill the table with junk and a typo never loses a session.
create table public.subject_event_kinds (
  subject_id text not null references public.subjects (id),
  kind text not null check (kind ~ '^[a-z][a-z0-9-]{1,31}$'),
  daily_cap integer not null default 100 check (daily_cap between 1 and 1000),
  primary key (subject_id, kind)
);
alter table public.subject_event_kinds enable row level security;
revoke all on public.subject_event_kinds from anon, authenticated;

-- How many of each event a player had per day and subject. `session` is the platform's own:
-- one for every saved session.
create table public.subject_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  subject_id text not null references public.subjects (id),
  kind text not null,
  count integer not null check (count between 0 and 1000),
  primary key (user_id, day, subject_id, kind)
);
alter table public.subject_events enable row level security;
create policy "own events: read" on public.subject_events for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.subject_events from anon, authenticated;
grant select on public.subject_events to authenticated;

---------------------------------------------------------------------------------------------
-- 2. Contract templates (data) and each day's picks and payouts
---------------------------------------------------------------------------------------------
create table public.contract_templates (
  id text primary key check (id ~ '^[a-z][a-z0-9-]{1,63}$'),
  -- null: a habit contract, offered to everyone
  subject_id text references public.subjects (id),
  -- event: count `kind` events of the subject; minutes, sessions, subjects: today's totals
  metric text not null check (metric in ('event', 'minutes', 'sessions', 'subjects')),
  kind text,
  target integer not null check (target between 1 and 1000),
  gold integer not null check (gold between 1 and 100),
  text text not null,
  check ((metric = 'event') = (subject_id is not null and kind is not null))
);
alter table public.contract_templates enable row level security;
revoke all on public.contract_templates from anon, authenticated;

insert into public.contract_templates (id, subject_id, metric, kind, target, gold, text) values
  ('habit-minutes', null, 'minutes', null, 25, 10, 'Practice 25 minutes today'),
  ('habit-sessions', null, 'sessions', null, 3, 10, 'Finish 3 sessions today'),
  ('habit-subjects', null, 'subjects', null, 2, 15, 'Practice two subjects today'),
  ('morse-run-90', 'morse', 'event', 'run-90', 1, 20, 'Pass a Koch run at 90%'),
  ('morse-runs', 'morse', 'event', 'run', 3, 15, 'Finish 3 Koch runs'),
  ('morse-recognition', 'morse', 'event', 'recognition-round', 2, 15, 'Play 2 rounds of Instant Recognition'),
  ('morse-recognition-best', 'morse', 'event', 'recognition-best', 1, 20, 'Beat your Instant Recognition best'),
  ('morse-drill-80', 'morse', 'event', 'drill-80', 1, 15, 'Key a sending drill at 80%'),
  ('arabic-letters-90', 'arabic', 'event', 'letters-90', 1, 20, 'Score 90% in a letters session'),
  ('arabic-letters', 'arabic', 'event', 'letters-session', 2, 15, 'Finish 2 letters sessions'),
  ('arabic-slate', 'arabic', 'event', 'slate', 1, 15, 'Write letters on the slate'),
  ('arabic-coffee', 'arabic', 'event', 'coffee', 1, 15, 'Practice phrases at the coffee corner');

insert into public.subject_event_kinds (subject_id, kind)
  select distinct subject_id, kind from public.contract_templates where metric = 'event';

-- The day's contracts, fixed once picked so the board stays the same all day.
create table public.daily_contracts (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  template_id text not null references public.contract_templates (id),
  slot integer not null check (slot between 1 and 3),
  paid_gold integer, -- null until paid
  paid_at timestamptz,
  primary key (user_id, day, template_id),
  unique (user_id, day, slot)
);
alter table public.daily_contracts enable row level security;
create policy "own contracts: read" on public.daily_contracts for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.daily_contracts from anon, authenticated;
grant select on public.daily_contracts to authenticated;

---------------------------------------------------------------------------------------------
-- 3. Picking, progress and paying
---------------------------------------------------------------------------------------------
-- Picks today's 3 if they aren't picked yet: 1 habit contract, then 1 from each subject the
-- player has started (up to 2, chosen by the seed), or 2 when only one is started. Seeded by
-- the player and the day, so every device shows the same board.
create function public.pick_contracts(uid uuid, today date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  seed text := uid::text || ':' || today::text;
  started text[];
  per integer;
  s text;
  picks text[] := '{}';
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
    where t.subject_id is null and (t.metric <> 'subjects' or cardinality(started) >= 2)
    order by md5(seed || t.id)
    limit 1);
  per := case when cardinality(started) = 1 then 2 else 1 end;
  foreach s in array started loop
    picks := picks || array(
      select t.id from public.contract_templates t
      where t.subject_id = s
      order by md5(seed || t.id)
      limit per);
  end loop;
  insert into public.daily_contracts (user_id, day, template_id, slot)
    select uid, today, p.id, p.n from unnest(picks) with ordinality as p(id, n)
    on conflict do nothing;
end;
$$;
revoke execute on function public.pick_contracts(uuid, date) from public, anon, authenticated;

-- Today's contracts with their progress.
create function public.contract_progress(uid uuid, today date)
returns table (
  id text, subject_id text, text text, target integer, gold integer, progress integer,
  paid boolean, slot integer
)
language sql stable security definer set search_path = '' as $$
  select t.id, t.subject_id, t.text, t.target, t.gold,
    least(t.target, case t.metric
      when 'minutes' then (select coalesce(max(a.minutes), 0) from public.daily_activity a
                           where a.user_id = uid and a.day = today)
      when 'sessions' then (select coalesce(sum(e.count), 0) from public.subject_events e
                            where e.user_id = uid and e.day = today and e.kind = 'session')
      when 'subjects' then (select count(distinct e.subject_id) from public.subject_events e
                            where e.user_id = uid and e.day = today and e.kind = 'session'
                              and e.count > 0)
      else (select coalesce(sum(e.count), 0) from public.subject_events e
            where e.user_id = uid and e.day = today and e.subject_id = t.subject_id
              and e.kind = t.kind)
    end)::integer,
    dc.paid_gold is not null, dc.slot
  from public.daily_contracts dc
  join public.contract_templates t on t.id = dc.template_id
  where dc.user_id = uid and dc.day = today
  order by dc.slot
$$;
revoke execute on function public.contract_progress(uuid, date) from public, anon, authenticated;

-- Pays every finished, unpaid contract of today, once (the update only takes unpaid rows, and
-- its row lock makes two saves at once pay once). Returns the ids paid now.
create function public.claim_contracts(uid uuid, today date) returns text[]
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
  return paid;
end;
$$;
revoke execute on function public.claim_contracts(uuid, date) from public, anon, authenticated;

-- The board: picks today's contracts if needed, pays any that are finished, and returns them,
-- the ids paid just now and the wallet's gold.
create function public.todays_contracts() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date;
  paid text[];
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  today := public.player_today();
  perform public.pick_contracts(uid, today);
  paid := public.claim_contracts(uid, today);
  return jsonb_build_object(
    'day', today,
    'contracts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'subject', c.subject_id, 'text', c.text, 'target', c.target,
        'gold', c.gold, 'progress', c.progress, 'paid', c.paid) order by c.slot)
      from public.contract_progress(uid, today) c), '[]'::jsonb),
    'paid_now', to_jsonb(paid),
    'gold', (select w.gold from public.wallets w where w.user_id = uid)
  );
end;
$$;
revoke execute on function public.todays_contracts() from public, anon;
grant execute on function public.todays_contracts() to authenticated;

---------------------------------------------------------------------------------------------
-- 4. save_session records the session's events and pays finished contracts
---------------------------------------------------------------------------------------------
drop function public.save_session(text, uuid, jsonb, jsonb, jsonb, integer, integer);

create function public.save_session(
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
  for r in select value from jsonb_array_elements(events) loop
    n := case when jsonb_typeof(r->'count') = 'number' then (r->>'count')::integer else 1 end;
    select k.daily_cap into cap from public.subject_event_kinds k
      where k.subject_id = p_subject and k.kind = r->>'kind';
    if cap is not null and n between 1 and 100 then
      insert into public.subject_events as e (user_id, day, subject_id, kind, count)
        values (uid, today, p_subject, r->>'kind', least(cap, n))
        on conflict (user_id, day, subject_id, kind)
          do update set count = least(cap, e.count + excluded.count);
    end if;
    cap := null;
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

revoke execute on function public.save_session(text, uuid, jsonb, jsonb, jsonb, integer, integer, jsonb)
  from public, anon;
grant execute on function public.save_session(text, uuid, jsonb, jsonb, jsonb, integer, integer, jsonb)
  to authenticated;
