-- Waymark: levels, gold and gems (issue #19, ADR 0020). Rates: docs/game/economy.md.
-- The same curve and rules live in src/core/progress/economy.ts; a test checks they agree.

-- Total XP needed to reach a level. Level n -> n+1 costs 10n + 10 XP (20, 30, 40, ...),
-- so the total for level L is 5(L-1)(L+2): level 2 at 20 XP, 5 at 140, 10 at 540, 20 at 2,090.
create function public.xp_for_level(p_level integer) returns bigint
language sql immutable set search_path = '' as $$
  select 5::bigint * (greatest(p_level, 1) - 1) * (greatest(p_level, 1) + 2)
$$;

-- The level for a total XP (level 1 at 0 XP). Solves the curve, then corrects rounding.
create function public.level_for_xp(p_xp bigint) returns integer
language plpgsql immutable set search_path = '' as $$
declare
  lvl integer := greatest(1, floor((sqrt(9 + 0.8 * greatest(p_xp, 0)) - 1) / 2)::integer);
begin
  while public.xp_for_level(lvl + 1) <= p_xp loop lvl := lvl + 1; end loop;
  while lvl > 1 and public.xp_for_level(lvl) > p_xp loop lvl := lvl - 1; end loop;
  return lvl;
end;
$$;

-- record_progress (ADR 0019) now also pays gold and gems, and says what happened:
-- 1 gold per 5 XP; reaching level L pays 5 x L gold; every 5th level also pays 1 gem.
drop function public.record_progress(text, integer, integer);

create function public.record_progress(p_subject text, p_xp integer, p_minutes integer)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  zone text;
  today date;
  xp_before bigint;
  xp_after bigint;
  lvl_before integer;
  lvl_after integer;
  gold_earned integer;
  gems_earned integer;
  w record;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_xp is null or p_minutes is null or p_xp < 0 or p_minutes < 0
     or p_xp > 10000 or p_minutes > 240 or (p_xp = 0 and p_minutes = 0) then
    raise exception 'invalid amounts: xp %, minutes %', p_xp, p_minutes using errcode = '22023';
  end if;

  select time_zone into zone from public.profiles where id = uid;
  begin
    today := (now() at time zone coalesce(zone, 'UTC'))::date;
  exception when invalid_parameter_value then
    today := (now() at time zone 'UTC')::date; -- an unknown zone name never loses progress
  end;

  insert into public.subject_progress as sp (user_id, subject_id, xp, minutes)
    values (uid, p_subject, p_xp, p_minutes)
    on conflict (user_id, subject_id) do update
      set xp = sp.xp + excluded.xp, minutes = sp.minutes + excluded.minutes;

  insert into public.daily_activity as da (user_id, day, xp, minutes)
    values (uid, today, p_xp, p_minutes)
    on conflict (user_id, day) do update
      set xp = da.xp + excluded.xp, minutes = least(1440, da.minutes + excluded.minutes);

  -- Lock the wallet row so two awards at once can't both pay the same level-up.
  insert into public.wallets (user_id) values (uid) on conflict do nothing;
  select xp into xp_before from public.wallets where user_id = uid for update;
  xp_after := xp_before + p_xp;
  lvl_before := public.level_for_xp(xp_before);
  lvl_after := public.level_for_xp(xp_after);
  gold_earned := (xp_after / 5 - xp_before / 5)
    + 5 * ((lvl_after * (lvl_after + 1)) / 2 - (lvl_before * (lvl_before + 1)) / 2);
  gems_earned := lvl_after / 5 - lvl_before / 5;

  update public.wallets
    set xp = xp_after, gold = gold + gold_earned, gems = gems + gems_earned
    where user_id = uid
    returning xp, gold, gems into w;

  return jsonb_build_object(
    'xp', w.xp, 'gold', w.gold, 'gems', w.gems,
    'xp_earned', p_xp, 'gold_earned', gold_earned, 'gems_earned', gems_earned,
    'level_before', lvl_before, 'level', lvl_after
  );
end;
$$;

revoke execute on function public.record_progress(text, integer, integer) from public, anon;
grant execute on function public.record_progress(text, integer, integer) to authenticated;
