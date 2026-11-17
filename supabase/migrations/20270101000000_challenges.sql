-- Waymark: challenges between friends (task 3.4, #329; docs/game/challenges.md, ADR 0044).
-- Applies to dev on merge and to prod on release (ADR 0018).
--
-- A score comes from a saved session, never from a number typed into a challenge: the subject
-- records a round's score against the session that saved it, and challenges read that.

---------------------------------------------------------------------------------------------
-- 1. The kinds of round, and their scores
---------------------------------------------------------------------------------------------
create table public.round_kinds (
  kind text primary key check (kind ~ '^[a-z][a-z0-9-]{1,31}$'),
  subject_id text not null references public.subjects (id),
  -- The round's own event, which save_session must have counted today.
  event text not null,
  max_score integer not null check (max_score > 0)
);
alter table public.round_kinds enable row level security;
revoke all on public.round_kinds from anon, authenticated;

insert into public.round_kinds (kind, subject_id, event, max_score) values
  -- 25 calls, each at most 50 wpm (src/subjects/morse/words/rush.ts).
  ('rush', 'morse', 'rush-round', 1250),
  -- 10 words (src/subjects/morse/words/drill.ts).
  ('words', 'morse', 'words-round', 10);

create table public.round_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  kind text not null references public.round_kinds (kind),
  score integer not null check (score >= 0),
  -- The wall clock, not the transaction's: "played after the challenge" compares the two.
  at timestamptz not null default clock_timestamp(),
  primary key (user_id, session_id),
  foreign key (user_id, session_id) references public.saved_sessions (user_id, session_id)
    on delete cascade
);
create index round_scores_best on public.round_scores (user_id, kind, score desc);
alter table public.round_scores enable row level security;
revoke all on public.round_scores from anon, authenticated;

-- Records a round's score against the session that saved it. Refused for a session that isn't
-- yours, isn't in the round's subject, is older than 15 minutes or already has a score, when
-- the round's event wasn't counted today, or for a score out of range.
create function public.record_round_score(p_session uuid, p_kind text, p_score integer)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  k public.round_kinds;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into k from public.round_kinds where kind = p_kind;
  if k.kind is null or p_score is null or p_score < 0 or p_score > k.max_score then
    raise exception 'not a score for that round' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.saved_sessions s
    where s.user_id = uid and s.session_id = p_session and s.subject_id = k.subject_id
      and s.saved_at > now() - interval '15 minutes')
  then
    raise exception 'no such round' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.subject_events e
    where e.user_id = uid and e.subject_id = k.subject_id and e.kind = k.event
      and e.day = public.player_today() and e.count > 0)
  then
    raise exception 'no such round' using errcode = '22023';
  end if;
  insert into public.round_scores (user_id, session_id, kind, score)
    values (uid, p_session, p_kind, p_score);
exception when unique_violation then
  raise exception 'that round already has a score' using errcode = '22023';
end;
$$;

---------------------------------------------------------------------------------------------
-- 2. Challenges
---------------------------------------------------------------------------------------------
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  kind text not null references public.round_kinds (kind),
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  from_score integer not null,
  to_score integer,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default now() + interval '7 days',
  answered_at timestamptz,
  declined_at timestamptz,
  check (from_id <> to_id),
  check (answered_at is null or declined_at is null)
);
create index challenges_from on public.challenges (from_id, created_at desc);
create index challenges_to on public.challenges (to_id, created_at desc);
alter table public.challenges enable row level security;
revoke all on public.challenges from anon, authenticated;

create function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.low = least(a, b) and f.high = greatest(a, b) and f.accepted_at is not null)
$$;
revoke execute on function public.are_friends(uuid, uuid) from public, anon, authenticated;

create function public.challenges_per_day() returns integer language sql immutable as $$ select 10 $$;
create function public.open_challenges_max() returns integer language sql immutable as $$ select 3 $$;

-- Sends a friend the score of one of your rounds. Returns the challenge's id.
create function public.send_challenge(p_friend uuid, p_session uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  s public.round_scores;
  made uuid;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not public.are_friends(uid, p_friend) then
    raise exception 'only a friend can be challenged' using errcode = 'P0001', hint = 'not-friends';
  end if;
  select * into s from public.round_scores where user_id = uid and session_id = p_session;
  if s.kind is null then
    raise exception 'no such round' using errcode = 'P0001', hint = 'no-round';
  end if;
  if (select count(*) from public.challenges
      where answered_at is null and declined_at is null and expires_at > now()
        and least(from_id, to_id) = least(uid, p_friend)
        and greatest(from_id, to_id) = greatest(uid, p_friend)) >= public.open_challenges_max() then
    raise exception 'too many open challenges' using errcode = 'P0001', hint = 'open';
  end if;
  if (select count(*) from public.challenges
      where from_id = uid and created_at > now() - interval '1 day') >= public.challenges_per_day() then
    raise exception 'that''s enough for today' using errcode = 'P0001', hint = 'daily-limit';
  end if;
  insert into public.challenges (kind, from_id, to_id, from_score)
    values (s.kind, uid, p_friend, s.score)
    returning id into made;
  return made;
end;
$$;

-- Answers a challenge sent to you with a round of the same kind, played after it was sent.
create function public.answer_challenge(p_challenge uuid, p_session uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  c public.challenges;
  s public.round_scores;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into c from public.challenges where id = p_challenge and to_id = uid;
  if c.id is null or c.answered_at is not null or c.declined_at is not null
     or c.expires_at <= now() or not public.are_friends(c.from_id, uid) then
    raise exception 'that challenge is closed' using errcode = 'P0001', hint = 'closed';
  end if;
  select * into s from public.round_scores
    where user_id = uid and session_id = p_session and kind = c.kind and at > c.created_at;
  if s.kind is null then
    raise exception 'no such round' using errcode = 'P0001', hint = 'no-round';
  end if;
  update public.challenges set to_score = s.score, answered_at = now() where id = c.id;
end;
$$;

-- Lets a challenge sent to you go.
create function public.decline_challenge(p_challenge uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  update public.challenges set declined_at = now()
    where id = p_challenge and to_id = uid and answered_at is null and declined_at is null
      and expires_at > now();
end;
$$;

-- Your challenges, sent and received, from the last 30 days, newest first: both names, both
-- scores, each player's best for the kind, and the state.
create function public.my_challenges() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'kind', c.kind,
      'mine', c.from_id = uid,
      'from', jsonb_build_object('id', c.from_id, 'name', public.shown_name(pf.display_name),
        'score', c.from_score,
        'best', (select max(r.score) from public.round_scores r
                 where r.user_id = c.from_id and r.kind = c.kind)),
      'to', jsonb_build_object('id', c.to_id, 'name', public.shown_name(pt.display_name),
        'score', c.to_score,
        'best', (select max(r.score) from public.round_scores r
                 where r.user_id = c.to_id and r.kind = c.kind)),
      'state', case
        when c.answered_at is not null then 'answered'
        when c.declined_at is not null then 'declined'
        when c.expires_at <= now() then 'expired'
        else 'open' end,
      'sent', to_char(c.created_at at time zone 'utc', 'YYYY-MM-DD'))
      order by c.created_at desc)
    from public.challenges c
    join public.profiles pf on pf.id = c.from_id
    join public.profiles pt on pt.id = c.to_id
    where uid in (c.from_id, c.to_id) and c.created_at > now() - interval '30 days'
      -- A removed friend reads nothing more (fellowship-build.md §4).
      and public.are_friends(c.from_id, c.to_id)), '[]'::jsonb);
end;
$$;

revoke execute on function
  public.record_round_score(uuid, text, integer), public.send_challenge(uuid, uuid),
  public.answer_challenge(uuid, uuid), public.decline_challenge(uuid), public.my_challenges(),
  public.challenges_per_day(), public.open_challenges_max()
  from public, anon;
grant execute on function
  public.record_round_score(uuid, text, integer), public.send_challenge(uuid, uuid),
  public.answer_challenge(uuid, uuid), public.decline_challenge(uuid), public.my_challenges(),
  public.challenges_per_day(), public.open_challenges_max()
  to authenticated;
