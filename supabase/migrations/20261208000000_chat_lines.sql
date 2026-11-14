-- Waymark: the daily cap on chat lines at the inn (E17, ADR 0038). Applies to dev on merge and to
-- prod on release (ADR 0018).
--
-- The regulars' Arabic lines are written by api/partner.ts (kind `inn-chat`) on Groq. Before it
-- asks, the function calls claim_chat_line with the learner's own token, so this one call proves
-- the learner is signed in and has lines left today. It's a counter of its own, apart from the
-- Radio Room's 40 partner replies (claim_partner_reply), so one never uses up the other.

create table public.chat_lines (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  lines integer not null check (lines between 0 and 1000),
  primary key (user_id, day)
);
-- Written only by claim_chat_line; nobody reads it through the Data API.
alter table public.chat_lines enable row level security;
revoke all on public.chat_lines from anon, authenticated;

-- Lines per learner per UTC day (ADR 0038): a chat is at most 8 of your lines, so about 7 chats.
create function public.chat_lines_per_day() returns integer
language sql immutable as $$ select 60 $$;

-- Takes one line from today's allowance. Returns how many are left after this one, or -1 when
-- today's allowance was already used up (nothing is taken then).
create function public.claim_chat_line() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cap integer := public.chat_lines_per_day();
  today date := (now() at time zone 'utc')::date;
  used integer;
begin
  if uid is null then
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
revoke execute on function public.chat_lines_per_day() from public, anon;
grant execute on function public.chat_lines_per_day() to authenticated;
