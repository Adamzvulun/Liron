-- The regulars for word chapters 93–95 (the phone, the weather and how you feel; cousins,
-- names and what people ask; around town and at home): chapters 94–96, Hanan of the phone
-- shop, Abu Samir's family reunion and Nadia's errands. Each trial sends trial-<n>, and a pass
-- gives a brass chest through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  select 'arabic', 'trial-' || n, 1
  from generate_series(94, 96) n
on conflict do nothing;
