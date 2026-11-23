-- Waymark: notes at the letterbox (task 8.1, #469; docs/game/the-home.md §13). Applies to dev on
-- merge and to prod on release (ADR 0018).
--
-- A friend who visits your room can leave one note a day at your letterbox, chosen from a fixed
-- set (content/core/home.json, the `home-note` items; supabase/tests/notes.test.ts keeps the
-- list below equal to it). A note is a short code, never free text, like the feed's rows
-- (ADR 0043). Only the two of them ever read it: you, at your letterbox and in your feed ("Basma
-- stopped by your room"), and the friend who wrote it. A note from someone who is no longer a
-- friend is never shown, and notes older than 60 days are deleted, as the feed's are.

create function public.home_note_ids() returns text[] language sql immutable as $$
  select array['tea', 'clean', 'weather', 'tonight', 'bye', '73', 'cul', 'tnx', 'window', 'liked']
$$;

create table public.home_notes (
  id bigint generated always as identity primary key,
  host_id uuid not null references auth.users (id) on delete cascade,
  visitor_id uuid not null references auth.users (id) on delete cascade,
  note text not null check (note ~ '^[a-z0-9-]{1,32}$'),
  day date not null default (now() at time zone 'utc')::date,
  at timestamptz not null default now(),
  check (host_id <> visitor_id),
  unique (host_id, visitor_id, day)
);
create index home_notes_host_at on public.home_notes (host_id, at desc);
alter table public.home_notes enable row level security;
revoke all on public.home_notes from anon, authenticated;

-- Leaves a note at a friend's letterbox: today's note from you to them, replacing an earlier one
-- from today. Refused for anyone who isn't a friend, and for a note that isn't in the set.
create function public.leave_note(p_friend uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_friend is null or not public.are_friends(uid, p_friend) then
    raise exception 'not a friend' using errcode = '42501';
  end if;
  if p_note is null or not (p_note = any (public.home_note_ids())) then
    raise exception 'no such note' using errcode = '22023';
  end if;
  insert into public.home_notes (host_id, visitor_id, note) values (p_friend, uid, p_note)
    on conflict (host_id, visitor_id, day) do update set note = excluded.note, at = now();
end;
$$;

-- The notes at your letterbox from the last 60 days, from current friends, newest first: who,
-- which note, and the day only.
create function public.my_notes() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from public.home_notes where at < now() - interval '60 days';
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', n.id, 'from', n.visitor_id, 'name', public.shown_name(p.display_name),
      'note', n.note, 'day', to_char(n.day, 'YYYY-MM-DD'))
      order by n.at desc, n.id desc)
    from (
      select * from public.home_notes n
      where n.host_id = uid and public.are_friends(n.visitor_id, uid)
      order by n.at desc, n.id desc
      limit 50
    ) n
    join public.profiles p on p.id = n.visitor_id), '[]'::jsonb);
end;
$$;

-- The note you left a friend today, if any, so their letterbox can say so.
create function public.my_note_for(p_friend uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  return (select n.note from public.home_notes n
    where n.host_id = p_friend and n.visitor_id = uid
      and n.day = (now() at time zone 'utc')::date
      and public.are_friends(uid, p_friend));
end;
$$;

-- The party feed gains a row for each note at your letterbox, shown to you only: kind `visit`,
-- `who` the friend who stopped by, `detail` the note. Its id is negative, so it never meets a
-- milestone's. Everything else is as 20261231000000_fellowship_feed.sql made it.
create or replace function public.fellowship_feed(p_before timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from public.fellowship_feed where at < now() - interval '60 days';
  delete from public.home_notes where at < now() - interval '60 days';
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', f.id,
      'who', f.user_id,
      'name', public.shown_name(p.display_name),
      'me', f.user_id = uid,
      'kind', f.kind,
      'detail', f.detail,
      'day', to_char(f.at at time zone 'utc', 'YYYY-MM-DD'))
      order by f.at desc, f.id desc)
    from (
      select * from (
        select f.id, f.user_id, f.kind, f.detail, f.at from public.fellowship_feed f
        where (f.user_id = uid or exists (
            select 1 from public.friendships s
            where s.accepted_at is not null
              and s.low = least(uid, f.user_id) and s.high = greatest(uid, f.user_id)))
          and (p_before is null or f.at < p_before)
        union all
        select -n.id, n.visitor_id, 'visit', n.note, n.at from public.home_notes n
        where n.host_id = uid and public.are_friends(n.visitor_id, uid)
          and (p_before is null or n.at < p_before)
      ) f
      order by f.at desc, f.id desc
      limit 50
    ) f
    join public.profiles p on p.id = f.user_id), '[]'::jsonb);
end;
$$;

revoke execute on function public.home_note_ids() from public, anon, authenticated;
revoke execute on function
  public.leave_note(uuid, text), public.my_notes(), public.my_note_for(uuid)
  from public, anon;
grant execute on function
  public.leave_note(uuid, text), public.my_notes(), public.my_note_for(uuid)
  to authenticated;
