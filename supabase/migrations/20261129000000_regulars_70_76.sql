-- The regulars for word chapters 69–75 (B1 words): chapters LXX–LXXVI, a summer at the inn. Each
-- trial sends trial-<n>, and a pass gives a brass chest through the existing chest rules
-- (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  select 'arabic', 'trial-' || n, 1
  from generate_series(70, 76) n
on conflict do nothing;
