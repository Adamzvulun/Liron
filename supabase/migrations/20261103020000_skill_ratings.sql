-- Waymark: Glicko-2 skill ratings (issue #22, ADR 0010, ADR 0024).
-- A rating per user, subject and skill, a rating per user, subject, skill and item, and an
-- append-only log of results. The browser does the Glicko-2 maths; record_result saves both
-- new ratings and the log entry together.

create table public.skill_ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null check (subject_id ~ '^[a-z][a-z0-9-]{1,31}$'),
  skill text not null check (skill ~ '^[a-z][a-z0-9-]{1,31}$'),
  rating double precision not null check (rating between -5000 and 10000),
  rd double precision not null check (rd > 0 and rd <= 350),
  volatility double precision not null check (volatility > 0 and volatility < 1),
  games integer not null check (games >= 0),
  rated_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, subject_id, skill)
);

create table public.item_ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null check (subject_id ~ '^[a-z][a-z0-9-]{1,31}$'),
  skill text not null check (skill ~ '^[a-z][a-z0-9-]{1,31}$'),
  item_id text not null check (char_length(item_id) between 1 and 128),
  rating double precision not null check (rating between -5000 and 10000),
  rd double precision not null check (rd > 0 and rd <= 350),
  volatility double precision not null check (volatility > 0 and volatility < 1),
  games integer not null check (games >= 0),
  rated_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, subject_id, skill, item_id)
);

-- Every result, with both ratings afterwards: the trend line, and recalibration later.
create table public.rating_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null check (subject_id ~ '^[a-z][a-z0-9-]{1,31}$'),
  skill text not null check (skill ~ '^[a-z][a-z0-9-]{1,31}$'),
  item_id text not null check (char_length(item_id) between 1 and 128),
  score real not null check (score between 0 and 1),
  rated_at timestamptz not null,
  learner_rating double precision not null,
  item_rating double precision not null
);

create index rating_log_skill on public.rating_log (user_id, subject_id, skill, rated_at);

create trigger skill_ratings_touch before update on public.skill_ratings
  for each row execute function public.touch_updated_at();
create trigger item_ratings_touch before update on public.item_ratings
  for each row execute function public.touch_updated_at();

alter table public.skill_ratings enable row level security;
alter table public.item_ratings enable row level security;
alter table public.rating_log enable row level security;

create policy "own skill ratings: read" on public.skill_ratings for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own skill ratings: create" on public.skill_ratings for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own skill ratings: update" on public.skill_ratings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own item ratings: read" on public.item_ratings for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own item ratings: create" on public.item_ratings for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own item ratings: update" on public.item_ratings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- The log is append-only: read and add, never change.
create policy "own rating log: read" on public.rating_log for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rating log: add" on public.rating_log for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke all on public.skill_ratings, public.item_ratings, public.rating_log
  from anon, authenticated;
grant select, insert, update on public.skill_ratings, public.item_ratings to authenticated;
grant select, insert on public.rating_log to authenticated;

-- Saves one result: the learner's and the item's new ratings, and the log entry.
create function public.record_result(
  p_subject text, p_skill text, p_item text, p_score real, p_rated_at timestamptz,
  p_learner jsonb, p_item_rating jsonb
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_rated_at > now() + interval '1 day' then
    raise exception 'result time is in the future' using errcode = '22023';
  end if;
  insert into public.skill_ratings
      (user_id, subject_id, skill, rating, rd, volatility, games, rated_at)
    values (uid, p_subject, p_skill, (p_learner->>'rating')::double precision,
      (p_learner->>'rd')::double precision, (p_learner->>'volatility')::double precision,
      (p_learner->>'games')::integer, p_rated_at)
    on conflict (user_id, subject_id, skill) do update
      set rating = excluded.rating, rd = excluded.rd, volatility = excluded.volatility,
        games = excluded.games, rated_at = excluded.rated_at;
  insert into public.item_ratings
      (user_id, subject_id, skill, item_id, rating, rd, volatility, games, rated_at)
    values (uid, p_subject, p_skill, p_item, (p_item_rating->>'rating')::double precision,
      (p_item_rating->>'rd')::double precision,
      (p_item_rating->>'volatility')::double precision,
      (p_item_rating->>'games')::integer, p_rated_at)
    on conflict (user_id, subject_id, skill, item_id) do update
      set rating = excluded.rating, rd = excluded.rd, volatility = excluded.volatility,
        games = excluded.games, rated_at = excluded.rated_at;
  insert into public.rating_log
      (user_id, subject_id, skill, item_id, score, rated_at, learner_rating, item_rating)
    values (uid, p_subject, p_skill, p_item, p_score, p_rated_at,
      (p_learner->>'rating')::double precision, (p_item_rating->>'rating')::double precision);
end;
$$;

revoke execute on function public.record_result(text, text, text, real, timestamptz, jsonb, jsonb)
  from public, anon;
grant execute on function public.record_result(text, text, text, real, timestamptz, jsonb, jsonb)
  to authenticated;
