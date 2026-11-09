-- Waymark: the daily cap on "did it understand you?" checks (ADR 0011 #4, ADR 0014). Applies to
-- dev on merge and to prod on release (ADR 0018).
--
-- The check runs in a Vercel function (api/understood.ts) on one shared Groq key. Before it sends
-- a recording to Groq, it calls claim_speech_check with the learner's own token, so this one call
-- proves the learner is signed in, is a licensee of the deck the phrases come from (ADR 0011 #5),
-- and has checks left today. A claim counts even if Groq then fails, which keeps this simple.

create table public.speech_checks (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  checks integer not null check (checks between 0 and 1000),
  primary key (user_id, day)
);
-- Written only by claim_speech_check; nobody reads it through the Data API.
alter table public.speech_checks enable row level security;
revoke all on public.speech_checks from anon, authenticated;

-- Checks per learner per UTC day. Groq's free tier allows about 2,000 requests a day for the
-- whole key, so 100 each leaves room for the handful of people Waymark is for.
create function public.speech_checks_per_day() returns integer
language sql immutable as $$ select 100 $$;

-- Takes one check from today's allowance. Returns how many are left after this one, or -1 when
-- today's allowance was already used up (nothing is taken then).
create function public.claim_speech_check() returns integer
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
  return cap - used;
end;
$$;
revoke execute on function public.claim_speech_check() from public, anon;
grant execute on function public.claim_speech_check() to authenticated;
revoke execute on function public.speech_checks_per_day() from public, anon;
grant execute on function public.speech_checks_per_day() to authenticated;
