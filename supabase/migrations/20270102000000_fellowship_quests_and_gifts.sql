-- Waymark: Fellowship quests and gifts (task 3.5, #330; fellowship-build.md §5, ADR 0045).
-- Applies to dev on merge and to prod on release (ADR 0018).
--
-- A weekly quest for you and your friends together, counted from rows the database already
-- keeps (daily minutes, subject events), never from a counter the browser bumps. Each member's
-- rows count once. The reward is paid once per member per week, and only to a member who
-- helped. A gift is one of today's Market wares bought for a friend, in one transaction.

---------------------------------------------------------------------------------------------
-- 1. The quests: data, like contracts (ADR 0032)
---------------------------------------------------------------------------------------------
create table public.fellowship_quests (
  id text primary key check (id ~ '^[a-z][a-z0-9-]{1,63}$'),
  -- minutes: everyone's minutes, any subject; event: `kind` events of `subject_id`
  metric text not null check (metric in ('minutes', 'event')),
  subject_id text references public.subjects (id),
  kind text,
  target integer not null check (target between 1 and 10000),
  gold integer not null check (gold between 1 and 100),
  check ((metric = 'event') = (subject_id is not null and kind is not null))
);
alter table public.fellowship_quests enable row level security;
revoke all on public.fellowship_quests from anon, authenticated;

-- Half the weeks count minutes, so a friend on either road can always help.
insert into public.fellowship_quests (id, metric, subject_id, kind, target, gold) values
  ('together-minutes', 'minutes', null, null, 300, 40),
  ('together-hours', 'minutes', null, null, 600, 60),
  ('inn-talk', 'event', 'arabic', 'inn-chat', 10, 40),
  ('rush-rounds', 'event', 'morse', 'rush-round', 10, 40);

-- The week's quest: the same for everyone, picked by the week's Monday.
create function public.fellowship_quest_of(p_week date) returns public.fellowship_quests
language sql stable set search_path = '' as $$
  select q.* from public.fellowship_quests q order by md5(p_week::text || ':' || q.id) limit 1
$$;
revoke execute on function public.fellowship_quest_of(date) from public, anon, authenticated;

-- One member's part of a quest in the week starting `p_week`: their own rows only.
create function public.quest_part(uid uuid, q public.fellowship_quests, p_week date)
returns integer
language sql stable security definer set search_path = '' as $$
  select case q.metric
    when 'minutes' then coalesce((
      select sum(a.minutes) from public.daily_activity a
      where a.user_id = uid and a.day >= p_week and a.day < p_week + 7), 0)
    else coalesce((
      select sum(e.count) from public.subject_events e
      where e.user_id = uid and e.subject_id = q.subject_id and e.kind = q.kind
        and e.day >= p_week and e.day < p_week + 7), 0)
  end::integer
$$;
revoke execute on function public.quest_part(uuid, public.fellowship_quests, date)
  from public, anon, authenticated;

create table public.fellowship_quest_rewards (
  user_id uuid not null references auth.users (id) on delete cascade,
  week date not null,
  quest_id text not null references public.fellowship_quests (id),
  gold integer not null,
  paid_at timestamptz not null default now(),
  primary key (user_id, week)
);
alter table public.fellowship_quest_rewards enable row level security;
revoke all on public.fellowship_quest_rewards from anon, authenticated;

-- This week's quest for you and your friends: the target, everyone's total, your part, and
-- whether you've collected. Null for a player with no friend: the quest is for a Fellowship.
create function public.fellowship_quest() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  this_week date;
  q public.fellowship_quests;
  mine integer;
  total integer;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not exists (select 1 from public.friendships f
                 where uid in (f.low, f.high) and f.accepted_at is not null) then
    return null;
  end if;
  this_week := date_trunc('week', public.player_today())::date;
  q := public.fellowship_quest_of(this_week);
  mine := public.quest_part(uid, q, this_week);
  select mine + coalesce(sum(public.quest_part(
           case when f.low = uid then f.high else f.low end, q, this_week)), 0)
    into total
    from public.friendships f
    where uid in (f.low, f.high) and f.accepted_at is not null;
  return jsonb_build_object(
    'id', q.id, 'metric', q.metric, 'subject', q.subject_id, 'target', q.target,
    'gold', q.gold, 'week', this_week, 'total', total, 'mine', mine,
    'collected', exists (select 1 from public.fellowship_quest_rewards r
                         where r.user_id = uid and r.week = this_week));
end;
$$;

-- Pays this week's quest to you, once, if your Fellowship reached it and you helped.
-- Returns your gold after.
create function public.collect_fellowship_quest() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  st jsonb := public.fellowship_quest();
  left_gold integer;
begin
  if st is null or (st ->> 'total')::integer < (st ->> 'target')::integer then
    raise exception 'not done yet' using errcode = 'P0001', hint = 'not-done';
  end if;
  if (st ->> 'mine')::integer < 1 then
    raise exception 'help first' using errcode = 'P0001', hint = 'not-helped';
  end if;
  insert into public.fellowship_quest_rewards (user_id, week, quest_id, gold)
    values (uid, (st ->> 'week')::date, st ->> 'id', (st ->> 'gold')::integer);
  insert into public.wallets (user_id) values (uid) on conflict do nothing;
  update public.wallets set gold = gold + (st ->> 'gold')::integer, updated_at = now()
    where user_id = uid returning gold into left_gold;
  return left_gold;
exception when unique_violation then
  raise exception 'already collected' using errcode = 'P0001', hint = 'collected';
end;
$$;

---------------------------------------------------------------------------------------------
-- 2. Gifts: one of today's wares, bought for a friend
---------------------------------------------------------------------------------------------
alter table public.owned_items drop constraint owned_items_source_check;
alter table public.owned_items add constraint owned_items_source_check
  check (source in ('milestone', 'chest', 'market', 'gift'));

create table public.gifts (
  id bigint generated always as identity primary key,
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.items (id),
  price integer not null,
  at timestamptz not null default now(),
  check (from_id <> to_id)
);
create index gifts_to on public.gifts (to_id, at desc);
create index gifts_from on public.gifts (from_id, at desc);
alter table public.gifts enable row level security;
revoke all on public.gifts from anon, authenticated;

create function public.gifts_per_day() returns integer language sql immutable as $$ select 3 $$;

-- Gives a friend one of today's gear or colors, paid in your gold. Refuses a stranger, a ware
-- not on today's stall, a shield, one they already own, too little gold, and a fourth gift in a
-- day. Returns your gold after.
create function public.give_item(p_friend uuid, p_item text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  it public.items%rowtype;
  w public.wallets%rowtype;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not public.are_friends(uid, p_friend) then
    raise exception 'only a friend' using errcode = 'P0001', hint = 'not-friends';
  end if;
  select * into it from public.items where id = p_item;
  if it.id is null or it.kind = 'functional'
     or not (p_item = any (public.market_stock(public.player_today()))) then
    raise exception 'not for giving today' using errcode = 'P0001', hint = 'not-for-sale';
  end if;
  -- The giver's purse is locked first, so two gifts at once are taken one after the other.
  select * into w from public.wallets where user_id = uid for update;
  if (select count(*) from public.gifts g
      where g.from_id = uid and g.at > now() - interval '1 day') >= public.gifts_per_day() then
    raise exception 'that''s enough for today' using errcode = 'P0001', hint = 'daily-limit';
  end if;
  if exists (select 1 from public.owned_items o where o.user_id = p_friend and o.item_id = p_item)
  then
    raise exception 'they have it' using errcode = 'P0001', hint = 'owned';
  end if;
  if w.user_id is null or w.gold < it.price then
    raise exception 'too little gold' using errcode = 'P0001', hint = 'gold';
  end if;
  insert into public.owned_items (user_id, item_id, source) values (p_friend, p_item, 'gift');
  insert into public.gifts (from_id, to_id, item_id, price) values (uid, p_friend, p_item, it.price);
  update public.wallets set gold = gold - it.price, updated_at = now()
    where user_id = uid returning * into w;
  return w.gold;
exception when unique_violation then
  -- Another friend's gift of the same ware landed first: nothing is taken.
  raise exception 'they have it' using errcode = 'P0001', hint = 'owned';
end;
$$;

-- Gifts you received in the last 30 days, newest first, from current friends: who, what, the
-- day.
create function public.my_gifts() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', g.id, 'from', g.from_id, 'name', public.shown_name(p.display_name),
      'item', g.item_id, 'day', to_char(g.at at time zone 'utc', 'YYYY-MM-DD'))
      order by g.at desc, g.id desc)
    from public.gifts g join public.profiles p on p.id = g.from_id
    where g.to_id = uid and g.at > now() - interval '30 days'
      and public.are_friends(g.from_id, uid)), '[]'::jsonb);
end;
$$;

revoke execute on function
  public.fellowship_quest(), public.collect_fellowship_quest(), public.gifts_per_day(),
  public.give_item(uuid, text), public.my_gifts()
  from public, anon;
grant execute on function
  public.fellowship_quest(), public.collect_fellowship_quest(), public.gifts_per_day(),
  public.give_item(uuid, text), public.my_gifts()
  to authenticated;
