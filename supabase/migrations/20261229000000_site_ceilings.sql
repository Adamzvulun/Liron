-- Waymark: fair shares of the free AI (task 2.2, #323, ADR 0041). Applies to dev on merge and to
-- prod on release (ADR 0018).
--
-- Every player's speech checks, partner replies and inn lines come out of the same free keys.
-- Each player already has a daily allowance; this adds a ceiling for the whole site, per UTC
-- day, kept below what the key itself allows, so a busy day for a few players ends with a
-- friendly line instead of the provider refusing everyone. A claim now returns:
--   n >= 0  the player's own allowance left after this one;
--   -1      the player's own allowance is used up (as before);
--   -2      the site's day is spent (new): nothing is taken from the player.

create table public.site_usage (
  kind text not null check (kind in ('speech', 'partner', 'chat')),
  day date not null,
  used integer not null check (used >= 0),
  primary key (kind, day)
);
-- Written only by take_site_share; nobody reads it through the Data API.
alter table public.site_usage enable row level security;
revoke all on public.site_usage from anon, authenticated;

-- The site's ceilings per UTC day (ADR 0041 has the sums). Each sits below the key's free limit.
create function public.site_ceiling(what text) returns integer
language sql immutable as $$
  select case what
    -- Groq whisper-large-v3: 2,000 requests a day.
    when 'speech' then 1500
    -- Gemini flash-lite first, then Groq's backup model at 1,000 requests a day.
    when 'partner' then 500
    -- Groq openai/gpt-oss-120b: 200,000 tokens a day, about 800 tokens a call, a retry at most.
    when 'chat' then 150
  end
$$;

-- Takes one from the site's day. False when the ceiling is reached (nothing is taken then).
create function public.take_site_share(what text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  cap integer := public.site_ceiling(what);
  today date := (now() at time zone 'utc')::date;
  taken integer;
begin
  insert into public.site_usage as u (kind, day, used)
    values (what, today, 1)
    on conflict (kind, day) do update set used = u.used + 1
    where u.used < cap
    returning u.used into taken;
  return taken is not null;
end;
$$;
revoke execute on function public.take_site_share(text) from public, anon, authenticated;

-- As before (20261106000000), and then the site's share.
create or replace function public.claim_speech_check() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cap integer := public.speech_checks_per_day();
  today date := (now() at time zone 'utc')::date;
  used integer;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not public.is_content_licensee() then
    raise exception 'only the licensed learner can check speech' using errcode = '42501';
  end if;
  insert into public.speech_checks as s (user_id, day, checks)
    values (uid, today, 1)
    on conflict (user_id, day) do update set checks = s.checks + 1
    where s.checks < cap
    returning checks into used;
  if used is null then
    return -1;
  end if;
  if not public.take_site_share('speech') then
    update public.speech_checks set checks = checks - 1 where user_id = uid and day = today;
    return -2;
  end if;
  return cap - used;
end;
$$;
revoke execute on function public.claim_speech_check() from public, anon;
grant execute on function public.claim_speech_check() to authenticated;

-- As before (20261221000000), and then the site's share.
create or replace function public.claim_partner_reply() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cap integer := public.partner_replies_per_day();
  today date := (now() at time zone 'utc')::date;
  used integer;
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  insert into public.partner_replies as p (user_id, day, replies)
    values (uid, today, 1)
    on conflict (user_id, day) do update set replies = p.replies + 1
    where p.replies < cap
    returning replies into used;
  if used is null then
    return -1;
  end if;
  if not public.take_site_share('partner') then
    update public.partner_replies set replies = replies - 1 where user_id = uid and day = today;
    return -2;
  end if;
  return cap - used;
end;
$$;
revoke execute on function public.claim_partner_reply() from public, anon;
grant execute on function public.claim_partner_reply() to authenticated;

-- As before (20261221000000), and then the site's share.
create or replace function public.claim_chat_line() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cap integer := public.chat_lines_per_day();
  today date := (now() at time zone 'utc')::date;
  used integer;
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  insert into public.chat_lines as c (user_id, day, lines)
    values (uid, today, 1)
    on conflict (user_id, day) do update set lines = c.lines + 1
    where c.lines < cap
    returning lines into used;
  if used is null then
    return -1;
  end if;
  if not public.take_site_share('chat') then
    update public.chat_lines set lines = lines - 1 where user_id = uid and day = today;
    return -2;
  end if;
  return cap - used;
end;
$$;
revoke execute on function public.claim_chat_line() from public, anon;
grant execute on function public.claim_chat_line() to authenticated;
