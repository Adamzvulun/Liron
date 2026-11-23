-- Waymark: the roof, a second room (task 8.4, #472; docs/game/the-home.md §16). Applies to dev
-- on merge and to prod on release (ADR 0018).
--
-- A player opens their roof once, for 15 gems, and then has two rooms, each its own layout: a
-- row of `homes` per room. The roof is on the same grid as the house, with the same caps and
-- wall slots, but its own wallpaper and floor (the lime wash and the slabs, never a bought
-- style), no starter pieces and no panels. A piece of furniture stands in one room at a time.
-- Friends visit the roof as they visit the house, through `home_of`. Coziness counts what both
-- rooms have ever held. The roof and its price are constants here, kept equal to
-- content/core/home.json by supabase/tests/homes.test.ts.

alter table public.homes add column room text not null default 'home'
  check (room in ('home', 'roof'));
alter table public.homes drop constraint homes_pkey;
alter table public.homes add primary key (user_id, room);

create function public.home_roof() returns jsonb language sql immutable as $$
  select '{"cols":12,"rows":5,"door":[0,4],"caps":{"floor":20,"wall":6},"slots":[{"slot":0,"zone":"left","x":530,"cols":[0]},{"slot":1,"zone":"left","x":640,"cols":[1]},{"slot":2,"zone":"left","x":710,"cols":[2,3]},{"slot":3,"zone":"right","x":1235,"cols":[9]},{"slot":4,"zone":"right","x":1335,"cols":[10]},{"slot":5,"zone":"right","x":1435,"cols":[11]}],"wallpapers":["lime"],"floors":["slabs"]}'::jsonb
$$;

create function public.home_roof_starter() returns jsonb language sql immutable as $$
  select '{"v":1,"wallpaper":"lime","floor":"slabs","pieces":[]}'::jsonb
$$;

create function public.home_roof_price() returns integer language sql immutable as $$
  select 15
$$;

-- As before (20270120000000), but the roof's own lime wash and slabs aren't something new.
create or replace function public.home_held_of(l jsonb) returns text[]
language sql stable set search_path = '' as $$
  select coalesce(array_agg(distinct s.x order by s.x), '{}') from (
    select p ->> 'id' as x from jsonb_array_elements(l -> 'pieces') p
    where not exists (
      select 1 from public.home_pieces h where h.id = p ->> 'id' and h.starter)
    union all
    select 'wallpaper:' || (l ->> 'wallpaper')
    where not ((public.home_room() -> 'wallpapers') ? (l ->> 'wallpaper'))
      and not ((public.home_roof() -> 'wallpapers') ? (l ->> 'wallpaper'))
    union all
    select 'floor:' || (l ->> 'floor')
    where not ((public.home_room() -> 'floors') ? (l ->> 'floor'))
      and not ((public.home_roof() -> 'floors') ? (l ->> 'floor'))
  ) s
$$;

-- Why a layout is refused for a room, as layout.ts's Refusal, or null when it is allowed. As
-- before (20270118000000), for either room: the roof takes only its own style, no starter
-- piece, and needs no panels; and a piece standing in the other room is refused (`elsewhere`),
-- checked where checkLayout checks it.
drop function public.home_refusal(uuid, jsonb);
create function public.home_refusal(uid uuid, l jsonb, p_room text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  room constant jsonb := case p_room when 'roof' then public.home_roof() else public.home_room() end;
  cols constant int := (room ->> 'cols')::int;
  nrows constant int := (room ->> 'rows')::int;
  door constant text := (room -> 'door' ->> 0) || ',' || (room -> 'door' ->> 1);
  p jsonb;
  def public.home_pieces;
  seen text[] := '{}';
  covered jsonb := '{}'::jsonb;
  rugs jsonb := '{}'::jsonb;
  slots jsonb := '{}'::jsonb;
  hung jsonb;
  sl jsonb;
  n_floor int := 0;
  n_wall int := 0;
  x int;
  y int;
  k text;
  other text;
  panel text;
  reach jsonb;
  todo text[];
  cell text;
  cx int;
  cy int;
  ok boolean;
  c jsonb;
begin
  if not public.home_shape_ok(l) then
    raise exception 'bad layout' using errcode = '22023';
  end if;
  if not ((room -> 'wallpapers') ? (l ->> 'wallpaper') or (p_room = 'home' and exists (
      select 1 from public.owned_items o
      where o.user_id = uid and o.item_id = 'wallpaper-' || (l ->> 'wallpaper'))))
    or not ((room -> 'floors') ? (l ->> 'floor') or (p_room = 'home' and exists (
      select 1 from public.owned_items o
      where o.user_id = uid and o.item_id = 'floor-' || (l ->> 'floor')))) then
    return jsonb_build_object('why', 'style');
  end if;
  for p in select * from jsonb_array_elements(l -> 'pieces') loop
    def := null;
    select * into def from public.home_pieces h
    where h.id = p ->> 'id'
      and ((h.starter and p_room = 'home') or exists (
        select 1 from public.owned_items o where o.user_id = uid and o.item_id = h.id));
    if def.id is null then
      return jsonb_build_object('why', 'unknown', 'id', p ->> 'id');
    end if;
    if def.id = any (seen) then
      return jsonb_build_object('why', 'twice', 'id', def.id);
    end if;
    seen := seen || def.id;
    if exists (
      select 1 from public.homes o, jsonb_array_elements(o.layout -> 'pieces') e
      where o.user_id = uid and o.room <> p_room and e ->> 'id' = def.id) then
      return jsonb_build_object('why', 'elsewhere', 'id', def.id);
    end if;
    if (p ? 'at') <> (def.place <> 'wall') then
      return jsonb_build_object('why', 'wrong-place', 'id', def.id);
    end if;
    if not p ? 'at' then
      n_wall := n_wall + 1;
      hung := public.home_slots_of(room, (p ->> 'slot')::int, def.w);
      if hung is null then
        return jsonb_build_object('why', 'slot', 'id', def.id);
      end if;
      for sl in select * from jsonb_array_elements(hung) loop
        other := slots ->> (sl ->> 'slot');
        if other is not null then
          return jsonb_build_object('why', 'slot-taken', 'id', def.id, 'with', other);
        end if;
        slots := slots || jsonb_build_object(sl ->> 'slot', def.id);
      end loop;
      continue;
    end if;
    n_floor := n_floor + 1;
    x := (p -> 'at' ->> 0)::int;
    y := (p -> 'at' ->> 1)::int;
    if x + def.w > cols or y + def.d > nrows then
      return jsonb_build_object('why', 'off-floor', 'id', def.id);
    end if;
    for dy in 0 .. def.d - 1 loop
      for dx in 0 .. def.w - 1 loop
        k := (x + dx) || ',' || (y + dy);
        other := case when def.place = 'rug' then rugs ->> k else covered ->> k end;
        if other is not null then
          return jsonb_build_object('why', 'overlap', 'id', def.id, 'with', other);
        end if;
        if def.place = 'floor' and k = door then
          return jsonb_build_object('why', 'on-door', 'id', def.id);
        end if;
        if def.place = 'rug' then
          rugs := rugs || jsonb_build_object(k, def.id);
        else
          covered := covered || jsonb_build_object(k, def.id);
        end if;
      end loop;
    end loop;
  end loop;
  if n_floor > (room -> 'caps' ->> 'floor')::int then
    return jsonb_build_object('why', 'too-many', 'place', 'floor');
  end if;
  if n_wall > (room -> 'caps' ->> 'wall')::int then
    return jsonb_build_object('why', 'too-many', 'place', 'wall');
  end if;
  if p_room = 'home' then
    foreach panel in array array['wardrobe', 'trophies', 'ledger', 'fellowship'] loop
      if not exists (
        select 1 from public.home_pieces h
        where h.id = any (seen) and h.does = panel) then
        return jsonb_build_object('why', 'panel-missing', 'does', panel);
      end if;
    end loop;
  end if;

  -- The way from the door must reach every piece that does something (§6).
  reach := jsonb_build_object(door, true);
  todo := array[door];
  while cardinality(todo) > 0 loop
    cell := todo[cardinality(todo)];
    todo := todo[1 : cardinality(todo) - 1];
    cx := split_part(cell, ',', 1)::int;
    cy := split_part(cell, ',', 2)::int;
    for c in select * from jsonb_array_elements('[[0,-1],[1,0],[0,1],[-1,0]]'::jsonb) loop
      x := cx + (c ->> 0)::int;
      y := cy + (c ->> 1)::int;
      k := x || ',' || y;
      if x < 0 or y < 0 or x >= cols or y >= nrows or covered ? k or reach ? k then
        continue;
      end if;
      reach := reach || jsonb_build_object(k, true);
      todo := todo || k;
    end loop;
  end loop;

  for p in select * from jsonb_array_elements(l -> 'pieces') loop
    select * into def from public.home_pieces h where h.id = p ->> 'id';
    if def.does = 'look' or def.place = 'rug' then
      continue;
    end if;
    ok := false;
    if p ? 'at' then
      x := (p -> 'at' ->> 0)::int;
      y := (p -> 'at' ->> 1)::int;
      for cy in y - 1 .. y + def.d loop
        for cx in x - 1 .. x + def.w loop
          if (cx between x and x + def.w - 1) = (cy between y and y + def.d - 1) then
            continue;
          end if;
          if reach ? (cx || ',' || cy) then
            ok := true;
          end if;
        end loop;
      end loop;
    else
      for sl in select * from jsonb_array_elements(
        public.home_slots_of(room, (p ->> 'slot')::int, def.w)) loop
        for c in select * from jsonb_array_elements(sl -> 'cols') loop
          for cy in 0 .. nrows - 1 loop
            k := (c #>> '{}') || ',' || cy;
            if not covered ? k then
              if reach ? k then
                ok := true;
              end if;
              exit;
            end if;
          end loop;
        end loop;
      end loop;
    end if;
    if not ok then
      return jsonb_build_object('why', 'cut-off', 'id', def.id);
    end if;
  end loop;
  return null;
end;
$$;

-- Saves one of the signed-in player's rooms, whole, or refuses it with the first reason (as
-- JSON in the error's detail) and saves nothing. The roof only once it is open.
drop function public.save_home(jsonb);
create function public.save_home(p_layout jsonb, p_room text default 'home') returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  why jsonb;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_room is null or p_room not in ('home', 'roof') then
    raise exception 'no such room' using errcode = '22023';
  end if;
  if p_room = 'roof' and not exists (
      select 1 from public.homes h where h.user_id = uid and h.room = 'roof') then
    raise exception 'roof closed' using errcode = '22023';
  end if;
  -- One save at a time per player, so two rooms saved at once can't both take the same piece.
  perform pg_advisory_xact_lock(hashtext('home:' || uid::text));
  why := public.home_refusal(uid, p_layout, p_room);
  if why is not null then
    raise exception 'home refused' using errcode = '22023', detail = why::text;
  end if;
  insert into public.homes (user_id, room, layout) values (uid, p_room, p_layout)
  on conflict (user_id, room) do update set layout = excluded.layout, updated_at = now();
end;
$$;

-- The signed-in player's room: as saved, or the starter room if never decorated. The roof as
-- saved, or null while it isn't open.
drop function public.my_home();
create function public.my_home(p_room text default 'home') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  saved jsonb;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select h.layout into saved from public.homes h where h.user_id = uid and h.room = p_room;
  return case when p_room = 'home' then coalesce(saved, public.home_starter()) else saved end;
end;
$$;

-- A friend's room or roof, placed pieces only, or null for anyone who isn't a friend (who
-- learns nothing, not even whether the player exists), and for a roof that isn't open.
drop function public.home_of(uuid);
create function public.home_of(p_friend uuid, p_room text default 'home') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  saved jsonb;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_friend is null or not public.are_friends(uid, p_friend) then
    return null;
  end if;
  select h.layout into saved from public.homes h where h.user_id = p_friend and h.room = p_room;
  return case when p_room = 'home' then coalesce(saved, public.home_starter()) else saved end;
end;
$$;

-- Opens the signed-in player's roof: takes its price in gems and gives an empty roof, once.
-- Returns the wallet after.
create function public.open_roof() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  w public.wallets%rowtype;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into w from public.wallets where user_id = uid for update;
  if exists (select 1 from public.homes h where h.user_id = uid and h.room = 'roof') then
    raise exception 'already open' using errcode = '22023';
  end if;
  if w.user_id is null or w.gems < public.home_roof_price() then
    raise exception 'too few gems' using errcode = '22023';
  end if;
  update public.wallets set gems = gems - public.home_roof_price()
    where user_id = uid returning * into w;
  insert into public.homes (user_id, room, layout) values (uid, 'roof', public.home_roof_starter());
  return jsonb_build_object('gold', w.gold, 'gems', w.gems);
end;
$$;

-- What both rooms have ever held, for coziness.
create or replace function public.my_home_held() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  return coalesce((
    select to_jsonb(array_agg(distinct x order by x))
    from public.homes h, unnest(h.held) x where h.user_id = uid), '[]'::jsonb);
end;
$$;

-- A friend's card counts what both their rooms have ever held: a count, never the list.
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
    'cozy', (
      select count(distinct x)::int from public.homes h, unnest(h.held) x where h.user_id = p.id)
  )
  from public.profiles p
  left join public.wallets w on w.user_id = p.id
  where p.id = uid
$$;

revoke execute on function
  public.home_roof(), public.home_roof_starter(), public.home_roof_price(),
  public.home_refusal(uuid, jsonb, text)
  from public, anon, authenticated;
revoke execute on function
  public.save_home(jsonb, text), public.my_home(text), public.home_of(uuid, text),
  public.open_roof()
  from public, anon;
grant execute on function
  public.save_home(jsonb, text), public.my_home(text), public.home_of(uuid, text),
  public.open_roof()
  to authenticated;
