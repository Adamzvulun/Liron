-- Waymark: wallpapers and floors to buy (task 7.8, #443; docs/game/the-home.md §7). Applies to
-- dev on merge and to prod on release (ADR 0018).
--
-- The room's styles are a new kind of item, `style`: `wallpaper-<style>` and `floor-<style>`,
-- from content/core/items.json (their names are in content/core/home.json). They are sold in
-- the Market's furniture slot and found in chests like furniture, and a saved room may use the
-- plain plaster and planks or any style its player owns.

alter table public.items drop constraint items_kind_check;
alter table public.items add constraint items_kind_check
  check (kind in ('gear', 'color', 'functional', 'furniture', 'style'));

insert into public.items (id, kind, slot, rarity, price, milestone) values
  ('wallpaper-sea-wash', 'style', null, 'common', 60, null),
  ('wallpaper-rose-stripe', 'style', null, 'rare', 180, null),
  ('wallpaper-zellige', 'style', null, 'epic', 450, null),
  ('floor-terracotta', 'style', null, 'common', 60, null),
  ('floor-flagstone', 'style', null, 'rare', 180, null),
  ('floor-dark-oak', 'style', null, 'rare', 180, null);

-- As before (20270116000000), with the styles in the furniture slot.
create or replace function public.market_stock(p_day date) returns text[]
language sql stable set search_path = '' as $$
  select array(
    select id from (
      (select i.id, 1 as slot, md5(p_day::text || ':' || i.id) as k from public.items i
        where i.kind = 'gear' and not public.is_rank_gear(i.milestone) order by k limit 2)
      union all
      (select i.id, 2, md5(p_day::text || ':' || i.id) as k from public.items i
        where i.kind = 'color' order by k limit 1)
      union all
      (select i.id, 3, md5(p_day::text || ':' || i.id) as k from public.items i
        where i.kind = 'functional' order by k limit 1)
      union all
      (select i.id, 4, md5(p_day::text || ':' || i.id) as k from public.items i
        where i.kind in ('furniture', 'style') and not public.is_rank_gear(i.milestone)
        order by k limit 1)
    ) s order by slot, k)
$$;

-- As before (20270116000000), with the styles in a chest's item roll.
create or replace function public.chest_item(milestone jsonb, kind text) returns boolean
language sql immutable set search_path = '' as $$
  select kind in ('gear', 'furniture', 'style') and not public.is_rank_gear(milestone)
$$;

-- As before (20270114000000), but a style the player owns is allowed too.
create or replace function public.home_refusal(uid uuid, l jsonb) returns jsonb
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
  if not ((room -> 'wallpapers') ? (l ->> 'wallpaper') or exists (
      select 1 from public.owned_items o
      where o.user_id = uid and o.item_id = 'wallpaper-' || (l ->> 'wallpaper')))
    or not ((room -> 'floors') ? (l ->> 'floor') or exists (
      select 1 from public.owned_items o
      where o.user_id = uid and o.item_id = 'floor-' || (l ->> 'floor'))) then
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
