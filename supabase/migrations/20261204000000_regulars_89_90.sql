-- The regulars for word chapters 88–89 (words that share their letters with a taught word but mean
-- something else): chapters 89–90, the sign painter and the chess players. Each trial sends
-- trial-<n>, and a pass gives a brass chest through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  select 'arabic', 'trial-' || n, 1
  from generate_series(89, 90) n
on conflict do nothing;
