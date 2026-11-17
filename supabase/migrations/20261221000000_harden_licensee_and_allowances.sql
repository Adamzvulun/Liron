-- From a review of the database's rules (2026-11-15, report §4au).

-- 1. The deck's licence goes to the first account a project ever has, and only to it. Before,
-- the trigger fired whenever content_licensees was empty, so if the licensee's row were ever
-- deleted, the next account to sign up (an invited friend) would silently become the licensee
-- (ADR 0011, ADR 0023). Now it fires only when no other account exists.
create or replace function public.first_account_is_licensee() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from auth.users where id <> new.id)
     and not exists (select 1 from public.content_licensees) then
    insert into public.content_licensees (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.first_account_is_licensee() from public, anon, authenticated;

-- 2. The AI allowances (the partner's replies, the inn's lines) refuse anonymous sessions, as
-- the speech check does: a throwaway account mustn't get a day's allowance on our keys.
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
  return cap - used;
end;
$$;
revoke execute on function public.claim_partner_reply() from public, anon;
grant execute on function public.claim_partner_reply() to authenticated;

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
  return cap - used;
end;
$$;
revoke execute on function public.claim_chat_line() from public, anon;
grant execute on function public.claim_chat_line() to authenticated;

-- 3. The daily allowances' constants get a fixed search_path too (the Supabase linter asks).
alter function public.speech_checks_per_day() set search_path = '';
alter function public.partner_replies_per_day() set search_path = '';
alter function public.chat_lines_per_day() set search_path = '';
