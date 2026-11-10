-- Waymark: the daily cap on AI partner replies (E15, ADR 0036). Applies to dev on merge and to
-- prod on release (ADR 0018).
--
-- The partner runs in a Vercel function (api/partner.ts) on one shared free Gemini key, with Groq
-- as the backup. Before it asks either, it calls claim_partner_reply with the learner's own token,
-- so this one call proves the learner is signed in and has replies left today. A claim counts even
-- if the providers then fail, which keeps this simple; the room falls back to its script.

create table public.partner_replies (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  replies integer not null check (replies between 0 and 1000),
  primary key (user_id, day)
);
-- Written only by claim_partner_reply; nobody reads it through the Data API.
alter table public.partner_replies enable row level security;
revoke all on public.partner_replies from anon, authenticated;

-- Replies per learner per UTC day (Adam, 2026-11-10). Gemini's flash-lite took about 270 calls a
-- day with no cap hit, and Groq's backup allows 1,000 a day, so 40 each leaves room for the
-- handful of people Waymark is for.
create function public.partner_replies_per_day() returns integer
language sql immutable as $$ select 40 $$;

-- Takes one reply from today's allowance. Returns how many are left after this one, or -1 when
-- today's allowance was already used up (nothing is taken then).
create function public.claim_partner_reply() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cap integer := public.partner_replies_per_day();
  today date := (now() at time zone 'utc')::date;
  used integer;
begin
  if uid is null then
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
revoke execute on function public.partner_replies_per_day() from public, anon;
grant execute on function public.partner_replies_per_day() to authenticated;
