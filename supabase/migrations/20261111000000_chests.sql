-- Waymark: reward chests (ADR 0033, #48). Applies to dev on merge and to prod on release
-- (ADR 0018).
--
-- Chests are granted only by database functions: finishing all 3 of a day's contracts (wooden),
-- each trial passed (brass), and streak days 7, 30 and 100. Each source gives one chest. What's
-- inside is rolled when the chest is opened, seeded by the chest's id, so it can't be rerolled,
-- and opening it twice pays once. Drop tables are data (content/core/chests.json, copied here; a
-- test keeps them equal).

---------------------------------------------------------------------------------------------
-- 1. Drop tables and where chests come from (data)
---------------------------------------------------------------------------------------------
create table public.chest_drops (
  kind text primary key check (kind ~ '^[a-z][a-z0-9-]{1,31}$'),
  name text not null,
  gold_min integer not null check (gold_min >= 0),
  gold_max integer not null check (gold_max >= gold_min),
  gem_chance real not null check (gem_chance between 0 and 1),
  gems_min integer not null check (gems_min >= 0),
  gems_max integer not null check (gems_max >= gems_min),
  gear_chance real not null check (gear_chance between 0 and 1),
  shield_chance real not null check (shield_chance between 0 and 1)
);
alter table public.chest_drops enable row level security;
revoke all on public.chest_drops from anon, authenticated;

insert into public.chest_drops values
  ('wooden', 'Wooden chest', 15, 40, 0.05, 1, 1, 0.10, 0.05),
  ('brass', 'Brass chest', 40, 80, 0.25, 1, 1, 0.40, 0.15),
  ('jeweled', 'Jeweled chest', 80, 150, 1.0, 1, 2, 0.60, 0.40);

create table public.chest_sources (
  id text primary key,
  source text not null check (source in ('contracts', 'trial', 'streak')),
  days integer check (days > 0),
  chest text not null references public.chest_drops (kind),
  check ((source = 'streak') = (days is not null))
);
alter table public.chest_sources enable row level security;
revoke all on public.chest_sources from anon, authenticated;

insert into public.chest_sources values
  ('contracts', 'contracts', null, 'wooden'),
  ('trial', 'trial', null, 'brass'),
  ('streak-7', 'streak', 7, 'brass'),
  ('streak-30', 'streak', 30, 'jeweled'),
  ('streak-100', 'streak', 100, 'jeweled');

---------------------------------------------------------------------------------------------
-- 2. Each player's chests
---------------------------------------------------------------------------------------------
create table public.chests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null references public.chest_drops (kind),
  -- contracts: the day; trial: subject:chapter; streak: the day it was reached:days
  source text not null check (source in ('contracts', 'trial', 'streak')),
  source_key text not null,
  granted_at timestamptz not null default now(),
  opened_at timestamptz,
  contents jsonb,
  unique (user_id, source, source_key)
);
alter table public.chests enable row level security;
create policy "own chests: read" on public.chests for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.chests from anon, authenticated;
grant select on public.chests to authenticated;

-- Grants every chest the player has earned and doesn't have yet. Runs after every save and
-- when the board opens (via claim_contracts).
create function public.grant_chests(uid uuid, today date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  streak integer;
begin
  -- All of today's contracts paid.
  if (select count(*) = 3 and bool_and(paid_gold is not null) from public.daily_contracts
      where user_id = uid and day = today) then
    insert into public.chests (user_id, kind, source, source_key)
      select uid, s.chest, 'contracts', today::text from public.chest_sources s
      where s.source = 'contracts'
      on conflict do nothing;
  end if;
  -- Each trial passed, ever (the trial-<chapter> events, ADR 0033).
  insert into public.chests (user_id, kind, source, source_key)
    select distinct uid, s.chest, 'trial', e.subject_id || ':' || substr(e.kind, 7)
    from public.subject_events e cross join public.chest_sources s
    where e.user_id = uid and e.kind ~ '^trial-[0-9]+$' and s.source = 'trial'
    on conflict do nothing;
  -- Streak days 7, 30 and 100, once today's goal is reached. Shielded days don't count
  -- (ADR 0034), so a shield never earns one by itself.
  if exists (select 1 from public.daily_activity
             where user_id = uid and day = today and goal_reached) then
    streak := public.current_streak();
    insert into public.chests (user_id, kind, source, source_key)
      select uid, s.chest, 'streak', today::text || ':' || s.days from public.chest_sources s
      where s.source = 'streak' and s.days = streak
      on conflict do nothing;
  end if;
end;
$$;
revoke execute on function public.grant_chests(uuid, date) from public, anon, authenticated;

-- As before (20261110000000), then grants any chests now earned.
create or replace function public.claim_contracts(uid uuid, today date) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  c record;
  paid text[] := '{}';
  hit boolean;
begin
  for c in select * from public.contract_progress(uid, today) loop
    if not c.paid and c.progress >= c.target then
      update public.daily_contracts set paid_gold = c.gold, paid_at = now()
        where user_id = uid and day = today and template_id = c.id and paid_gold is null
        returning true into hit;
      if coalesce(hit, false) then
        update public.wallets set gold = gold + c.gold where user_id = uid;
        paid := paid || c.id;
      end if;
      hit := false;
    end if;
  end loop;
  perform public.grant_milestones(uid);
  perform public.grant_chests(uid, today);
  return paid;
end;
$$;
revoke execute on function public.claim_contracts(uuid, date) from public, anon, authenticated;

---------------------------------------------------------------------------------------------
-- 3. Opening a chest
---------------------------------------------------------------------------------------------
-- A number from 0 up to 1, the same every time for this chest and roll.
create function public.chest_roll(p_chest uuid, p_roll integer) returns double precision
language sql immutable set search_path = '' as $$
  select ('x' || substr(md5(p_chest::text || ':' || p_roll), 1, 8))::bit(32)::bigint
    / 4294967296.0
$$;
revoke execute on function public.chest_roll(uuid, integer) from public, anon, authenticated;

-- Opens one of the player's chests: rolls its contents from its drop table and pays them. Gear
-- is one the player doesn't own yet (all owned: its price in gold); a shield when already
-- holding 2 is its price in gold. Opening an opened chest returns the same contents and pays
-- nothing.
create function public.open_chest(p_chest uuid) returns jsonb
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
      where i.kind = 'gear'
        and i.id not in (select item_id from public.owned_items where user_id = uid);
    if unowned > 0 then
      select i.id into item from public.items i
        where i.kind = 'gear'
          and i.id not in (select item_id from public.owned_items where user_id = uid)
        order by i.id
        offset floor(public.chest_roll(c.id, 5) * unowned)::integer limit 1;
      insert into public.owned_items (user_id, item_id, source) values (uid, item, 'chest');
    else
      select i.id, i.price into item, item_gold from public.items i
        where i.kind = 'gear' order by i.id
        offset floor(public.chest_roll(c.id, 5)
          * (select count(*) from public.items where kind = 'gear'))::integer
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
revoke execute on function public.open_chest(uuid) from public, anon;
grant execute on function public.open_chest(uuid) to authenticated;
