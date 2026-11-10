-- Waymark: rank gear (#176, ADR 0035). Applies to dev on merge and to prod on release (ADR 0018).
--
-- One piece for each rank you can reach now. It is only ever earned: taking the rank (its
-- rank-<id> event) gives it through grant_milestones, and the Market and chests leave it out.
-- Its price is never charged; it only ranks it beside the other gear.

insert into public.items (id, kind, slot, rarity, price, milestone) values
  ('ear-cups', 'gear', 'head', 'epic', 450, '{"kind": "rank", "subject": "morse", "rank": "listener"}'),
  ('brass-key', 'gear', 'hand', 'epic', 450, '{"kind": "rank", "subject": "morse", "rank": "keyer"}'),
  ('operator-coat', 'gear', 'torso', 'epic', 450, '{"kind": "rank", "subject": "morse", "rank": "operator"}'),
  ('night-lantern', 'gear', 'hand', 'epic', 450, '{"kind": "rank", "subject": "morse", "rank": "telegraphist"}'),
  ('house-sash', 'gear', 'torso', 'epic', 450, '{"kind": "rank", "subject": "arabic", "rank": "guest"}'),
  ('keffiyeh', 'gear', 'head', 'epic', 450, '{"kind": "rank", "subject": "arabic", "rank": "traveler"}');

-- True for gear only a rank gives.
create function public.is_rank_gear(milestone jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(milestone ->> 'kind' = 'rank', false)
$$;
revoke execute on function public.is_rank_gear(jsonb) from public, anon, authenticated;

-- As before (20261110000000), plus the rank milestone: the rank's event was ever sent.
create or replace function public.grant_milestones(uid uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  i record;
  met boolean;
  given text[] := '{}';
begin
  for i in select * from public.items
           where milestone is not null
             and id not in (select item_id from public.owned_items where user_id = uid) loop
    met := case i.milestone ->> 'kind'
      when 'subject-level' then exists (
        select 1 from public.subject_progress
        where user_id = uid and subject_id = i.milestone ->> 'subject'
          and public.level_for_xp(xp) >= (i.milestone ->> 'level')::integer)
      when 'streak' then public.current_streak() >= (i.milestone ->> 'days')::integer
      when 'contracts' then (
        select count(*) from public.daily_contracts
        where user_id = uid and paid_gold is not null) >= (i.milestone ->> 'count')::integer
      when 'trial' then exists (
        select 1 from public.subject_events
        where user_id = uid and kind = 'trial-' || (i.milestone ->> 'chapter'))
      when 'rank' then exists (
        select 1 from public.subject_events
        where user_id = uid and subject_id = i.milestone ->> 'subject'
          and kind = 'rank-' || (i.milestone ->> 'rank'))
      else false
    end;
    if met then
      insert into public.owned_items (user_id, item_id, source)
        values (uid, i.id, 'milestone') on conflict do nothing;
      given := given || i.id;
    end if;
  end loop;
  return given;
end;
$$;

-- As before (20261113000000), with rank gear left out.
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
    ) s order by slot, k)
$$;

-- As before (20261111000000), with rank gear left out of the roll.
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
      where i.kind = 'gear' and not public.is_rank_gear(i.milestone)
        and i.id not in (select item_id from public.owned_items where user_id = uid);
    if unowned > 0 then
      select i.id into item from public.items i
        where i.kind = 'gear' and not public.is_rank_gear(i.milestone)
          and i.id not in (select item_id from public.owned_items where user_id = uid)
        order by i.id
        offset floor(public.chest_roll(c.id, 5) * unowned)::integer limit 1;
      insert into public.owned_items (user_id, item_id, source) values (uid, item, 'chest');
    else
      select i.id, i.price into item, item_gold from public.items i
        where i.kind = 'gear' and not public.is_rank_gear(i.milestone) order by i.id
        offset floor(public.chest_roll(c.id, 5)
          * (select count(*) from public.items where kind = 'gear' and not public.is_rank_gear(milestone)))::integer
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
