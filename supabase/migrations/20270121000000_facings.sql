-- Waymark: four facings (task 8.3, #471; docs/game/the-home.md §15). Applies to dev on merge
-- and to prod on release (ADR 0018).
--
-- A floor piece's `facing` was `left` or `right`, set by where it stands: both mean "facing the
-- room", and every saved room keeps them and looks as it did. Three new values turn a piece that
-- can turn (the chair four ways, the window seat two): `away` faces the back wall, `to-left`
-- and `to-right` face across the room. layout.ts, Layout, reads the same five.

create or replace function public.home_shape_ok(l jsonb) returns boolean
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
        or (p ->> 'facing') is null or (p ->> 'facing') not in ('left', 'right', 'away', 'to-left', 'to-right') then
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
