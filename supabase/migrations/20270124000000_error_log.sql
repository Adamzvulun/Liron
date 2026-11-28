-- Waymark: our own error log (task 10.1, #499; ADR 0058). Applies to dev on merge and to prod on
-- release (ADR 0018).
--
-- The app reports a crash through report_error(): the message, the first 10 stack lines, the
-- route, the app version and the browser, nothing the player typed. A player may write 20 rows a
-- day and the same message once a day; the newest 2,000 rows are kept. Nobody reads the table
-- through the API (RLS on, no policy, no grants); Adam reads it in the dashboard's Table Editor.

create table public.error_log (
  id bigint generated always as identity primary key,
  player_id uuid not null references auth.users (id) on delete cascade,
  message text not null,
  stack text not null,
  route text not null,
  version text not null,
  user_agent text not null,
  day date not null default (now() at time zone 'utc')::date,
  at timestamptz not null default now(),
  unique (player_id, day, message)
);
alter table public.error_log enable row level security;
revoke all on public.error_log from anon, authenticated;

create function public.report_error(
  p_message text, p_stack text, p_route text, p_version text, p_user_agent text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  -- Quietly drop what's over the daily cap; the reporter has nothing to do about it.
  if (select count(*) from public.error_log where player_id = uid and day = today) >= 20 then
    return;
  end if;
  insert into public.error_log (player_id, message, stack, route, version, user_agent)
  values (
    uid,
    left(coalesce(p_message, ''), 500),
    left(array_to_string((string_to_array(coalesce(p_stack, ''), E'\n'))[1:10], E'\n'), 4000),
    left(split_part(split_part(coalesce(p_route, ''), '?', 1), '#', 1), 200),
    left(coalesce(p_version, ''), 32),
    left(coalesce(p_user_agent, ''), 300)
  )
  on conflict (player_id, day, message) do nothing;
  delete from public.error_log
  where id <= (select id from public.error_log order by id desc offset 2000 limit 1);
end;
$$;
revoke execute on function public.report_error(text, text, text, text, text) from public, anon;
grant execute on function public.report_error(text, text, text, text, text) to authenticated;
