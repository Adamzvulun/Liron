-- Waymark: spaced repetition (issue #21, ADR 0022).
-- One card per user, subject and item, holding FSRS's state, and an append-only review log.
-- The browser computes the schedule with ts-fsrs; record_review saves card and log together.

create table public.review_cards (
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null check (subject_id ~ '^[a-z][a-z0-9-]{1,31}$'),
  item_id text not null check (char_length(item_id) between 1 and 128),
  due timestamptz not null,
  state smallint not null check (state between 0 and 3), -- FSRS: new, learning, review, relearning
  card jsonb not null, -- FSRS's card, as ts-fsrs returns it; only the scheduler reads it
  updated_at timestamptz not null default now(),
  primary key (user_id, subject_id, item_id)
);

-- "What's due in this subject?" is the main question.
create index review_cards_due on public.review_cards (user_id, subject_id, due);

create table public.review_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null check (subject_id ~ '^[a-z][a-z0-9-]{1,31}$'),
  item_id text not null check (char_length(item_id) between 1 and 128),
  rating smallint not null check (rating between 1 and 4), -- again, hard, good, easy
  reviewed_at timestamptz not null,
  log jsonb not null -- FSRS's review log entry, kept for later re-optimising the parameters
);

create index review_log_item on public.review_log (user_id, subject_id, item_id, reviewed_at);

create trigger review_cards_touch before update on public.review_cards
  for each row execute function public.touch_updated_at();

alter table public.review_cards enable row level security;
alter table public.review_log enable row level security;

create policy "own cards: read" on public.review_cards for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own cards: create" on public.review_cards for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own cards: update" on public.review_cards for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- The log is append-only: read and add, never change.
create policy "own log: read" on public.review_log for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own log: add" on public.review_log for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke all on public.review_cards, public.review_log from anon, authenticated;
grant select, insert, update on public.review_cards to authenticated;
grant select, insert on public.review_log to authenticated;

-- Saves one review: the card's new state and the log entry, in one transaction.
create function public.record_review(
  p_subject text, p_item text, p_rating integer, p_reviewed_at timestamptz,
  p_due timestamptz, p_state integer, p_card jsonb, p_log jsonb
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_reviewed_at > now() + interval '1 day' then
    raise exception 'review time is in the future' using errcode = '22023';
  end if;
  if jsonb_typeof(p_card) <> 'object' or jsonb_typeof(p_log) <> 'object' then
    raise exception 'card and log must be JSON objects' using errcode = '22023';
  end if;
  insert into public.review_cards as rc (user_id, subject_id, item_id, due, state, card)
    values (uid, p_subject, p_item, p_due, p_state, p_card)
    on conflict (user_id, subject_id, item_id) do update
      set due = excluded.due, state = excluded.state, card = excluded.card;
  insert into public.review_log (user_id, subject_id, item_id, rating, reviewed_at, log)
    values (uid, p_subject, p_item, p_rating, p_reviewed_at, p_log);
end;
$$;

revoke execute on function public.record_review(text, text, integer, timestamptz, timestamptz,
  integer, jsonb, jsonb) from public, anon;
grant execute on function public.record_review(text, text, integer, timestamptz, timestamptz,
  integer, jsonb, jsonb) to authenticated;
