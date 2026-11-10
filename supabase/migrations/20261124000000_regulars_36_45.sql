-- The regulars for word chapters 35–44 (#226): chapters XXXVI–XLV, the wedding at the inn. Each
-- trial sends trial-<n>, and a pass gives a brass chest through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  select 'arabic', 'trial-' || n, 1
  from generate_series(36, 45) n
on conflict do nothing;
