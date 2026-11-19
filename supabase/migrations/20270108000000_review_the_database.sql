-- Waymark: a review of the database's functions (report §4dk, 2026-11-19). Applies to dev on
-- merge and to prod on release (ADR 0018). Each fix below names what it closes.

---------------------------------------------------------------------------------------------
-- 1. The finales' gear is earned, never bought, rolled or given
---------------------------------------------------------------------------------------------
-- The beacon lens and the innkeeper's pen are "earned no other way" (20270104, 20270105), but
-- only rank gear was kept off the stall, out of chests and out of gifts (all three ask
-- is_rank_gear). Gear a named trial gives now counts too; a numbered trial's gear (the breeches,
-- trial 1) stays on sale, as before.
create or replace function public.is_rank_gear(milestone jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(milestone ->> 'kind' = 'rank'
    or (milestone ->> 'kind' = 'trial' and jsonb_typeof(milestone -> 'chapter') = 'string'),
    false)
$$;
revoke execute on function public.is_rank_gear(jsonb) from public, anon, authenticated;

---------------------------------------------------------------------------------------------
-- 2. A finale is passed after the rank that opens it
---------------------------------------------------------------------------------------------
-- The app opens each finale at its road's last rank, but the database counted a finale's event
-- from anyone, so one save could claim its gear, its achievement and its title, and open the
-- master contracts (the order rule of 20261226 covered numbered trials and ranks only).
update public.subject_event_kinds k set requires = r.requires
  from (values
    ('morse', 'trial-forty-winters', 'rank-ghost'),
    ('arabic', 'trial-stranger-at-the-gate', 'rank-storyteller')
  ) as r (subject_id, kind, requires)
  where k.subject_id = r.subject_id and k.kind = r.kind;

---------------------------------------------------------------------------------------------
-- 3. Your own waiting requests are never listed to you (ADR 0042, trap 5)
---------------------------------------------------------------------------------------------
-- The friendships table was readable by the two players in a row, so a player who asked with a
-- code could read back whether a row appeared, and whose it was. The app reads friends only
-- through fellowship() and fellowship_requests(), so nobody reads the table any more.
drop policy "own friendships: read" on public.friendships;
revoke select on public.friendships from authenticated;

---------------------------------------------------------------------------------------------
-- 4. Names: the Arabic letter mark and the C1 controls too
---------------------------------------------------------------------------------------------
-- U+061C reorders a line like the other direction marks, and U+0080-009F are control
-- characters. New names may not carry them, and shown_name takes them out of old ones.
alter table public.profiles drop constraint profiles_display_name_plain;
alter table public.profiles add constraint profiles_display_name_plain check (
  display_name !~ '[\u0001-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]'
) not valid;

create or replace function public.shown_name(raw text) returns text
language sql immutable set search_path = '' as $$
  select left(btrim(regexp_replace(
    regexp_replace(coalesce(raw, ''),
      '[\u0001-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]', '', 'g'),
    '\s+', ' ', 'g')), 40)
$$;
revoke execute on function public.shown_name(text) from public, anon, authenticated;

---------------------------------------------------------------------------------------------
-- 5. A new player's first board
---------------------------------------------------------------------------------------------
-- As before (20270106000000), but a board picked before any subject was started is picked again
-- once one is.
create or replace function public.pick_contracts(uid uuid, today date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  seed text := uid::text || ':' || today::text;
  started text[];
  per integer;
  s text;
  picks text[] := '{}';
  special text;
  have integer;
  kept boolean;
begin
  started := array(
    select sp.subject_id from public.subject_progress sp
    where sp.user_id = uid
      and exists (select 1 from public.contract_templates t where t.subject_id = sp.subject_id)
    order by md5(seed || sp.subject_id)
    limit 2);
  -- A board stays as it was picked, unless it was picked before any subject was started: that
  -- one holds a single habit contract, so the day's contracts chest (all 3 paid) couldn't be
  -- earned. While it is unpaid and a subject has been started since, it is picked again in full.
  select count(*), coalesce(bool_or(c.paid_gold is not null or t.subject_id is not null), false)
    into have, kept
    from public.daily_contracts c join public.contract_templates t on t.id = c.template_id
    where c.user_id = uid and c.day = today;
  if have > 0 and (have > 1 or kept or cardinality(started) = 0) then
    return;
  end if;
  delete from public.daily_contracts where user_id = uid and day = today;
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
      order by t.tier desc, md5(seed || t.id)
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
-- 6. A challenge is answered once
---------------------------------------------------------------------------------------------
-- As before (20270101000000), but the challenge is locked while it is answered: two answers at
-- once both passed the open check, and the second replaced the first's score.
create or replace function public.answer_challenge(p_challenge uuid, p_session uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  c public.challenges;
  s public.round_scores;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into c from public.challenges where id = p_challenge and to_id = uid for update;
  if c.id is null or c.answered_at is not null or c.declined_at is not null
     or c.expires_at <= now() or not public.are_friends(c.from_id, uid) then
    raise exception 'that challenge is closed' using errcode = 'P0001', hint = 'closed';
  end if;
  select * into s from public.round_scores
    where user_id = uid and session_id = p_session and kind = c.kind and at > c.created_at;
  if s.kind is null then
    raise exception 'no such round' using errcode = 'P0001', hint = 'no-round';
  end if;
  update public.challenges set to_score = s.score, answered_at = now()
    where id = c.id and answered_at is null and declined_at is null;
end;
$$;


---------------------------------------------------------------------------------------------
-- 7. The limits' constants, like every other function (20261221000000)
---------------------------------------------------------------------------------------------
alter function public.site_ceiling(text) set search_path = '';
alter function public.friends_max() set search_path = '';
alter function public.friend_asks_per_day() set search_path = '';
alter function public.waiting_asks_max() set search_path = '';
alter function public.new_codes_per_day() set search_path = '';
alter function public.challenges_per_day() set search_path = '';
alter function public.open_challenges_max() set search_path = '';
alter function public.gifts_per_day() set search_path = '';
-- Only take_site_share reads the ceilings.
revoke execute on function public.site_ceiling(text) from public, anon, authenticated;

---------------------------------------------------------------------------------------------
-- 8. The master chat contract says what it counts
---------------------------------------------------------------------------------------------
-- It counts chats at the inn, with any regular, not two different regulars.
update public.contract_templates set text = 'Have 2 chats at the inn'
  where id = 'arabic-master-chat';
