-- The regulars for word chapters 93–96 (the phone, the weather and how you feel; cousins,
-- names and what people ask; around town and at home; last week, never and without):
-- chapters 94–97, Hanan of the phone shop, Abu Samir's family reunion, Nadia's errands and
-- Abu Rami the tailor. Each trial sends trial-<n>, and a pass gives a brass chest through the
-- existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  select 'arabic', 'trial-' || n, 1
  from generate_series(94, 97) n
on conflict do nothing;
