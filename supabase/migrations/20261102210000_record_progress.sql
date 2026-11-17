-- Waymark: how subjects report progress (issue #18, ADR 0019).
-- Two functions the app calls instead of writing the tables directly. They run as the signed-in
-- user (security invoker), so row-level security from ADR 0017 still applies, and each one
-- updates its rows in a single transaction, so a wallet can't drift from the per-subject totals.

-- Adds XP and/or practice minutes for one subject: to the subject's totals, to today's activity
-- (today in the profile's time zone) and to the wallet.
create function public.record_progress(p_subject text, p_xp integer, p_minutes integer)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  zone text;
  today date;
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

  insert into public.wallets as w (user_id, xp)
    values (uid, p_xp)
    on conflict (user_id) do update set xp = w.xp + excluded.xp;
end;
$$;

-- Saves the subject's own state (ADR 0017: the platform never reads it).
create function public.save_subject_state(p_subject text, p_state jsonb)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'state must be a JSON object' using errcode = '22023';
  end if;
  insert into public.subject_progress as sp (user_id, subject_id, state)
    values (uid, p_subject, p_state)
    on conflict (user_id, subject_id) do update set state = excluded.state;
end;
$$;

revoke execute on function public.record_progress(text, integer, integer),
  public.save_subject_state(text, jsonb) from public, anon;
grant execute on function public.record_progress(text, integer, integer),
  public.save_subject_state(text, jsonb) to authenticated;
