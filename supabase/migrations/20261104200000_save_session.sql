-- Waymark: one all-or-nothing save per session (ADR 0031). Applies to dev on merge and to prod
-- on release (ADR 0018).
--
-- save_session applies a finished session in one transaction: the subject's state, every
-- spaced-repetition review, every rating, then XP and minutes. It calls the existing functions,
-- so their checks and caps stay in one place. Each session has an id; sending the same id again
-- applies nothing, so a retry after a dropped connection is always safe.

create table public.saved_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  subject_id text not null references public.subjects (id),
  saved_at timestamptz not null default now(),
  primary key (user_id, session_id)
);
-- Written only by save_session; nobody reads it through the Data API.
alter table public.saved_sessions enable row level security;
revoke all on public.saved_sessions from anon, authenticated;

create function public.save_session(
  p_subject text,
  p_session uuid,
  p_state jsonb,
  p_reviews jsonb,
  p_results jsonb,
  p_xp integer,
  p_minutes integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  reviews jsonb := coalesce(p_reviews, '[]'::jsonb);
  results jsonb := coalesce(p_results, '[]'::jsonb);
  xp integer := coalesce(p_xp, 0);
  minutes integer := coalesce(p_minutes, 0);
  r jsonb;
  fresh integer;
  award jsonb := null;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_session is null then
    raise exception 'a session id is required' using errcode = '22023';
  end if;
  perform public.require_subject(p_subject);
  if jsonb_typeof(reviews) <> 'array' or jsonb_typeof(results) <> 'array' then
    raise exception 'reviews and results must be JSON arrays' using errcode = '22023';
  end if;
  if jsonb_array_length(reviews) > 200 or jsonb_array_length(results) > 200 then
    raise exception 'at most 200 reviews and 200 results a session' using errcode = '22023';
  end if;

  insert into public.saved_sessions (user_id, session_id, subject_id)
    values (uid, p_session, p_subject)
    on conflict do nothing;
  get diagnostics fresh = row_count;
  if fresh = 0 then
    return jsonb_build_object('duplicate', true, 'award', null);
  end if;

  if p_state is not null then
    perform public.save_subject_state(p_subject, p_state);
  end if;
  for r in select value from jsonb_array_elements(reviews) loop
    perform public.record_review(
      p_subject, r->>'item', (r->>'rating')::integer, (r->>'reviewed_at')::timestamptz,
      (r->>'due')::timestamptz, (r->>'state')::integer, r->'card', r->'log');
  end loop;
  for r in select value from jsonb_array_elements(results) loop
    perform public.record_result(
      p_subject, r->>'skill', r->>'item', (r->>'score')::real, (r->>'rated_at')::timestamptz,
      r->'learner', r->'item_rating');
  end loop;
  if xp > 0 or minutes > 0 then
    award := public.record_progress(p_subject, xp, minutes);
  end if;
  return jsonb_build_object('duplicate', false, 'award', award);
end;
$$;

revoke execute on function public.save_session(text, uuid, jsonb, jsonb, jsonb, integer, integer)
  from public, anon;
grant execute on function public.save_session(text, uuid, jsonb, jsonb, jsonb, integer, integer)
  to authenticated;
