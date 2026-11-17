-- Waymark: the party feed (task 3.3, #328; fellowship-build.md §2, ADR 0043). Applies to dev on
-- merge and to prod on release (ADR 0018).
--
-- A feed row is written by the database at the moment it already records the thing, never by
-- the browser: a rank or trial event, an achievement, a streak chest (7, 30, 100 days). A row
-- holds short codes only, never free text, and the words friends read are made in the app.
-- A player who switches sharing off writes no row.

alter table public.profiles add column share_milestones boolean not null default true;
-- The player's own switch, like their name and look (20261104120000).
grant update (share_milestones) on public.profiles to authenticated;

create table public.fellowship_feed (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('rank', 'trial', 'achievement', 'streak')),
  -- A short code: `morse:rank-listener`, `arabic:trial-12`, `first-light`, `30`.
  detail text not null check (detail ~ '^[a-z0-9:-]{1,64}$'),
  at timestamptz not null default now(),
  unique (user_id, kind, detail)
);
create index fellowship_feed_user_at on public.fellowship_feed (user_id, at desc);
alter table public.fellowship_feed enable row level security;
revoke all on public.fellowship_feed from anon, authenticated;

-- Writes one milestone, once ever, if the player shares them.
create function public.feed_milestone(uid uuid, what text, detail text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select p.share_milestones from public.profiles p where p.id = uid) then
    insert into public.fellowship_feed (user_id, kind, detail) values (uid, what, detail)
      on conflict do nothing;
  end if;
end;
$$;
revoke execute on function public.feed_milestone(uuid, text, text) from public, anon, authenticated;

-- Ranks and trials, from the events the subjects already report (trap 2: never their state).
create function public.feed_from_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.count > 0 and new.kind ~ '^(rank-[a-z0-9-]+|trial-[0-9]+)$' then
    perform public.feed_milestone(
      new.user_id,
      case when new.kind like 'rank-%' then 'rank' else 'trial' end,
      new.subject_id || ':' || new.kind);
  end if;
  return null;
end;
$$;
revoke execute on function public.feed_from_event() from public, anon, authenticated;
create trigger feed_from_event after insert or update of count on public.subject_events
  for each row execute function public.feed_from_event();

create function public.feed_from_achievement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.feed_milestone(new.user_id, 'achievement', new.achievement_id);
  return null;
end;
$$;
revoke execute on function public.feed_from_achievement() from public, anon, authenticated;
create trigger feed_from_achievement after insert on public.player_achievements
  for each row execute function public.feed_from_achievement();

-- A streak chest is granted exactly on day 7, 30 or 100 (grant_chests, ADR 0034).
create function public.feed_from_streak() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.source = 'streak' then
    perform public.feed_milestone(new.user_id, 'streak', split_part(new.source_key, ':', 2));
  end if;
  return null;
end;
$$;
revoke execute on function public.feed_from_streak() from public, anon, authenticated;
create trigger feed_from_streak after insert on public.chests
  for each row execute function public.feed_from_streak();

-- The last 50 milestones of your friends and you, newest first, before `p_before` (for paging).
-- Each row: who (id, name), kind, detail, and the day only, never the time (§4). Rows older than
-- 60 days are deleted here.
create function public.fellowship_feed(p_before timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from public.fellowship_feed where at < now() - interval '60 days';
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
      select * from public.fellowship_feed f
      where (f.user_id = uid or exists (
          select 1 from public.friendships s
          where s.accepted_at is not null
            and s.low = least(uid, f.user_id) and s.high = greatest(uid, f.user_id)))
        and (p_before is null or f.at < p_before)
      order by f.at desc, f.id desc
      limit 50
    ) f
    join public.profiles p on p.id = f.user_id), '[]'::jsonb);
end;
$$;
revoke execute on function public.fellowship_feed(timestamptz) from public, anon;
grant execute on function public.fellowship_feed(timestamptz) to authenticated;
