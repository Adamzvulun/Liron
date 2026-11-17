-- Waymark: the long evenings (task 4.1, #333; ADR 0048). Applies to dev on merge and to prod on
-- release (ADR 0018).
--
-- A player who has passed a road's finale gets harder contracts for that road: master
-- contracts, worth more gold. They use `requires_kind` (20261114000000) with the finale's own
-- event, so they unlock the day after the pass. `tier` marks them, and once a road's master
-- contracts are open, that road's place on the board is always one of them, chosen by the day.
-- Everyone else's board is as before.
alter table public.contract_templates
  add column tier smallint not null default 0 check (tier between 0 and 1);

insert into public.contract_templates (id, subject_id, metric, kind, target, gold, text, requires_kind, tier) values
  ('morse-master-runs', 'morse', 'event', 'run-90', 3, 35, 'Pass 3 Koch runs at 90%', 'trial-forty-winters', 1),
  ('morse-master-recognition', 'morse', 'event', 'recognition-round', 5, 30, 'Play 5 rounds of Instant Recognition', 'trial-forty-winters', 1),
  ('morse-master-words', 'morse', 'event', 'words-perfect', 2, 35, 'Copy 2 whole Codebook rounds right', 'trial-forty-winters', 1),
  ('morse-master-rush', 'morse', 'event', 'rush-best', 1, 35, 'Beat your best in the callsign rush', 'trial-forty-winters', 1),
  ('morse-master-qso', 'morse', 'event', 'qso-clean-fast', 1, 40, 'Work a clean, fast contact in the Radio Room', 'trial-forty-winters', 1),
  ('arabic-master-words', 'arabic', 'event', 'word-90', 2, 35, 'Score 90% in 2 sessions at the innkeeper’s table', 'trial-stranger-at-the-gate', 1),
  ('arabic-master-chat', 'arabic', 'event', 'inn-chat', 2, 35, 'Sit and talk with two regulars at the inn', 'trial-stranger-at-the-gate', 1),
  ('arabic-master-shadow', 'arabic', 'event', 'shadow-sentence', 10, 30, 'Shadow 10 sentences at the echo well', 'trial-stranger-at-the-gate', 1),
  ('arabic-master-echo', 'arabic', 'event', 'pairs-round', 4, 30, 'Play 4 rounds at the echo well', 'trial-stranger-at-the-gate', 1);

-- As before (20261228000000), but a road's master contracts, once open, take that road's place.
create or replace function public.pick_contracts(uid uuid, today date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  seed text := uid::text || ':' || today::text;
  started text[];
  per integer;
  s text;
  picks text[] := '{}';
  special text;
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
    where t.subject_id is null and t.event_id is null
      and (t.metric <> 'subjects' or cardinality(started) >= 2)
    order by md5(seed || t.id)
    limit 1);
  per := case when cardinality(started) = 1 then 2 else 1 end;
  foreach s in array started loop
    picks := picks || array(
      select t.id from public.contract_templates t
      where t.subject_id = s and t.event_id is null
        and (t.requires_kind is null or exists (
          select 1 from public.subject_events e
          where e.user_id = uid and e.subject_id = s and e.kind = t.requires_kind
            and e.day < today and e.count > 0))
      order by t.tier desc, md5(seed || t.id)
      limit per);
  end loop;
  select t.id into special from public.contract_templates t
  where t.event_id = public.event_on(today) and t.subject_id = any (started)
  order by md5(seed || t.id)
  limit 1;
  if special is not null and cardinality(picks) > 0 then
    picks[cardinality(picks)] := special;
  end if;
  insert into public.daily_contracts (user_id, day, template_id, slot)
    select uid, today, p.id, p.n from unnest(picks) with ordinality as p(id, n)
    on conflict do nothing;
end;
$$;
revoke execute on function public.pick_contracts(uuid, date) from public, anon, authenticated;
