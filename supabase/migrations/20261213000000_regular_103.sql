-- The regular for word chapter 102 (cars, storms and the map): chapter 103, Karim, who drives
-- toward the weather. Its trial sends trial-103, and a pass gives a brass chest through the
-- existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  values ('arabic', 'trial-103', 1)
on conflict do nothing;
