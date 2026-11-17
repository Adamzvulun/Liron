-- The regular for word chapter 109 (the land, the weather and kind words): chapter 110, Basma,
-- who reads the weather on the radio. Its trial sends trial-110, and a pass gives a brass chest
-- through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  values ('arabic', 'trial-110', 1)
on conflict do nothing;
