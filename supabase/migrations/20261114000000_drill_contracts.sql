-- Waymark: daily contracts for the Codebook and the callsign rush (#149, E12). Applies to dev on
-- merge and to prod on release (ADR 0018).
--
-- The two drills open later than the others (the Codebook after the first trial, the rush with
-- the first digit), and the database can't see inside the subject's state (ADR 0019). So a
-- template can name an event the player must have sent on some day before: the Codebook's
-- contracts are only offered once you've played a Codebook round, and the rush's once you've
-- run a rush. Nobody gets a contract for a drill that's still locked.

alter table public.contract_templates
  add column requires_kind text check (requires_kind ~ '^[a-z][a-z0-9-]{1,31}$');

insert into public.contract_templates (id, subject_id, metric, kind, target, gold, text, requires_kind) values
  ('morse-words', 'morse', 'event', 'words-round', 2, 15, 'Play 2 Codebook rounds', 'words-round'),
  ('morse-words-perfect', 'morse', 'event', 'words-perfect', 1, 20, 'Copy a whole Codebook round right', 'words-round'),
  ('morse-rush', 'morse', 'event', 'rush-round', 1, 15, 'Finish a callsign rush', 'rush-round'),
  ('morse-rush-fast', 'morse', 'event', 'rush-fast', 3, 20, 'Copy 3 callsigns above your speed', 'rush-round');

-- Every kind the drills send, so the history the templates require is kept. `rush-best` has no
-- contract yet but is counted for later.
insert into public.subject_event_kinds (subject_id, kind) values
  ('morse', 'words-round'),
  ('morse', 'words-perfect'),
  ('morse', 'rush-round'),
  ('morse', 'rush-best'),
  ('morse', 'rush-fast')
on conflict do nothing;

-- As before (20261109000000), but a template that requires an event is only picked once the
-- player has sent that event on an earlier day.
create or replace function public.pick_contracts(uid uuid, today date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  seed text := uid::text || ':' || today::text;
  started text[];
  per integer;
  s text;
  picks text[] := '{}';
begin
  if exists (select 1 from public.daily_contracts where user_id = uid and day = today) then
    return;
  end if;
  started := array(
    select sp.subject_id from public.subject_progress sp
    where sp.user_id = uid
      and exists (select 1 from public.contract_templates t where t.subject_id = sp.subject_id)
    order by md5(seed || sp.subject_id)
    limit 2);
  picks := picks || array(
    select t.id from public.contract_templates t
    where t.subject_id is null and (t.metric <> 'subjects' or cardinality(started) >= 2)
    order by md5(seed || t.id)
    limit 1);
  per := case when cardinality(started) = 1 then 2 else 1 end;
  foreach s in array started loop
    picks := picks || array(
      select t.id from public.contract_templates t
      where t.subject_id = s
        and (t.requires_kind is null or exists (
          select 1 from public.subject_events e
          where e.user_id = uid and e.subject_id = s and e.kind = t.requires_kind
            and e.day < today and e.count > 0))
      order by md5(seed || t.id)
      limit per);
  end loop;
  insert into public.daily_contracts (user_id, day, template_id, slot)
    select uid, today, p.id, p.n from unnest(picks) with ordinality as p(id, n)
    on conflict do nothing;
end;
$$;
revoke execute on function public.pick_contracts(uuid, date) from public, anon, authenticated;
