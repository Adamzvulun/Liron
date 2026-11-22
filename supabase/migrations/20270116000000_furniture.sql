-- Waymark: furniture in the economy (task 7.8, #443; docs/game/the-home.md §7, ADR 0033 and
-- 0055). Applies to dev on merge and to prod on release (ADR 0018).
--
-- Furniture is a new kind of item, bought and won like gear: the Market sets out one piece a
-- day, and a chest's item roll can give a piece you don't own. Its shape (place, size, what it
-- does) is in home_pieces, from content/core/home.json; its rarity and price are in items, from
-- content/core/items.json. supabase/tests keep both equal to the JSON.

alter table public.items drop constraint items_kind_check;
alter table public.items add constraint items_kind_check
  check (kind in ('gear', 'color', 'functional', 'furniture'));

insert into public.items (id, kind, slot, rarity, price, milestone) values
  ('home-chair', 'furniture', null, 'common', 60, null),
  ('home-cushion', 'furniture', null, 'common', 60, null),
  ('home-plant', 'furniture', null, 'common', 60, null),
  ('home-desert', 'furniture', null, 'rare', 180, null),
  ('home-clock', 'furniture', null, 'rare', 180, null),
  ('home-bench', 'furniture', null, 'rare', 180, null),
  ('home-table', 'furniture', null, 'rare', 180, null),
  ('home-bookcase', 'furniture', null, 'epic', 450, null);

insert into public.home_pieces (id, place, w, d, does) values
  ('home-chair', 'floor', 1, 1, 'sit'),
  ('home-cushion', 'floor', 1, 1, 'sit'),
  ('home-plant', 'floor', 1, 1, 'look'),
  ('home-desert', 'wall', 1, 1, 'look'),
  ('home-clock', 'wall', 1, 1, 'look'),
  ('home-bench', 'floor', 3, 1, 'sit'),
  ('home-table', 'floor', 2, 2, 'look'),
  ('home-bookcase', 'floor', 2, 1, 'look');

-- As before (20261117000000), with a fifth ware: one piece of furniture, after the shield.
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
        where i.kind = 'furniture' and not public.is_rank_gear(i.milestone) order by k limit 1)
    ) s order by slot, k)
$$;

-- What a chest's item roll can give: gear and furniture, never what a rank or a finale gives.
create function public.chest_item(milestone jsonb, kind text) returns boolean
language sql immutable set search_path = '' as $$
  select kind in ('gear', 'furniture') and not public.is_rank_gear(milestone)
$$;
revoke execute on function public.chest_item(jsonb, text) from public, anon, authenticated;

-- As before (20261117000000), with furniture in the item roll: a piece you don't own, gear or
-- furniture alike, or the price of one when you own them all.
create or replace function public.open_chest(p_chest uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  c public.chests%rowtype;
  d public.chest_drops%rowtype;
  v_gold integer;
  v_gems integer := 0;
  item text;
  item_gold integer := 0;
  shield boolean := false;
  shield_gold integer := 0;
  unowned integer;
  v_contents jsonb;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into c from public.chests where id = p_chest and user_id = uid for update;
  if not found then
    raise exception 'no such chest' using errcode = '22023';
  end if;
  if c.opened_at is not null then
    return c.contents || jsonb_build_object('already_open', true);
  end if;
  select * into d from public.chest_drops where kind = c.kind;

  v_gold := d.gold_min + floor(public.chest_roll(c.id, 1) * (d.gold_max - d.gold_min + 1))::integer;
  if public.chest_roll(c.id, 2) < d.gem_chance then
    v_gems := d.gems_min + floor(public.chest_roll(c.id, 3) * (d.gems_max - d.gems_min + 1))::integer;
  end if;
  if public.chest_roll(c.id, 4) < d.gear_chance then
    select count(*) into unowned from public.items i
      where public.chest_item(i.milestone, i.kind)
        and i.id not in (select item_id from public.owned_items where user_id = uid);
    if unowned > 0 then
      select i.id into item from public.items i
        where public.chest_item(i.milestone, i.kind)
          and i.id not in (select item_id from public.owned_items where user_id = uid)
        order by i.id
        offset floor(public.chest_roll(c.id, 5) * unowned)::integer limit 1;
      insert into public.owned_items (user_id, item_id, source) values (uid, item, 'chest');
    else
      select i.id, i.price into item, item_gold from public.items i
        where public.chest_item(i.milestone, i.kind) order by i.id
        offset floor(public.chest_roll(c.id, 5)
          * (select count(*) from public.items i2 where public.chest_item(i2.milestone, i2.kind)))::integer
        limit 1;
    end if;
  end if;
  if public.chest_roll(c.id, 6) < d.shield_chance then
    update public.wallets set streak_shields = streak_shields + 1
      where user_id = uid and streak_shields < 2
      returning true into shield;
    if not coalesce(shield, false) then
      shield := true;
      select price into shield_gold from public.items where id = 'streak-shield';
    end if;
  end if;

  update public.wallets w set gold = w.gold + v_gold + item_gold + shield_gold,
    gems = w.gems + v_gems
    where w.user_id = uid;
  v_contents := jsonb_build_object(
    'id', c.id, 'kind', c.kind, 'gold', v_gold, 'gems', v_gems,
    'item', item, 'item_gold', item_gold, 'shield', shield, 'shield_gold', shield_gold);
  update public.chests set opened_at = now(), contents = v_contents where id = c.id;
  return v_contents || jsonb_build_object(
    'already_open', false,
    'wallet', (select jsonb_build_object('gold', w.gold, 'gems', w.gems,
                                         'streak_shields', w.streak_shields)
               from public.wallets w where w.user_id = uid));
end;
$$;
