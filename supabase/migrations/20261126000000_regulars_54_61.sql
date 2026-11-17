-- The regulars for word chapters 53–60 (the first B1 words): chapters LIV–LXI, a winter at the
-- inn. Each trial sends trial-<n>, and a pass gives a brass chest through the existing chest rules
-- (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  select 'arabic', 'trial-' || n, 1
  from generate_series(54, 61) n
on conflict do nothing;
