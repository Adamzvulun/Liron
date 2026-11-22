-- Waymark: a home of your own (task 7.3, #438; docs/game/the-home.md R7 and R9, ADR 0055).
-- Applies to dev on merge and to prod on release (ADR 0018).
--
-- Each player's room is one layout, saved whole by `save_home`, which checks it by the same
-- rules as the browser (src/core/home/layout.ts, checkLayout): the cases in
-- src/core/home/layouts.fixture.ts are run against both. A friend reads your layout through
-- `home_of`, never the table. The room and the starter layout are constants here, kept equal to
-- content/core/home.json by supabase/tests/homes.test.ts.

-- The pieces a room can hold. The starter pieces are everyone's; other furniture is placed only
-- by players who own it as an item (task 7.6).
create table public.home_pieces (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9:._-]{0,63}$'),
  place text not null check (place in ('floor', 'rug', 'wall')),
  w integer not null check (w between 1 and 6),
  d integer not null check (d between 1 and 4),
  does text not null
    check (does in ('sit', 'light', 'look', 'wardrobe', 'trophies', 'ledger', 'fellowship')),
  starter boolean not null default false,
  check (place <> 'wall' or (d = 1 and w <= 3)),
  check (place <> 'floor' or (w <= 3 and d <= 4)),
  check (place <> 'rug' or (w <= 6 and d <= 3))
);
alter table public.home_pieces enable row level security;
revoke all on public.home_pieces from anon, authenticated;

insert into public.home_pieces (id, place, w, d, does, starter) values
  ('home:bed', 'floor', 3, 4, 'sit', true),
  ('home:rug', 'rug', 4, 3, 'look', true),
  ('home:desk', 'floor', 2, 1, 'ledger', true),
  ('home:cupboard', 'floor', 1, 2, 'wardrobe', true),
  ('home:chest', 'floor', 2, 2, 'look', true),
  ('home:picture', 'wall', 1, 1, 'look', true),
  ('home:lantern', 'wall', 1, 1, 'light', true),
  ('home:shelf', 'wall', 3, 1, 'trophies', true),
  ('home:letterbox', 'wall', 1, 1, 'fellowship', true);

create table public.homes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  layout jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.homes enable row level security;
create policy "own home: read" on public.homes for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.homes from anon, authenticated;
grant select on public.homes to authenticated;

create function public.home_room() returns jsonb language sql immutable as $$
  select '{"cols":12,"rows":5,"door":[0,4],"caps":{"floor":20,"wall":6},"slots":[{"slot":0,"zone":"left","x":530,"cols":[0]},{"slot":1,"zone":"left","x":640,"cols":[1]},{"slot":2,"zone":"left","x":710,"cols":[2,3]},{"slot":3,"zone":"right","x":1235,"cols":[9]},{"slot":4,"zone":"right","x":1335,"cols":[10]},{"slot":5,"zone":"right","x":1435,"cols":[11]}],"wallpapers":["plaster"],"floors":["planks"]}'::jsonb
$$;

create function public.home_starter() returns jsonb language sql immutable as $$
  select '{"v":1,"wallpaper":"plaster","floor":"planks","pieces":[{"id":"home:bed","at":[0,0],"facing":"right"},{"id":"home:rug","at":[4,2],"facing":"right"},{"id":"home:desk","at":[8,0],"facing":"right"},{"id":"home:cupboard","at":[11,0],"facing":"left"},{"id":"home:chest","at":[9,3],"facing":"left"},{"id":"home:picture","slot":0},{"id":"home:lantern","slot":1},{"id":"home:letterbox","slot":2},{"id":"home:shelf","slot":3}]}'::jsonb
$$;

-- Whether a value is a whole number from 0 to 63 (a cell coordinate or a slot).
create function public.home_coord(v jsonb) returns boolean language sql immutable as $$
  select jsonb_typeof(v) = 'number' and (v #>> '{}') ~ '^[0-9]{1,2}$' and (v #>> '{}')::int <= 63
$$;

-- Whether a layout has the right shape (layout.ts, Layout): nothing missing, nothing extra.
create function public.home_shape_ok(l jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  p jsonb;
  id_re constant text := '^[a-z0-9][a-z0-9:._-]{0,63}$';
begin
  if jsonb_typeof(l) <> 'object'
    or (select array_agg(k order by k) from jsonb_object_keys(l) k)
      is distinct from array['floor', 'pieces', 'v', 'wallpaper']
    or l -> 'v' is distinct from '1'::jsonb
    or jsonb_typeof(l -> 'wallpaper') <> 'string' or (l ->> 'wallpaper') !~ id_re
    or jsonb_typeof(l -> 'floor') <> 'string' or (l ->> 'floor') !~ id_re
    or jsonb_typeof(l -> 'pieces') <> 'array' or jsonb_array_length(l -> 'pieces') > 64 then
    return false;
  end if;
  for p in select * from jsonb_array_elements(l -> 'pieces') loop
    if jsonb_typeof(p) <> 'object'
      or jsonb_typeof(p -> 'id') <> 'string' or (p ->> 'id') !~ id_re then
      return false;
    end if;
    if (select array_agg(k order by k) from jsonb_object_keys(p) k) = array['at', 'facing', 'id'] then
      if jsonb_typeof(p -> 'at') <> 'array' or jsonb_array_length(p -> 'at') <> 2
        or not public.home_coord(p -> 'at' -> 0) or not public.home_coord(p -> 'at' -> 1)
        or (p ->> 'facing') is null or (p ->> 'facing') not in ('left', 'right') then
        return false;
      end if;
    elsif (select array_agg(k order by k) from jsonb_object_keys(p) k) = array['id', 'slot'] then
      if not public.home_coord(p -> 'slot') then
        return false;
      end if;
    else
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- The slots a wall piece of width w covers from slot s, or null when it would run off the end
-- or across the window (layout.ts, slotsOf).
create function public.home_slots_of(room jsonb, s integer, w integer) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  first jsonb;
  this jsonb;
  out jsonb := '[]'::jsonb;
begin
  select e into first from jsonb_array_elements(room -> 'slots') e where (e ->> 'slot')::int = s;
  if first is null then
    return null;
  end if;
  for i in 0 .. w - 1 loop
    this := null;
    select e into this from jsonb_array_elements(room -> 'slots') e
    where (e ->> 'slot')::int = s + i;
    if this is null or this ->> 'zone' <> first ->> 'zone' then
      return null;
    end if;
    out := out || jsonb_build_array(this);
  end loop;
  return out;
end;
$$;

-- Why a layout is refused for a player, as layout.ts's Refusal, or null when it is allowed.
-- The same checks in the same order as checkLayout, so both give the same first reason.
create function public.home_refusal(uid uuid, l jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  room constant jsonb := public.home_room();
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
  if not (room -> 'wallpapers') ? (l ->> 'wallpaper') or not (room -> 'floors') ? (l ->> 'floor') then
    return jsonb_build_object('why', 'style');
  end if;
  for p in select * from jsonb_array_elements(l -> 'pieces') loop
    def := null;
    select * into def from public.home_pieces h
    where h.id = p ->> 'id'
      and (h.starter or exists (
        select 1 from public.owned_items o where o.user_id = uid and o.item_id = h.id));
    if def.id is null then
      return jsonb_build_object('why', 'unknown', 'id', p ->> 'id');
    end if;
    if def.id = any (seen) then
      return jsonb_build_object('why', 'twice', 'id', def.id);
    end if;
    seen := seen || def.id;
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
  foreach panel in array array['wardrobe', 'trophies', 'ledger', 'fellowship'] loop
    if not exists (
      select 1 from public.home_pieces h
      where h.id = any (seen) and h.does = panel) then
      return jsonb_build_object('why', 'panel-missing', 'does', panel);
    end if;
  end loop;

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
      -- The free cells beside the piece.
      x := (p -> 'at' ->> 0)::int;
      y := (p -> 'at' ->> 1)::int;
      for cy in y - 1 .. y + def.d loop
        for cx in x - 1 .. x + def.w loop
          if (cx between x and x + def.w - 1) = (cy between y and y + def.d - 1) then
            continue; -- the piece itself, or a corner
          end if;
          if reach ? (cx || ',' || cy) then
            ok := true;
          end if;
        end loop;
      end loop;
    else
      -- The first free cell of each column below what hangs there.
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

-- Saves the signed-in player's whole room, or refuses it with the first reason (as JSON in
-- the error's detail) and saves nothing.
create function public.save_home(p_layout jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  why jsonb;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  why := public.home_refusal(uid, p_layout);
  if why is not null then
    raise exception 'home refused' using errcode = '22023', detail = why::text;
  end if;
  insert into public.homes (user_id, layout) values (uid, p_layout)
  on conflict (user_id) do update set layout = excluded.layout, updated_at = now();
end;
$$;

-- The signed-in player's room: as saved, or the starter room if never decorated.
create function public.my_home() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  return coalesce((select h.layout from public.homes h where h.user_id = uid),
    public.home_starter());
end;
$$;

-- A friend's room, placed pieces only (a layout holds nothing else), or null for anyone who
-- isn't a friend, so a stranger learns nothing, not even whether the player exists.
create function public.home_of(p_friend uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_friend is null or not public.are_friends(uid, p_friend) then
    return null;
  end if;
  return coalesce((select h.layout from public.homes h where h.user_id = p_friend),
    public.home_starter());
end;
$$;

revoke execute on function
  public.home_room(), public.home_starter(), public.home_coord(jsonb),
  public.home_shape_ok(jsonb), public.home_slots_of(jsonb, integer, integer),
  public.home_refusal(uuid, jsonb)
  from public, anon, authenticated;
revoke execute on function public.save_home(jsonb), public.my_home(), public.home_of(uuid)
  from public, anon;
grant execute on function public.save_home(jsonb), public.my_home(), public.home_of(uuid)
  to authenticated;
