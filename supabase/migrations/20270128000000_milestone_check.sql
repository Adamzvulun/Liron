-- Waymark: the milestone check (#517, docs/game/milestone-check.md). Applies to dev on merge and
-- to prod on release (ADR 0018).
--
-- One row per subject per check, the player's own under RLS, written only by
-- save_milestone_check(). The first check ever also gives one small wooden chest (source
-- 'milestone', one per player), so measuring can't be farmed.
alter table public.chest_sources drop constraint chest_sources_source_check;
alter table public.chest_sources add constraint chest_sources_source_check
  check (source in ('contracts', 'trial', 'streak', 'milestone'));
alter table public.chests drop constraint chests_source_check;
alter table public.chests add constraint chests_source_check
  check (source in ('contracts', 'trial', 'streak', 'milestone'));
insert into public.chest_sources (id, source, days, chest) values ('milestone', 'milestone', null, 'wooden');

create table public.milestone_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null references public.subjects (id),
  day date not null,
  -- Six can-do statements: 0 not yet, 1 with help, 2 yes.
  answers smallint[] not null
    check (cardinality(answers) = 6 and answers <@ array[0, 1, 2]::smallint[]),
  -- The probe's score in percent; null when there was no probe to take.
  probe smallint check (probe between 0 and 100),
  unique (user_id, subject_id, day)
);
alter table public.milestone_checks enable row level security;
create policy "own milestone checks: read" on public.milestone_checks for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.milestone_checks from anon, authenticated;
grant select on public.milestone_checks to authenticated;

-- Saves one subject's check for the caller's day (a second save the same day changes nothing).
create function public.save_milestone_check(p_subject text, p_answers integer[], p_probe integer)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  perform public.require_subject(p_subject);
  insert into public.milestone_checks (user_id, subject_id, day, answers, probe)
    values (uid, p_subject, public.player_today(), p_answers::smallint[], p_probe)
    on conflict do nothing;
  insert into public.chests (user_id, kind, source, source_key)
    select uid, s.chest, 'milestone', 'first' from public.chest_sources s
    where s.source = 'milestone'
    on conflict do nothing;
end;
$$;
revoke execute on function public.save_milestone_check(text, integer[], integer) from public, anon;
grant execute on function public.save_milestone_check(text, integer[], integer) to authenticated;
