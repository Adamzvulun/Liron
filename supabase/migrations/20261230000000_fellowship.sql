-- Waymark: friend codes and the Fellowship list (task 3.1, #326; docs/game/fellowship-build.md,
-- ADR 0039, ADR 0042). The first time one player's data reaches another player's screen.
--
-- The rules from fellowship-build.md, kept here:
--   * No views. Friends see each other only through fellowship(), which names every field it
--     returns (§3). Nothing here adds a select policy to an existing table.
--   * Subject state is never read: ranks come from the rank-<id> events (trap 2).
--   * Names are cleaned on the way out and refused with control or direction characters (trap 4).
--   * A code is never a search key: ask_friend answers the same whatever the code, and is
--     limited per day, failures included (trap 5).

---------------------------------------------------------------------------------------------
-- 1. Tables: read your own rows; written only by the functions below
---------------------------------------------------------------------------------------------
create table public.friend_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[A-HJKMNP-Z2-9]{8}$')
);
alter table public.friend_codes enable row level security;
revoke all on public.friend_codes from anon, authenticated;
grant select on public.friend_codes to authenticated;
create policy "own code: read" on public.friend_codes for select to authenticated
  using (user_id = (select auth.uid()));

-- A pair exists once: low < high. accepted_at is null while the request waits.
create table public.friendships (
  low uuid not null references auth.users (id) on delete cascade,
  high uuid not null references auth.users (id) on delete cascade,
  asked_by uuid not null references auth.users (id) on delete cascade,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (low, high),
  check (low < high),
  check (asked_by in (low, high))
);
create index friendships_high on public.friendships (high);
alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;
create policy "own friendships: read" on public.friendships for select to authenticated
  using ((select auth.uid()) in (low, high));

-- How many asks and new codes a player used today (UTC). Nobody reads it through the API.
create table public.fellowship_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('ask', 'code')),
  used integer not null check (used >= 0),
  primary key (user_id, day, kind)
);
alter table public.fellowship_limits enable row level security;
revoke all on public.fellowship_limits from anon, authenticated;

---------------------------------------------------------------------------------------------
-- 2. Names others will read (trap 4)
---------------------------------------------------------------------------------------------
-- Control characters and the marks that reorder a line. `not valid`: names saved before this
-- aren't checked (fellowship() cleans them on the way out anyway); every new one is.
alter table public.profiles add constraint profiles_display_name_plain check (
  display_name !~ '[\u0001-\u001f\u007f‎‏‪-‮⁦-⁩]'
) not valid;

create function public.shown_name(raw text) returns text
language sql immutable set search_path = '' as $$
  select left(btrim(regexp_replace(
    regexp_replace(coalesce(raw, ''), '[\u0001-\u001f\u007f‎‏‪-‮⁦-⁩]', '', 'g'),
    '\s+', ' ', 'g')), 40)
$$;
revoke execute on function public.shown_name(text) from public, anon, authenticated;

---------------------------------------------------------------------------------------------
-- 3. Limits
---------------------------------------------------------------------------------------------
create function public.friends_max() returns integer language sql immutable as $$ select 20 $$;
create function public.friend_asks_per_day() returns integer language sql immutable as $$ select 10 $$;
create function public.waiting_asks_max() returns integer language sql immutable as $$ select 5 $$;
create function public.new_codes_per_day() returns integer language sql immutable as $$ select 3 $$;

-- Takes one of today's asks or new codes; raises when they're used up.
create function public.take_fellowship_turn(uid uuid, what text, cap integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  taken integer;
begin
  insert into public.fellowship_limits as l (user_id, day, kind, used)
    values (uid, (now() at time zone 'utc')::date, what, 1)
    on conflict (user_id, day, kind) do update set used = l.used + 1
    where l.used < cap
    returning l.used into taken;
  if taken is null then
    raise exception 'that''s enough for today' using errcode = 'P0001', hint = 'daily-limit';
  end if;
end;
$$;
revoke execute on function public.take_fellowship_turn(uuid, text, integer)
  from public, anon, authenticated;

create function public.friend_count(uid uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.friendships
  where uid in (low, high) and accepted_at is not null
$$;
revoke execute on function public.friend_count(uuid) from public, anon, authenticated;

---------------------------------------------------------------------------------------------
-- 4. Codes
---------------------------------------------------------------------------------------------
-- 8 characters from 31 (no 0, O, 1, I or L), from random bytes.
create function public.make_friend_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  code text := '';
  i integer;
begin
  bytes := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid());
  -- Bytes 6 and 8 of a v4 uuid carry its version and variant: skip them.
  foreach i in array array[0, 1, 2, 3, 4, 5, 7, 9] loop
    code := code || substr(alphabet, 1 + get_byte(bytes, i) % 31, 1);
  end loop;
  return code;
end;
$$;
revoke execute on function public.make_friend_code() from public, anon, authenticated;

-- Your code, made the first time you ask for it.
create function public.my_friend_code() returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  found text;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select code into found from public.friend_codes where user_id = uid;
  while found is null loop
    insert into public.friend_codes (user_id, code) values (uid, public.make_friend_code())
      on conflict do nothing
      returning code into found;
    if found is null then
      select code into found from public.friend_codes where user_id = uid;
    end if;
  end loop;
  return found;
end;
$$;

-- A new code, which makes the old one useless. 3 a day.
create function public.new_friend_code() returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  made text;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  perform public.take_fellowship_turn(uid, 'code', public.new_codes_per_day());
  loop
    begin
      made := public.make_friend_code();
      insert into public.friend_codes (user_id, code) values (uid, made)
        on conflict (user_id) do update set code = excluded.code;
      return made;
    exception when unique_violation then
      -- Someone else has that code: draw again.
    end;
  end loop;
end;
$$;

---------------------------------------------------------------------------------------------
-- 5. Asking, answering, removing
---------------------------------------------------------------------------------------------
-- Asks the code's owner to be friends. Answers nothing, whatever the code: a real one, a wrong
-- one, your own or a friend's (trap 5). If they had already asked you, you're now friends.
-- Refuses (an error) only for limits that say nothing about the code: 10 asks a day,
-- 5 of your requests waiting, 20 friends.
create function public.ask_friend(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  other uuid;
  pair public.friendships;
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  perform public.take_fellowship_turn(uid, 'ask', public.friend_asks_per_day());
  if (select count(*) from public.friendships
      where asked_by = uid and accepted_at is null) >= public.waiting_asks_max() then
    raise exception 'too many requests waiting' using errcode = 'P0001', hint = 'waiting';
  end if;
  if public.friend_count(uid) >= public.friends_max() then
    raise exception 'too many friends' using errcode = 'P0001', hint = 'full';
  end if;
  select user_id into other from public.friend_codes
    where code = upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
  if other is null or other = uid then
    return;
  end if;
  select * into pair from public.friendships
    where low = least(uid, other) and high = greatest(uid, other);
  if pair.low is null then
    insert into public.friendships (low, high, asked_by)
      values (least(uid, other), greatest(uid, other), uid);
  elsif pair.accepted_at is null and pair.asked_by = other
        and public.friend_count(other) < public.friends_max() then
    update public.friendships set accepted_at = now()
      where low = pair.low and high = pair.high;
  end if;
end;
$$;

-- Accepts a request someone sent you, or declines it (the row goes; the asker isn't told).
create function public.answer_friend(p_other uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_accept then
    if public.friend_count(uid) >= public.friends_max()
       or public.friend_count(p_other) >= public.friends_max() then
      raise exception 'too many friends' using errcode = 'P0001', hint = 'full';
    end if;
    update public.friendships set accepted_at = now()
      where low = least(uid, p_other) and high = greatest(uid, p_other)
        and asked_by = p_other and accepted_at is null;
  else
    delete from public.friendships
      where low = least(uid, p_other) and high = greatest(uid, p_other)
        and asked_by = p_other and accepted_at is null;
  end if;
end;
$$;

-- Ends a friendship, or takes back a request, from either side at any time.
create function public.remove_friend(p_other uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from public.friendships
    where low = least(uid, p_other) and high = greatest(uid, p_other);
end;
$$;

---------------------------------------------------------------------------------------------
-- 6. What friends see: the card (fellowship.md §3, and nothing else)
---------------------------------------------------------------------------------------------
-- A player's streak, from their own day (their time zone). The same rule as current_streak().
create function public.streak_of(uid uuid) returns integer
language sql stable security definer set search_path = '' as $$
  with t as (
    select (now() at time zone coalesce(
      (select p.time_zone from public.profiles p
       where p.id = uid and p.time_zone in (select name from pg_catalog.pg_timezone_names)),
      'UTC'))::date as today
  ),
  anchor as (
    select case when exists (
      select 1 from public.daily_activity, t
      where user_id = uid and day = t.today and goal_reached
    ) then t.today else t.today - 1 end as day
    from t
  ),
  kept as (
    select da.goal_reached, (anchor.day - da.day) as back,
           row_number() over (order by da.day desc) - 1 as n
    from public.daily_activity da, anchor
    where da.user_id = uid and (da.goal_reached or da.shielded) and da.day <= anchor.day
  )
  select count(*) filter (where goal_reached)::integer from kept where back = n
$$;
revoke execute on function public.streak_of(uuid) from public, anon, authenticated;

create function public.card_of(uid uuid, me boolean) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id,
    'me', me,
    'name', public.shown_name(p.display_name),
    'look', p.avatar,
    'title', p.title,
    'level', public.level_for_xp(coalesce(w.xp, 0)),
    'streak', public.streak_of(p.id),
    'ranks', coalesce((
      select jsonb_agg(distinct e.subject_id || ':' || e.kind)
      from public.subject_events e
      where e.user_id = p.id and e.kind ~ '^rank-' and e.count > 0), '[]'::jsonb),
    'achievements', coalesce((
      select jsonb_agg(a.achievement_id order by a.achievement_id)
      from public.player_achievements a where a.user_id = p.id), '[]'::jsonb)
  )
  from public.profiles p
  left join public.wallets w on w.user_id = p.id
  where p.id = uid
$$;
revoke execute on function public.card_of(uuid, boolean) from public, anon, authenticated;

-- Your card, then one per accepted friend, by name.
create function public.fellowship() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  return jsonb_build_array(public.card_of(uid, true)) || coalesce((
    select jsonb_agg(c.card order by c.card ->> 'name', c.card ->> 'id')
    from (
      select public.card_of(case when f.low = uid then f.high else f.low end, false) as card
      from public.friendships f
      where uid in (f.low, f.high) and f.accepted_at is not null
    ) c
    where c.card is not null), '[]'::jsonb);
end;
$$;

-- Requests waiting for you: the asker's name and look only. Your own requests are never
-- listed, so asking can't tell you whether a code was real.
create function public.fellowship_requests() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', public.shown_name(p.display_name), 'look', p.avatar)
      order by f.created_at)
    from public.friendships f
    join public.profiles p on p.id = f.asked_by
    where uid in (f.low, f.high) and f.asked_by <> uid and f.accepted_at is null), '[]'::jsonb);
end;
$$;

revoke execute on function
  public.my_friend_code(), public.new_friend_code(), public.ask_friend(text),
  public.answer_friend(uuid, boolean), public.remove_friend(uuid), public.fellowship(),
  public.fellowship_requests()
  from public, anon;
grant execute on function
  public.my_friend_code(), public.new_friend_code(), public.ask_friend(text),
  public.answer_friend(uuid, boolean), public.remove_friend(uuid), public.fellowship(),
  public.fellowship_requests()
  to authenticated;
revoke execute on function
  public.friends_max(), public.friend_asks_per_day(), public.waiting_asks_max(),
  public.new_codes_per_day()
  from public, anon;
grant execute on function
  public.friends_max(), public.friend_asks_per_day(), public.waiting_asks_max(),
  public.new_codes_per_day()
  to authenticated;
