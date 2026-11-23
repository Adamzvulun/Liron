-- Waymark: coziness (task 8.2, #470; docs/game/the-home.md §14). Applies to dev on merge and to
-- prod on release (ADR 0018).
--
-- A room's coziness is how many different things it has ever held beyond the starter room: each
-- piece of furniture, and each wallpaper and floor that isn't the room's own. The list only
-- grows, so storing a piece or emptying the room never lowers it, and an empty room is never
-- punished. The browser counts the same way (src/core/home/cozy.ts, heldOf), and
-- supabase/tests/homes.test.ts holds the two equal on the layouts in layouts.fixture.ts.

alter table public.homes add column held text[] not null default '{}';

-- What a layout holds beyond the starter room: furniture ids, `wallpaper:<style>` and
-- `floor:<style>`, sorted.
create function public.home_held_of(l jsonb) returns text[]
language sql stable set search_path = '' as $$
  select coalesce(array_agg(distinct s.x order by s.x), '{}') from (
    select p ->> 'id' as x from jsonb_array_elements(l -> 'pieces') p
    where not exists (
      select 1 from public.home_pieces h where h.id = p ->> 'id' and h.starter)
    union all
    select 'wallpaper:' || (l ->> 'wallpaper')
    where not ((public.home_room() -> 'wallpapers') ? (l ->> 'wallpaper'))
    union all
    select 'floor:' || (l ->> 'floor')
    where not ((public.home_room() -> 'floors') ? (l ->> 'floor'))
  ) s
$$;

-- Every save adds what the room now holds to what it has ever held.
create function public.home_hold() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.held := (
    select coalesce(array_agg(distinct x order by x), '{}')
    from unnest(new.held || public.home_held_of(new.layout)) x);
  return new;
end;
$$;
create trigger home_hold before insert or update of layout on public.homes
  for each row execute function public.home_hold();

-- The rooms saved before today start with what they hold now.
update public.homes set layout = layout;

-- What your room has ever held, for its coziness.
create function public.my_home_held() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  return coalesce((select to_jsonb(h.held) from public.homes h where h.user_id = uid),
    '[]'::jsonb);
end;
$$;

-- A friend's card gains their room's coziness: a count, never the list.
create or replace function public.card_of(uid uuid, me boolean) returns jsonb
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
      from public.player_achievements a where a.user_id = p.id), '[]'::jsonb),
    'cozy', coalesce((
      select cardinality(h.held) from public.homes h where h.user_id = p.id), 0)
  )
  from public.profiles p
  left join public.wallets w on w.user_id = p.id
  where p.id = uid
$$;

revoke execute on function public.home_held_of(jsonb), public.home_hold()
  from public, anon, authenticated;
revoke execute on function public.my_home_held() from public, anon;
grant execute on function public.my_home_held() to authenticated;
