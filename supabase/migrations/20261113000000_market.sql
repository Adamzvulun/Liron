-- Waymark: the Market (#49, ADR 0033). Applies to dev on merge and to prod on release (ADR 0018).
--
-- Four wares a day, the same for everyone: 2 gear, 1 color and 1 functional item, picked from
-- the catalogue by the date. Gold buys them; the database takes the gold and gives the item in
-- one transaction. No real money.

-- The day's stock: item ids in slot order, seeded by the date.
create function public.market_stock(p_day date) returns text[]
language sql stable set search_path = '' as $$
  select array(
    select id from (
      (select i.id, 1 as slot, md5(p_day::text || ':' || i.id) as k from public.items i
        where i.kind = 'gear' order by k limit 2)
      union all
      (select i.id, 2, md5(p_day::text || ':' || i.id) as k from public.items i
        where i.kind = 'color' order by k limit 1)
      union all
      (select i.id, 3, md5(p_day::text || ':' || i.id) as k from public.items i
        where i.kind = 'functional' order by k limit 1)
    ) s order by slot, k)
$$;
revoke execute on function public.market_stock(date) from public, anon, authenticated;

-- The stall: today's wares, each marked owned (a shield: holding 2) and affordable.
create function public.market_today() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date;
  w public.wallets%rowtype;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  today := public.player_today();
  select * into w from public.wallets where user_id = uid;
  return jsonb_build_object(
    'day', today,
    'wares', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', i.id, 'kind', i.kind, 'slot', i.slot, 'rarity', i.rarity, 'price', i.price,
          'owned', case when i.kind = 'functional' then coalesce(w.streak_shields, 0) >= 2
                        else exists (select 1 from public.owned_items o
                                     where o.user_id = uid and o.item_id = i.id) end,
          'affordable', coalesce(w.gold, 0) >= i.price)
        order by s.n)
      from unnest(public.market_stock(today)) with ordinality as s(id, n)
      join public.items i on i.id = s.id), '[]'::jsonb));
end;
$$;
revoke execute on function public.market_today() from public, anon;
grant execute on function public.market_today() to authenticated;

-- Buys one of today's wares. Refuses one not in stock, one already owned (a shield when
-- holding 2) and too little gold. Returns the wallet after.
create function public.buy_item(p_item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  it public.items%rowtype;
  w public.wallets%rowtype;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not (p_item = any (public.market_stock(public.player_today()))) then
    raise exception 'not for sale today' using errcode = '22023';
  end if;
  select * into it from public.items where id = p_item;
  select * into w from public.wallets where user_id = uid for update;
  if not found then
    raise exception 'too little gold' using errcode = '22023';
  end if;
  if it.kind = 'functional' then
    if w.streak_shields >= 2 then
      raise exception 'already owned' using errcode = '22023';
    end if;
  elsif exists (select 1 from public.owned_items where user_id = uid and item_id = it.id) then
    raise exception 'already owned' using errcode = '22023';
  end if;
  if w.gold < it.price then
    raise exception 'too little gold' using errcode = '22023';
  end if;

  if it.kind = 'functional' then
    update public.wallets set gold = gold - it.price, streak_shields = streak_shields + 1
      where user_id = uid returning * into w;
  else
    insert into public.owned_items (user_id, item_id, source) values (uid, it.id, 'market');
    update public.wallets set gold = gold - it.price where user_id = uid returning * into w;
  end if;
  return jsonb_build_object('item', it.id, 'wallet',
    jsonb_build_object('gold', w.gold, 'gems', w.gems, 'streak_shields', w.streak_shields));
end;
$$;
revoke execute on function public.buy_item(text) from public, anon;
grant execute on function public.buy_item(text) to authenticated;
